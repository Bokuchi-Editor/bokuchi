import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';
import type { editor } from 'monaco-editor';

// --- Mocks ---

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock Tauri plugins (auto-resolved from src/__mocks__)
vi.mock('@tauri-apps/api/window');
vi.mock('@tauri-apps/plugin-clipboard-manager');

// The editor registers a drag-drop listener for image insertion on mount.
vi.mock('@tauri-apps/api/webview', () => ({
  getCurrentWebview: () => ({
    onDragDropEvent: vi.fn().mockResolvedValue(() => {}),
  }),
}));

// Mock SearchReplacePanel – we test its integration, not its internals
vi.mock('../SearchReplacePanel', () => ({
  default: (props: {
    open: boolean;
    searchAllTabsDefault?: boolean;
    showReplaceDefault?: boolean;
    onClose: () => void;
  }) =>
    props.open ? (
      <div
        data-testid="search-panel"
        data-all-tabs={String(!!props.searchAllTabsDefault)}
        data-show-replace={String(!!props.showReplaceDefault)}
      >
        <button data-testid="close-search" onClick={props.onClose}>
          Close
        </button>
      </div>
    ) : null,
}));

vi.mock('../MarkdownToolbar', () => ({
  default: () => <div data-testid="markdown-toolbar" />,
}));

vi.mock('../TableConversionDialog', () => ({
  TableConversionDialog: (props: {
    open: boolean;
    onConfirm: (convertWithoutAsking?: boolean) => void;
    onCancel: () => void;
    markdownTable: string;
  }) =>
    props.open ? (
      <div data-testid="table-dialog">
        <pre data-testid="table-preview">{props.markdownTable}</pre>
        <button
          data-testid="table-confirm"
          onClick={() => props.onConfirm(false)}
        >
          Convert
        </button>
        <button
          data-testid="table-confirm-always"
          onClick={() => props.onConfirm(true)}
        >
          Always
        </button>
        <button data-testid="table-cancel" onClick={props.onCancel}>
          Cancel
        </button>
      </div>
    ) : null,
}));

// Mock desktopApi – image bytes are persisted through the Rust backend.
vi.mock('../../api/desktopApi', () => ({
  desktopApi: {
    saveImageBytes: vi.fn().mockResolvedValue('images/image-saved.png'),
    copyImageAsset: vi.fn().mockResolvedValue('images/image-copied.png'),
  },
}));

// Mock tableConverter utilities
vi.mock('../../utils/tableConverter', () => ({
  htmlTableToMarkdown: vi.fn().mockReturnValue('| A | B |\n| --- | --- |\n| 1 | 2 |'),
  validateMarkdownTable: vi.fn().mockReturnValue(true),
  convertTsvCsvToMarkdown: vi.fn().mockReturnValue('| A | B |\n| --- | --- |\n| 1 | 2 |'),
}));

// --- Monaco Editor mock ---
// We capture the onMount callback so we can exercise editor logic.

let capturedOnMount: ((editor: editor.IStandaloneCodeEditor) => void) | null =
  null;

let capturedPath: string | undefined = undefined;
let capturedKeepCurrentModel: boolean | undefined = undefined;

vi.mock('@monaco-editor/react', () => ({
  default: (props: {
    onMount?: (editor: editor.IStandaloneCodeEditor) => void;
    onChange?: (value: string | undefined) => void;
    value?: string;
    defaultValue?: string;
    path?: string;
    options?: Record<string, unknown>;
    theme?: string;
    keepCurrentModel?: boolean;
  }) => {
    // Store onMount so tests can invoke it
    capturedOnMount = props.onMount ?? null;
    capturedPath = props.path;
    capturedKeepCurrentModel = props.keepCurrentModel;
    // The real component uses defaultValue (uncontrolled) — accept either.
    return (
      <div data-testid="monaco-editor" data-theme={props.theme} data-path={props.path}>
        <textarea
          data-testid="monaco-textarea"
          defaultValue={props.value ?? props.defaultValue}
          onChange={(e) => props.onChange?.(e.target.value)}
        />
      </div>
    );
  },
}));

import MarkdownEditor from '../Editor';
import { validateMarkdownTable, convertTsvCsvToMarkdown } from '../../utils/tableConverter';
import { desktopApi } from '../../api/desktopApi';

// Helper: create a mock Monaco editor instance
function createMockMonacoEditor(overrides: Partial<editor.IStandaloneCodeEditor> = {}) {
  const mockEditor = {
    focus: vi.fn(),
    getDomNode: vi.fn().mockReturnValue(document.createElement('div')),
    getPosition: vi.fn().mockReturnValue({ lineNumber: 1, column: 1 }),
    getSelection: vi.fn().mockReturnValue({
      startLineNumber: 1,
      startColumn: 1,
      endLineNumber: 1,
      endColumn: 1,
    }),
    getModel: vi.fn().mockReturnValue({
      getValue: vi.fn().mockReturnValue('hello'),
      getValueInRange: vi.fn().mockReturnValue(''),
      getLinesContent: vi.fn().mockReturnValue(['hello']),
      getLineContent: vi.fn().mockReturnValue('hello'),
      getLineMaxColumn: vi.fn().mockReturnValue(6),
      onDidChangeContent: vi.fn().mockReturnValue({ dispose: vi.fn() }),
    }),
    executeEdits: vi.fn(),
    setPosition: vi.fn(),
    revealLineInCenter: vi.fn(),
    addCommand: vi.fn(),
    addAction: vi.fn(),
    createContextKey: vi.fn().mockReturnValue({ set: vi.fn(), get: vi.fn(), reset: vi.fn() }),
    onDidCompositionStart: vi.fn().mockReturnValue({ dispose: vi.fn() }),
    onDidCompositionEnd: vi.fn().mockReturnValue({ dispose: vi.fn() }),
    onDidChangeCursorPosition: vi.fn().mockReturnValue({ dispose: vi.fn() }),
    onDidChangeCursorSelection: vi.fn().mockReturnValue({ dispose: vi.fn() }),
    onDidChangeModel: vi.fn().mockReturnValue({ dispose: vi.fn() }),
    onDidChangeModelContent: vi.fn().mockReturnValue({ dispose: vi.fn() }),
    onDidScrollChange: vi.fn().mockReturnValue({ dispose: vi.fn() }),
    getScrollTop: vi.fn().mockReturnValue(0),
    getScrollHeight: vi.fn().mockReturnValue(1000),
    getLayoutInfo: vi.fn().mockReturnValue({ height: 500 }),
    setScrollTop: vi.fn(),
    ...overrides,
  } as unknown as editor.IStandaloneCodeEditor;
  return mockEditor;
}

// Default props factory
function defaultProps(overrides: Partial<React.ComponentProps<typeof MarkdownEditor>> = {}) {
  return {
    content: '# Hello',
    onChange: vi.fn(),
    darkMode: false,
    ...overrides,
  };
}

describe('MarkdownEditor', () => {
  beforeEach(() => {
    capturedOnMount = null;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // Rendering & basic structure
  // =========================================================================

  describe('rendering', () => {
    // T-ED-01: renders editor area with toolbar
    it('T-ED-01: renders editor with toolbar and search button', () => {
      render(<MarkdownEditor {...defaultProps()} />);
      expect(screen.getByTestId('markdown-toolbar')).toBeInTheDocument();
      expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
      expect(screen.getByText('Editor')).toBeInTheDocument();
    });

    // T-ED-02: fileNotFound shows error instead of editor
    it('T-ED-02: shows file-not-found message when fileNotFound is set', () => {
      const onClose = vi.fn();
      render(
        <MarkdownEditor
          {...defaultProps()}
          fileNotFound={{ filePath: '/path/to/missing.md', onClose }}
        />,
      );
      expect(screen.getByText('fileOperations.fileNotFound')).toBeInTheDocument();
      expect(screen.getByText('/path/to/missing.md')).toBeInTheDocument();
      expect(screen.queryByTestId('monaco-editor')).not.toBeInTheDocument();
    });

    // T-ED-03: fileNotFound close button calls onClose
    it('T-ED-03: fileNotFound close button triggers callback', () => {
      const onClose = vi.fn();
      render(
        <MarkdownEditor
          {...defaultProps()}
          fileNotFound={{ filePath: '/missing.md', onClose }}
        />,
      );
      fireEvent.click(screen.getByText('fileOperations.closeTab'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // Editor settings → Monaco options
  // =========================================================================

  describe('settings propagation', () => {
    // T-ED-05: light mode without darcula
    it('T-ED-05: light mode uses light theme', () => {
      render(<MarkdownEditor {...defaultProps()} darkMode={false} />);
      expect(screen.getByTestId('monaco-editor').dataset.theme).toBe('light');
    });

    // T-ED-06: dark mode uses vs-dark
    it('T-ED-06: dark mode uses vs-dark theme', () => {
      render(<MarkdownEditor {...defaultProps()} darkMode={true} />);
      expect(screen.getByTestId('monaco-editor').dataset.theme).toBe('vs-dark');
    });

    // T-ED-07: onChange is forwarded from Monaco
    it('T-ED-07: editor change fires onChange', () => {
      const onChange = vi.fn();
      render(<MarkdownEditor {...defaultProps({ onChange })} />);
      fireEvent.change(screen.getByTestId('monaco-textarea'), {
        target: { value: 'new content' },
      });
      expect(onChange).toHaveBeenCalledWith('new content');
    });
  });

  // =========================================================================
  // Search panel integration
  // =========================================================================

  describe('search panel', () => {
    // T-ED-08: search panel closed by default
    it('T-ED-08: search panel is hidden by default', () => {
      render(<MarkdownEditor {...defaultProps()} />);
      expect(screen.queryByTestId('search-panel')).not.toBeInTheDocument();
    });

    // T-ED-09: search button opens panel
    it('T-ED-09: clicking search button opens search panel', () => {
      render(<MarkdownEditor {...defaultProps()} />);
      // The search icon button (the one with Search icon)
      const searchButton = screen.getByRole('button', { name: /search/i });
      fireEvent.click(searchButton);
      expect(screen.getByTestId('search-panel')).toBeInTheDocument();
      // Single-tab mode (not all tabs)
      expect(screen.getByTestId('search-panel').dataset.allTabs).toBe('false');
    });

    // T-ED-10: closing search panel hides it
    it('T-ED-10: closing search panel removes it from DOM', () => {
      render(<MarkdownEditor {...defaultProps()} />);
      fireEvent.click(screen.getByRole('button', { name: /search/i }));
      expect(screen.getByTestId('search-panel')).toBeInTheDocument();
      fireEvent.click(screen.getByTestId('close-search'));
      expect(screen.queryByTestId('search-panel')).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // Keyboard shortcuts (via onMount)
  // =========================================================================

  describe('keyboard shortcuts on mount', () => {
    // T-ED-12: Ctrl+F handler opens search in single-tab mode
    it('T-ED-12: Ctrl+F opens search in single-tab mode', () => {
      const KeyMod = { CtrlCmd: 2048, Shift: 1024 };
      const KeyCode = { KeyF: 36, KeyH: 38, KeyV: 52 };
      (window as unknown as Record<string, unknown>).monaco = { KeyMod, KeyCode };

      render(<MarkdownEditor {...defaultProps()} />);
      const mockEditor = createMockMonacoEditor();
      capturedOnMount!(mockEditor);

      // Execute Ctrl+F handler (first addCommand call, second arg is the callback)
      const ctrlFHandler = (mockEditor.addCommand as ReturnType<typeof vi.fn>).mock.calls[0][1];
      act(() => { ctrlFHandler(); });

      expect(screen.getByTestId('search-panel')).toBeInTheDocument();
      expect(screen.getByTestId('search-panel').dataset.allTabs).toBe('false');

      delete (window as unknown as Record<string, unknown>).monaco;
    });

    // T-ED-13: Ctrl+Shift+F opens search in all-tabs mode
    it('T-ED-13: Ctrl+Shift+F opens search in all-tabs mode', () => {
      const KeyMod = { CtrlCmd: 2048, Shift: 1024 };
      const KeyCode = { KeyF: 36, KeyH: 38, KeyV: 52 };
      (window as unknown as Record<string, unknown>).monaco = { KeyMod, KeyCode };

      render(<MarkdownEditor {...defaultProps()} />);
      const mockEditor = createMockMonacoEditor();
      capturedOnMount!(mockEditor);

      // Execute Ctrl+Shift+F handler (third addCommand call)
      const handler = (mockEditor.addCommand as ReturnType<typeof vi.fn>).mock.calls[2][1];
      act(() => { handler(); });

      expect(screen.getByTestId('search-panel')).toBeInTheDocument();
      expect(screen.getByTestId('search-panel').dataset.allTabs).toBe('true');

      delete (window as unknown as Record<string, unknown>).monaco;
    });

    // T-ED-13b: Ctrl+H opens search in replace mode
    it('T-ED-13b: Ctrl+H opens search in replace mode', () => {
      const KeyMod = { CtrlCmd: 2048, Shift: 1024 };
      const KeyCode = { KeyF: 36, KeyH: 38, KeyV: 52 };
      (window as unknown as Record<string, unknown>).monaco = { KeyMod, KeyCode };

      render(<MarkdownEditor {...defaultProps()} />);
      const mockEditor = createMockMonacoEditor();
      capturedOnMount!(mockEditor);

      // Execute Ctrl+H handler (second addCommand call)
      const ctrlHHandler = (mockEditor.addCommand as ReturnType<typeof vi.fn>).mock.calls[1][1];
      act(() => { ctrlHHandler(); });

      expect(screen.getByTestId('search-panel')).toBeInTheDocument();
      expect(screen.getByTestId('search-panel').dataset.showReplace).toBe('true');
      expect(screen.getByTestId('search-panel').dataset.allTabs).toBe('false');

      delete (window as unknown as Record<string, unknown>).monaco;
    });

    // T-ED-13c: Ctrl+F opens search without replace mode
    it('T-ED-13c: Ctrl+F opens search without replace mode', () => {
      const KeyMod = { CtrlCmd: 2048, Shift: 1024 };
      const KeyCode = { KeyF: 36, KeyH: 38, KeyV: 52 };
      (window as unknown as Record<string, unknown>).monaco = { KeyMod, KeyCode };

      render(<MarkdownEditor {...defaultProps()} />);
      const mockEditor = createMockMonacoEditor();
      capturedOnMount!(mockEditor);

      // Execute Ctrl+F handler (first addCommand call)
      const ctrlFHandler = (mockEditor.addCommand as ReturnType<typeof vi.fn>).mock.calls[0][1];
      act(() => { ctrlFHandler(); });

      expect(screen.getByTestId('search-panel')).toBeInTheDocument();
      expect(screen.getByTestId('search-panel').dataset.showReplace).toBe('false');

      delete (window as unknown as Record<string, unknown>).monaco;
    });
  });

  // =========================================================================
  // onStatusChange
  // =========================================================================

  describe('status change reporting', () => {
    // T-ED-14: onStatusChange fires on mount
    it('T-ED-14: calls onStatusChange with initial cursor position', () => {
      (window as unknown as Record<string, unknown>).monaco = {
        KeyMod: { CtrlCmd: 2048, Shift: 1024 },
        KeyCode: { KeyF: 36, KeyH: 38, KeyV: 52 },
      };

      const onStatusChange = vi.fn();
      render(<MarkdownEditor {...defaultProps({ onStatusChange })} />);
      const mockEditor = createMockMonacoEditor();
      capturedOnMount!(mockEditor);

      expect(onStatusChange).toHaveBeenCalledWith({
        line: 1,
        column: 1,
        totalCharacters: 5, // "hello"
        selectedCharacters: 0,
        totalWords: 1, // "hello"
        selectedWords: 0,
      });

      delete (window as unknown as Record<string, unknown>).monaco;
    });
  });

  // =========================================================================
  // Scroll sync
  // =========================================================================

  describe('scroll sync', () => {
    // T-ED-17: scroll handler computes fraction correctly
    it('T-ED-17: scroll handler sends correct scrollFraction', () => {
      (window as unknown as Record<string, unknown>).monaco = {
        KeyMod: { CtrlCmd: 2048, Shift: 1024 },
        KeyCode: { KeyF: 36, KeyH: 38, KeyV: 52 },
      };

      const onScrollChange = vi.fn();
      render(<MarkdownEditor {...defaultProps({ onScrollChange })} />);

      const mockEditor = createMockMonacoEditor({
        getScrollTop: vi.fn().mockReturnValue(250) as unknown as editor.IStandaloneCodeEditor['getScrollTop'],
        getScrollHeight: vi.fn().mockReturnValue(1000) as unknown as editor.IStandaloneCodeEditor['getScrollHeight'],
        getLayoutInfo: vi.fn().mockReturnValue({ height: 500 }) as unknown as editor.IStandaloneCodeEditor['getLayoutInfo'],
      });

      capturedOnMount!(mockEditor);

      // Get and call the scroll handler
      const scrollHandler = (mockEditor.onDidScrollChange as ReturnType<typeof vi.fn>).mock.calls[0][0];
      scrollHandler();

      // fraction = 250 / (1000 - 500) = 0.5
      expect(onScrollChange).toHaveBeenCalledWith(0.5);

      delete (window as unknown as Record<string, unknown>).monaco;
    });

    // T-ED-37: receiving side of preview -> editor sync. A scrollFraction prop
    // change must be applied to Monaco via setScrollTop.
    it('T-ED-37: scrollFraction prop applies the scroll position via setScrollTop', () => {
      (window as unknown as Record<string, unknown>).monaco = {
        KeyMod: { CtrlCmd: 2048, Shift: 1024 },
        KeyCode: { KeyF: 36, KeyH: 38, KeyV: 52 },
      };

      const mockEditor = createMockMonacoEditor();
      const { rerender } = render(<MarkdownEditor {...defaultProps()} />);
      capturedOnMount!(mockEditor);

      rerender(<MarkdownEditor {...defaultProps()} scrollFraction={0.5} />);

      // targetScroll = 0.5 * (1000 - 500) = 250
      expect(mockEditor.setScrollTop).toHaveBeenCalledWith(250);

      delete (window as unknown as Record<string, unknown>).monaco;
    });

    // T-ED-38: the isProgrammaticScrollRef guard must swallow the scroll event
    // produced by our own setScrollTop (otherwise editor <-> preview sync
    // enters a feedback loop), and release after the next animation frame so
    // real user scrolls keep reporting.
    it('T-ED-38: programmatic scroll does not echo back through onScrollChange', async () => {
      (window as unknown as Record<string, unknown>).monaco = {
        KeyMod: { CtrlCmd: 2048, Shift: 1024 },
        KeyCode: { KeyF: 36, KeyH: 38, KeyV: 52 },
      };

      const onScrollChange = vi.fn();
      const mockEditor = createMockMonacoEditor();
      const { rerender } = render(
        <MarkdownEditor {...defaultProps({ onScrollChange })} />,
      );
      capturedOnMount!(mockEditor);

      rerender(
        <MarkdownEditor {...defaultProps({ onScrollChange })} scrollFraction={0.5} />,
      );
      expect(mockEditor.setScrollTop).toHaveBeenCalledWith(250);

      // Monaco now reports the scroll caused by setScrollTop. The guard is
      // still up, so it must NOT be echoed to the parent.
      (mockEditor.getScrollTop as ReturnType<typeof vi.fn>).mockReturnValue(250);
      const scrollHandler = (mockEditor.onDidScrollChange as ReturnType<typeof vi.fn>).mock.calls[0][0];
      scrollHandler();
      expect(onScrollChange).not.toHaveBeenCalled();

      // After the next animation frame the guard is released; a user scroll
      // reports normally again.
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      scrollHandler();
      expect(onScrollChange).toHaveBeenCalledWith(0.5);

      delete (window as unknown as Record<string, unknown>).monaco;
    });
  });

  // =========================================================================
  // Focus management
  // =========================================================================

  describe('focus management', () => {
    // T-ED-18: focusRequestId triggers editor focus
    it('T-ED-18: changing focusRequestId calls editor.focus()', async () => {
      (window as unknown as Record<string, unknown>).monaco = {
        KeyMod: { CtrlCmd: 2048, Shift: 1024 },
        KeyCode: { KeyF: 36, KeyH: 38, KeyV: 52 },
      };

      const mockEditor = createMockMonacoEditor();
      const { rerender } = render(
        <MarkdownEditor {...defaultProps()} focusRequestId={0} />,
      );
      capturedOnMount!(mockEditor);

      // Change focusRequestId to trigger focus
      rerender(
        <MarkdownEditor {...defaultProps()} focusRequestId={1} />,
      );

      await waitFor(() => {
        expect(mockEditor.focus).toHaveBeenCalled();
      });

      delete (window as unknown as Record<string, unknown>).monaco;
    });
  });

  // =========================================================================
  // Reveal line (outline click)
  // =========================================================================

  describe('reveal line', () => {
    // T-ED-19: revealLineRequest triggers revealLineInCenter
    it('T-ED-19: revealLineRequest reveals and positions at specified line', async () => {
      (window as unknown as Record<string, unknown>).monaco = {
        KeyMod: { CtrlCmd: 2048, Shift: 1024 },
        KeyCode: { KeyF: 36, KeyH: 38, KeyV: 52 },
      };

      const mockEditor = createMockMonacoEditor();
      const { rerender } = render(
        <MarkdownEditor {...defaultProps()} revealLineRequest={{ lineNumber: 1, requestId: 0 }} />,
      );
      capturedOnMount!(mockEditor);

      rerender(
        <MarkdownEditor {...defaultProps()} revealLineRequest={{ lineNumber: 42, requestId: 1 }} />,
      );

      await waitFor(() => {
        expect(mockEditor.revealLineInCenter).toHaveBeenCalledWith(42);
        expect(mockEditor.setPosition).toHaveBeenCalledWith({ lineNumber: 42, column: 1 });
        expect(mockEditor.focus).toHaveBeenCalled();
      });

      delete (window as unknown as Record<string, unknown>).monaco;
    });

    // T-ED-20: requestId=0 does not reveal
    it('T-ED-20: revealLineRequest with requestId=0 does nothing', () => {
      (window as unknown as Record<string, unknown>).monaco = {
        KeyMod: { CtrlCmd: 2048, Shift: 1024 },
        KeyCode: { KeyF: 36, KeyH: 38, KeyV: 52 },
      };

      const mockEditor = createMockMonacoEditor();
      render(
        <MarkdownEditor {...defaultProps()} revealLineRequest={{ lineNumber: 10, requestId: 0 }} />,
      );
      capturedOnMount!(mockEditor);

      expect(mockEditor.revealLineInCenter).not.toHaveBeenCalled();

      delete (window as unknown as Record<string, unknown>).monaco;
    });
  });

  // =========================================================================
  // Table conversion dialog integration
  // =========================================================================

  describe('table conversion', () => {
    // T-ED-21: paste with HTML table in confirm mode shows dialog
    it('T-ED-21: HTML table paste in confirm mode shows conversion dialog', async () => {
      (window as unknown as Record<string, unknown>).monaco = {
        KeyMod: { CtrlCmd: 2048, Shift: 1024 },
        KeyCode: { KeyF: 36, KeyH: 38, KeyV: 52 },
      };

      const mockEditor = createMockMonacoEditor();
      // Make the editor DOM node contain the active element
      const domNode = document.createElement('div');
      const textarea = document.createElement('textarea');
      domNode.appendChild(textarea);
      document.body.appendChild(domNode);
      textarea.focus();
      (mockEditor.getDomNode as ReturnType<typeof vi.fn>).mockReturnValue(domNode);

      render(
        <MarkdownEditor {...defaultProps()} tableConversion="confirm" />,
      );
      capturedOnMount!(mockEditor);

      // Dispatch a paste event with HTML table data
      const pasteEvent = new Event('paste', { bubbles: true, cancelable: true }) as unknown as ClipboardEvent;
      Object.defineProperty(pasteEvent, 'clipboardData', {
        value: {
          getData: (type: string) => {
            if (type === 'text/html') return '<table><tr><td>A</td><td>B</td></tr></table>';
            if (type === 'text/plain') return 'A\tB';
            return '';
          },
        },
      });

      document.dispatchEvent(pasteEvent);

      await waitFor(() => {
        expect(screen.getByTestId('table-dialog')).toBeInTheDocument();
      });

      document.body.removeChild(domNode);
      delete (window as unknown as Record<string, unknown>).monaco;
    });

    // T-ED-22: table conversion off mode pastes plain text
    it('T-ED-22: tableConversion=off pastes as plain text', async () => {
      (window as unknown as Record<string, unknown>).monaco = {
        KeyMod: { CtrlCmd: 2048, Shift: 1024 },
        KeyCode: { KeyF: 36, KeyH: 38, KeyV: 52 },
      };

      const mockEditor = createMockMonacoEditor();
      const domNode = document.createElement('div');
      const textarea = document.createElement('textarea');
      domNode.appendChild(textarea);
      document.body.appendChild(domNode);
      textarea.focus();
      (mockEditor.getDomNode as ReturnType<typeof vi.fn>).mockReturnValue(domNode);

      render(
        <MarkdownEditor {...defaultProps()} tableConversion="off" />,
      );
      capturedOnMount!(mockEditor);

      const pasteEvent = new Event('paste', { bubbles: true, cancelable: true }) as unknown as ClipboardEvent;
      Object.defineProperty(pasteEvent, 'clipboardData', {
        value: {
          getData: (type: string) => {
            if (type === 'text/html') return '<table><tr><td>A</td></tr></table>';
            if (type === 'text/plain') return 'plain text';
            return '';
          },
        },
      });

      document.dispatchEvent(pasteEvent);

      await waitFor(() => {
        expect(mockEditor.executeEdits).toHaveBeenCalledWith('paste', expect.arrayContaining([
          expect.objectContaining({ text: 'plain text' }),
        ]));
      });

      // Dialog should NOT appear
      expect(screen.queryByTestId('table-dialog')).not.toBeInTheDocument();

      document.body.removeChild(domNode);
      delete (window as unknown as Record<string, unknown>).monaco;
    });

    // T-ED-23: table conversion auto mode inserts markdown directly
    it('T-ED-23: tableConversion=auto inserts markdown table without dialog', async () => {
      (window as unknown as Record<string, unknown>).monaco = {
        KeyMod: { CtrlCmd: 2048, Shift: 1024 },
        KeyCode: { KeyF: 36, KeyH: 38, KeyV: 52 },
      };

      const onSnackbar = vi.fn();
      const mockEditor = createMockMonacoEditor();
      const domNode = document.createElement('div');
      const textarea = document.createElement('textarea');
      domNode.appendChild(textarea);
      document.body.appendChild(domNode);
      textarea.focus();
      (mockEditor.getDomNode as ReturnType<typeof vi.fn>).mockReturnValue(domNode);

      render(
        <MarkdownEditor {...defaultProps()} tableConversion="auto" onSnackbar={onSnackbar} />,
      );
      capturedOnMount!(mockEditor);

      const pasteEvent = new Event('paste', { bubbles: true, cancelable: true }) as unknown as ClipboardEvent;
      Object.defineProperty(pasteEvent, 'clipboardData', {
        value: {
          getData: (type: string) => {
            if (type === 'text/html') return '<table><tr><td>X</td></tr></table>';
            if (type === 'text/plain') return 'X';
            return '';
          },
        },
      });

      document.dispatchEvent(pasteEvent);

      await waitFor(() => {
        expect(mockEditor.executeEdits).toHaveBeenCalledWith(
          'table-conversion',
          expect.anything(),
        );
        expect(onSnackbar).toHaveBeenCalledWith('tableConversion.conversionSuccess', 'success');
      });

      expect(screen.queryByTestId('table-dialog')).not.toBeInTheDocument();

      document.body.removeChild(domNode);
      delete (window as unknown as Record<string, unknown>).monaco;
    });

    // T-ED-24: confirm dialog "Convert" inserts table
    it('T-ED-24: confirming table conversion dialog inserts markdown', async () => {
      (window as unknown as Record<string, unknown>).monaco = {
        KeyMod: { CtrlCmd: 2048, Shift: 1024 },
        KeyCode: { KeyF: 36, KeyH: 38, KeyV: 52 },
      };

      const onSnackbar = vi.fn();
      const mockEditor = createMockMonacoEditor();
      const domNode = document.createElement('div');
      const textarea = document.createElement('textarea');
      domNode.appendChild(textarea);
      document.body.appendChild(domNode);
      textarea.focus();
      (mockEditor.getDomNode as ReturnType<typeof vi.fn>).mockReturnValue(domNode);

      render(
        <MarkdownEditor {...defaultProps()} tableConversion="confirm" onSnackbar={onSnackbar} />,
      );
      capturedOnMount!(mockEditor);

      // Trigger paste to open dialog
      const pasteEvent = new Event('paste', { bubbles: true, cancelable: true }) as unknown as ClipboardEvent;
      Object.defineProperty(pasteEvent, 'clipboardData', {
        value: {
          getData: (type: string) => {
            if (type === 'text/html') return '<table><tr><td>A</td></tr></table>';
            if (type === 'text/plain') return 'A';
            return '';
          },
        },
      });
      document.dispatchEvent(pasteEvent);

      await waitFor(() => {
        expect(screen.getByTestId('table-dialog')).toBeInTheDocument();
      });

      // Click "Convert"
      fireEvent.click(screen.getByTestId('table-confirm'));

      expect(mockEditor.executeEdits).toHaveBeenCalledWith(
        'table-conversion',
        expect.anything(),
      );
      expect(onSnackbar).toHaveBeenCalledWith('tableConversion.conversionSuccess', 'success');

      document.body.removeChild(domNode);
      delete (window as unknown as Record<string, unknown>).monaco;
    });

    // T-ED-25: confirm dialog "Always" changes setting
    it('T-ED-25: confirming with "always" triggers setting change', async () => {
      (window as unknown as Record<string, unknown>).monaco = {
        KeyMod: { CtrlCmd: 2048, Shift: 1024 },
        KeyCode: { KeyF: 36, KeyH: 38, KeyV: 52 },
      };

      const onTableConversionSettingChange = vi.fn();
      const mockEditor = createMockMonacoEditor();
      const domNode = document.createElement('div');
      const textarea = document.createElement('textarea');
      domNode.appendChild(textarea);
      document.body.appendChild(domNode);
      textarea.focus();
      (mockEditor.getDomNode as ReturnType<typeof vi.fn>).mockReturnValue(domNode);

      render(
        <MarkdownEditor
          {...defaultProps()}
          tableConversion="confirm"
          onTableConversionSettingChange={onTableConversionSettingChange}
        />,
      );
      capturedOnMount!(mockEditor);

      const pasteEvent = new Event('paste', { bubbles: true, cancelable: true }) as unknown as ClipboardEvent;
      Object.defineProperty(pasteEvent, 'clipboardData', {
        value: {
          getData: (type: string) => {
            if (type === 'text/html') return '<table><tr><td>A</td></tr></table>';
            if (type === 'text/plain') return 'A';
            return '';
          },
        },
      });
      document.dispatchEvent(pasteEvent);

      await waitFor(() => {
        expect(screen.getByTestId('table-dialog')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('table-confirm-always'));

      expect(onTableConversionSettingChange).toHaveBeenCalledWith('auto');

      document.body.removeChild(domNode);
      delete (window as unknown as Record<string, unknown>).monaco;
    });

    // T-ED-26: cancel dialog pastes plain text
    it('T-ED-26: cancelling table dialog pastes plain text instead', async () => {
      (window as unknown as Record<string, unknown>).monaco = {
        KeyMod: { CtrlCmd: 2048, Shift: 1024 },
        KeyCode: { KeyF: 36, KeyH: 38, KeyV: 52 },
      };

      const mockEditor = createMockMonacoEditor();
      const domNode = document.createElement('div');
      const textarea = document.createElement('textarea');
      domNode.appendChild(textarea);
      document.body.appendChild(domNode);
      textarea.focus();
      (mockEditor.getDomNode as ReturnType<typeof vi.fn>).mockReturnValue(domNode);

      render(
        <MarkdownEditor {...defaultProps()} tableConversion="confirm" />,
      );
      capturedOnMount!(mockEditor);

      const pasteEvent = new Event('paste', { bubbles: true, cancelable: true }) as unknown as ClipboardEvent;
      Object.defineProperty(pasteEvent, 'clipboardData', {
        value: {
          getData: (type: string) => {
            if (type === 'text/html') return '<table><tr><td>A</td></tr></table>';
            if (type === 'text/plain') return 'fallback text';
            return '';
          },
        },
      });
      document.dispatchEvent(pasteEvent);

      await waitFor(() => {
        expect(screen.getByTestId('table-dialog')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('table-cancel'));

      expect(mockEditor.executeEdits).toHaveBeenCalledWith('paste', expect.arrayContaining([
        expect.objectContaining({ text: 'fallback text' }),
      ]));
    });

    // T-ED-27: invalid table falls back to plain text
    it('T-ED-27: invalid markdown table falls back to plain text paste', async () => {
      (window as unknown as Record<string, unknown>).monaco = {
        KeyMod: { CtrlCmd: 2048, Shift: 1024 },
        KeyCode: { KeyF: 36, KeyH: 38, KeyV: 52 },
      };

      // Make validation fail
      (validateMarkdownTable as ReturnType<typeof vi.fn>).mockReturnValueOnce(false);

      const mockEditor = createMockMonacoEditor();
      const domNode = document.createElement('div');
      const textarea = document.createElement('textarea');
      domNode.appendChild(textarea);
      document.body.appendChild(domNode);
      textarea.focus();
      (mockEditor.getDomNode as ReturnType<typeof vi.fn>).mockReturnValue(domNode);

      render(
        <MarkdownEditor {...defaultProps()} tableConversion="confirm" />,
      );
      capturedOnMount!(mockEditor);

      const pasteEvent = new Event('paste', { bubbles: true, cancelable: true }) as unknown as ClipboardEvent;
      Object.defineProperty(pasteEvent, 'clipboardData', {
        value: {
          getData: (type: string) => {
            if (type === 'text/html') return '<table><tr><td>bad</td></tr></table>';
            if (type === 'text/plain') return 'plain fallback';
            return '';
          },
        },
      });
      document.dispatchEvent(pasteEvent);

      await waitFor(() => {
        expect(mockEditor.executeEdits).toHaveBeenCalledWith('paste', expect.arrayContaining([
          expect.objectContaining({ text: 'plain fallback' }),
        ]));
      });

      // Dialog should NOT appear for invalid tables
      expect(screen.queryByTestId('table-dialog')).not.toBeInTheDocument();

      document.body.removeChild(domNode);
      delete (window as unknown as Record<string, unknown>).monaco;
    });

    // T-ED-28: TSV paste triggers conversion
    it('T-ED-28: TSV paste triggers table conversion', async () => {
      (window as unknown as Record<string, unknown>).monaco = {
        KeyMod: { CtrlCmd: 2048, Shift: 1024 },
        KeyCode: { KeyF: 36, KeyH: 38, KeyV: 52 },
      };

      const mockEditor = createMockMonacoEditor();
      const domNode = document.createElement('div');
      const textarea = document.createElement('textarea');
      domNode.appendChild(textarea);
      document.body.appendChild(domNode);
      textarea.focus();
      (mockEditor.getDomNode as ReturnType<typeof vi.fn>).mockReturnValue(domNode);

      render(
        <MarkdownEditor {...defaultProps()} tableConversion="confirm" />,
      );
      capturedOnMount!(mockEditor);

      const pasteEvent = new Event('paste', { bubbles: true, cancelable: true }) as unknown as ClipboardEvent;
      Object.defineProperty(pasteEvent, 'clipboardData', {
        value: {
          getData: (type: string) => {
            if (type === 'text/html') return ''; // No HTML
            if (type === 'text/plain') return "A\tB\n1\t2";
            return '';
          },
        },
      });
      document.dispatchEvent(pasteEvent);

      await waitFor(() => {
        expect(convertTsvCsvToMarkdown).toHaveBeenCalledWith("A\tB\n1\t2");
        expect(screen.getByTestId('table-dialog')).toBeInTheDocument();
      });

      document.body.removeChild(domNode);
      delete (window as unknown as Record<string, unknown>).monaco;
    });

    // T-ED-29: Regression test - paste handler updates when tableConversion prop changes (Issue #225)
    it('T-ED-29: paste handler reflects updated tableConversion setting', async () => {
      (window as unknown as Record<string, unknown>).monaco = {
        KeyMod: { CtrlCmd: 2048, Shift: 1024 },
        KeyCode: { KeyF: 36, KeyH: 38 },
      };

      const mockEditor = createMockMonacoEditor();
      const domNode = document.createElement('div');
      const textarea = document.createElement('textarea');
      domNode.appendChild(textarea);
      document.body.appendChild(domNode);
      textarea.focus();
      (mockEditor.getDomNode as ReturnType<typeof vi.fn>).mockReturnValue(domNode);

      const onSnackbar = vi.fn();

      // Start with 'confirm' mode
      const { rerender } = render(
        <MarkdownEditor {...defaultProps()} tableConversion="confirm" onSnackbar={onSnackbar} />,
      );
      capturedOnMount!(mockEditor);

      // Switch to 'auto' mode (simulating settings load completing)
      rerender(
        <MarkdownEditor {...defaultProps()} tableConversion="auto" onSnackbar={onSnackbar} />,
      );

      // Paste HTML table data
      const pasteEvent = new Event('paste', { bubbles: true, cancelable: true }) as unknown as ClipboardEvent;
      Object.defineProperty(pasteEvent, 'clipboardData', {
        value: {
          getData: (type: string) => {
            if (type === 'text/html') return '<table><tr><td>A</td></tr></table>';
            if (type === 'text/plain') return 'A';
            return '';
          },
        },
      });
      document.dispatchEvent(pasteEvent);

      // In 'auto' mode, table should be inserted directly (no dialog)
      await waitFor(() => {
        expect(mockEditor.executeEdits).toHaveBeenCalled();
        // Dialog should NOT appear in auto mode
        expect(screen.queryByTestId('table-dialog')).not.toBeInTheDocument();
      });

      document.body.removeChild(domNode);
      delete (window as unknown as Record<string, unknown>).monaco;
    });
  });

  // =========================================================================
  // Undo/redo isolation per tab (regression for undo-across-tabs bug)
  // =========================================================================

  describe('undo/redo isolation per tab', () => {
    // T-ED-30: path prop is set to activeTabId for per-tab undo history
    it('T-ED-30: passes activeTabId as path prop to Monaco Editor', () => {
      render(
        <MarkdownEditor {...defaultProps()} activeTabId="tab-123" />,
      );
      const editorEl = screen.getByTestId('monaco-editor');
      expect(editorEl.dataset.path).toBe('tab-123');
      expect(capturedPath).toBe('tab-123');
    });

    // T-ED-31: path defaults to 'default' when activeTabId is null
    it('T-ED-31: uses "default" as path when activeTabId is null', () => {
      render(
        <MarkdownEditor {...defaultProps()} activeTabId={null} />,
      );
      const editorEl = screen.getByTestId('monaco-editor');
      expect(editorEl.dataset.path).toBe('default');
    });

    // T-ED-32: path changes when switching tabs
    it('T-ED-32: path prop updates when activeTabId changes', () => {
      const { rerender } = render(
        <MarkdownEditor {...defaultProps()} activeTabId="tab-A" />,
      );
      expect(capturedPath).toBe('tab-A');

      rerender(
        <MarkdownEditor {...defaultProps()} activeTabId="tab-B" />,
      );
      expect(capturedPath).toBe('tab-B');
    });

    // T-ED-33: closed tab model is disposed via getModels() iteration
    it('T-ED-33: disposes Monaco model when a tab is removed from tabs list', () => {
      const mockDispose = vi.fn();
      const mockModels = [
        { uri: { toString: () => 'tab-1' }, dispose: vi.fn() },
        { uri: { toString: () => 'tab-2' }, dispose: mockDispose },
      ];
      (window as unknown as Record<string, unknown>).monaco = {
        KeyMod: { CtrlCmd: 2048, Shift: 1024 },
        KeyCode: { KeyF: 36, KeyH: 38, KeyV: 52 },
        editor: { getModels: () => mockModels },
      };

      const tab1 = { id: 'tab-1', title: 'File 1', content: 'a', isModified: false, isNew: false };
      const tab2 = { id: 'tab-2', title: 'File 2', content: 'b', isModified: false, isNew: false };

      const { rerender } = render(
        <MarkdownEditor {...defaultProps()} tabs={[tab1, tab2]} activeTabId="tab-1" />,
      );

      // Remove tab-2
      rerender(
        <MarkdownEditor {...defaultProps()} tabs={[tab1]} activeTabId="tab-1" />,
      );

      expect(mockDispose).toHaveBeenCalledTimes(1);
      // tab-1 model should NOT be disposed
      expect(mockModels[0].dispose).not.toHaveBeenCalled();

      delete (window as unknown as Record<string, unknown>).monaco;
    });

    // T-ED-34: no model disposed when no tabs are removed
    it('T-ED-34: does not dispose any model when tabs remain unchanged', () => {
      const mockModel = { uri: { toString: () => 'tab-1' }, dispose: vi.fn() };
      (window as unknown as Record<string, unknown>).monaco = {
        KeyMod: { CtrlCmd: 2048, Shift: 1024 },
        KeyCode: { KeyF: 36, KeyH: 38, KeyV: 52 },
        editor: { getModels: () => [mockModel] },
      };

      const tab1 = { id: 'tab-1', title: 'File 1', content: 'a', isModified: false, isNew: false };

      const { rerender } = render(
        <MarkdownEditor {...defaultProps()} tabs={[tab1]} activeTabId="tab-1" />,
      );

      // Rerender with same tabs
      rerender(
        <MarkdownEditor {...defaultProps()} tabs={[tab1]} activeTabId="tab-1" />,
      );

      expect(mockModel.dispose).not.toHaveBeenCalled();

      delete (window as unknown as Record<string, unknown>).monaco;
    });

    // T-ED-35: URI with path prefix (e.g. "file:///tab-1") also matches
    it('T-ED-35: disposes model whose URI ends with /tabId', () => {
      const mockDispose = vi.fn();
      const mockModels = [
        { uri: { toString: () => 'file:///tab-2' }, dispose: mockDispose },
      ];
      (window as unknown as Record<string, unknown>).monaco = {
        KeyMod: { CtrlCmd: 2048, Shift: 1024 },
        KeyCode: { KeyF: 36, KeyH: 38, KeyV: 52 },
        editor: { getModels: () => mockModels },
      };

      const tab1 = { id: 'tab-1', title: 'File 1', content: 'a', isModified: false, isNew: false };
      const tab2 = { id: 'tab-2', title: 'File 2', content: 'b', isModified: false, isNew: false };

      const { rerender } = render(
        <MarkdownEditor {...defaultProps()} tabs={[tab1, tab2]} activeTabId="tab-1" />,
      );

      rerender(
        <MarkdownEditor {...defaultProps()} tabs={[tab1]} activeTabId="tab-1" />,
      );

      expect(mockDispose).toHaveBeenCalledTimes(1);

      delete (window as unknown as Record<string, unknown>).monaco;
    });

    // T-ED-36: on unmount, only orphaned models are disposed (live tabs survive)
    it('T-ED-36: unmount disposes orphaned models but keeps live tab models', () => {
      const disposedTab = vi.fn();
      const liveTab = vi.fn();
      const mockModels = [
        { uri: { toString: () => 'tab-alive' }, dispose: liveTab },
        { uri: { toString: () => 'tab-dead' }, dispose: disposedTab },
      ];
      (window as unknown as Record<string, unknown>).monaco = {
        KeyMod: { CtrlCmd: 2048, Shift: 1024 },
        KeyCode: { KeyF: 36, KeyH: 38, KeyV: 52 },
        editor: { getModels: () => mockModels },
      };

      const tabAlive = { id: 'tab-alive', title: 'Alive', content: 'a', isModified: false, isNew: false };
      const tabDead = { id: 'tab-dead', title: 'Dead', content: 'b', isModified: false, isNew: false };

      // Mount with both tabs to populate prevTabIdsRef
      const { rerender, unmount } = render(
        <MarkdownEditor {...defaultProps()} tabs={[tabAlive, tabDead]} activeTabId="tab-alive" />,
      );

      // Remove tab-dead, then unmount (simulates view-mode switch after closing a tab)
      rerender(
        <MarkdownEditor {...defaultProps()} tabs={[tabAlive]} activeTabId="tab-alive" />,
      );
      // tab-dead disposed by the tabs-change effect
      disposedTab.mockClear();

      unmount();

      // tab-alive model should survive (live tab)
      expect(liveTab).not.toHaveBeenCalled();
      // tab-dead is no longer tracked after previous cleanup, so no double-dispose
      expect(disposedTab).not.toHaveBeenCalled();

      delete (window as unknown as Record<string, unknown>).monaco;
    });
  });

  // =========================================================================
  // keepCurrentModel prop
  // =========================================================================

  describe('keepCurrentModel prop (CLAUDE.md critical rule)', () => {
    beforeEach(() => {
      capturedKeepCurrentModel = undefined;
    });

    // T-ED-KCM-01: Monaco Editor receives keepCurrentModel={true}
    it('T-ED-KCM-01: passes keepCurrentModel={true} to Monaco Editor', () => {
      render(<MarkdownEditor {...defaultProps()} />);
      expect(capturedKeepCurrentModel).toBe(true);
    });
  });

  // =========================================================================
  // Image paste insertion (clipboard bitmap -> images/ + Markdown link)
  // =========================================================================

  describe('image paste insertion', () => {
    // Minimal stand-in for a clipboard image File: the paste handler only
    // reads `type` and `arrayBuffer()`.
    function createClipboardImageFile() {
      return {
        type: 'image/png',
        arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
      };
    }

    function dispatchImagePaste() {
      const pasteEvent = new Event('paste', { bubbles: true, cancelable: true }) as unknown as ClipboardEvent;
      Object.defineProperty(pasteEvent, 'clipboardData', {
        value: {
          files: [createClipboardImageFile()],
          getData: () => '',
        },
      });
      document.dispatchEvent(pasteEvent);
    }

    // Focus setup shared with the table-conversion tests: the global paste
    // listener only acts when the active element is inside the editor DOM.
    function mountFocusedEditor() {
      const mockEditor = createMockMonacoEditor();
      const domNode = document.createElement('div');
      const textarea = document.createElement('textarea');
      domNode.appendChild(textarea);
      document.body.appendChild(domNode);
      textarea.focus();
      (mockEditor.getDomNode as ReturnType<typeof vi.fn>).mockReturnValue(domNode);
      return { mockEditor, domNode };
    }

    // T-ED-IMG-01: unsaved tab (no filePath) -> warn and do not insert
    it('T-ED-IMG-01: image paste on an unsaved tab warns and inserts nothing', async () => {
      (window as unknown as Record<string, unknown>).monaco = {
        KeyMod: { CtrlCmd: 2048, Shift: 1024 },
        KeyCode: { KeyF: 36, KeyH: 38, KeyV: 52 },
      };

      const onSnackbar = vi.fn();
      const { mockEditor, domNode } = mountFocusedEditor();

      render(<MarkdownEditor {...defaultProps()} onSnackbar={onSnackbar} />);
      capturedOnMount!(mockEditor);

      dispatchImagePaste();

      await waitFor(() => {
        expect(onSnackbar).toHaveBeenCalledWith('imageInsert.saveFirst', 'warning');
      });
      expect(desktopApi.saveImageBytes).not.toHaveBeenCalled();
      expect(mockEditor.executeEdits).not.toHaveBeenCalled();

      document.body.removeChild(domNode);
      delete (window as unknown as Record<string, unknown>).monaco;
    });

    // T-ED-IMG-02: saved tab -> bytes written via desktopApi and link inserted
    it('T-ED-IMG-02: image paste on a saved tab saves bytes and inserts a Markdown link', async () => {
      (window as unknown as Record<string, unknown>).monaco = {
        KeyMod: { CtrlCmd: 2048, Shift: 1024 },
        KeyCode: { KeyF: 36, KeyH: 38, KeyV: 52 },
      };

      const onSnackbar = vi.fn();
      const { mockEditor, domNode } = mountFocusedEditor();

      render(
        <MarkdownEditor {...defaultProps()} filePath="/docs/note.md" onSnackbar={onSnackbar} />,
      );
      capturedOnMount!(mockEditor);

      dispatchImagePaste();

      await waitFor(() => {
        expect(desktopApi.saveImageBytes).toHaveBeenCalledWith(
          '/docs',
          'images',
          expect.stringMatching(/^image-\d{8}-\d{6}\.png$/),
          expect.any(Uint8Array),
        );
      });

      await waitFor(() => {
        expect(mockEditor.executeEdits).toHaveBeenCalledWith(
          'image-insert',
          expect.arrayContaining([
            expect.objectContaining({ text: '![](images/image-saved.png)' }),
          ]),
        );
      });
      expect(onSnackbar).toHaveBeenCalledWith('imageInsert.inserted', 'success');

      document.body.removeChild(domNode);
      delete (window as unknown as Record<string, unknown>).monaco;
    });
  });

  // =========================================================================
  // Shift + Cmd/Ctrl + V plain-text paste — cross-platform regression
  // (Windows reports e.key='V' uppercase when Shift held; we must rely on e.code)
  // =========================================================================

  describe('Shift+Cmd/Ctrl+V plain-text paste (cross-platform regression)', () => {
    // T-ED-PP-01: Windows case — Ctrl+Shift+V with e.key='V' (uppercase) still triggers paste
    it('T-ED-PP-01: Ctrl+Shift+V with uppercase e.key (Windows) pastes plain text', async () => {
      (window as unknown as Record<string, unknown>).monaco = {
        KeyMod: { CtrlCmd: 2048, Shift: 1024 },
        KeyCode: { KeyF: 36, KeyH: 38, KeyV: 52 },
      };

      const { readText } = await import('@tauri-apps/plugin-clipboard-manager');
      (readText as ReturnType<typeof vi.fn>).mockResolvedValueOnce('windows clipboard text');

      const mockEditor = createMockMonacoEditor();
      render(<MarkdownEditor {...defaultProps()} tableConversion="confirm" />);
      capturedOnMount!(mockEditor);

      const keyEvent = new KeyboardEvent('keydown', {
        key: 'V',
        code: 'KeyV',
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(keyEvent);

      await waitFor(() => {
        expect(mockEditor.executeEdits).toHaveBeenCalledWith('paste', expect.arrayContaining([
          expect.objectContaining({ text: 'windows clipboard text' }),
        ]));
      });

      delete (window as unknown as Record<string, unknown>).monaco;
    });

    // T-ED-PP-02: Mac case — Cmd+Shift+V with e.key='v' (lowercase) still works
    it('T-ED-PP-02: Cmd+Shift+V with lowercase e.key (Mac) pastes plain text', async () => {
      (window as unknown as Record<string, unknown>).monaco = {
        KeyMod: { CtrlCmd: 2048, Shift: 1024 },
        KeyCode: { KeyF: 36, KeyH: 38, KeyV: 52 },
      };

      const { readText } = await import('@tauri-apps/plugin-clipboard-manager');
      (readText as ReturnType<typeof vi.fn>).mockResolvedValueOnce('mac clipboard text');

      const mockEditor = createMockMonacoEditor();
      render(<MarkdownEditor {...defaultProps()} tableConversion="confirm" />);
      capturedOnMount!(mockEditor);

      const keyEvent = new KeyboardEvent('keydown', {
        key: 'v',
        code: 'KeyV',
        metaKey: true,
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(keyEvent);

      await waitFor(() => {
        expect(mockEditor.executeEdits).toHaveBeenCalledWith('paste', expect.arrayContaining([
          expect.objectContaining({ text: 'mac clipboard text' }),
        ]));
      });

      delete (window as unknown as Record<string, unknown>).monaco;
    });
  });
});
