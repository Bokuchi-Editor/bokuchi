// MarkdownEditor core behavior: rendering, settings propagation, search panel,
// keyboard shortcuts, status reporting, scroll sync, focus, and reveal line.
// Paste handling lives in Editor.paste.test.tsx / Editor.imageInsert.test.tsx,
// model lifecycle in Editor.modelLifecycle.test.tsx.

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';
import type { editor } from 'monaco-editor';

// --- Mocks (vi.mock is hoisted; factory bodies live in the shared harness) ---

vi.mock('react-i18next', async () =>
  (await import('./helpers/monacoTestHarness')).reactI18nextMock());

// Mock Tauri plugins (auto-resolved from src/__mocks__)
vi.mock('@tauri-apps/api/window');
vi.mock('@tauri-apps/plugin-clipboard-manager');

vi.mock('@tauri-apps/api/webview', async () =>
  (await import('./helpers/monacoTestHarness')).tauriWebviewMock());

vi.mock('../SearchReplacePanel', async () =>
  (await import('./helpers/monacoTestHarness')).searchReplacePanelMock());

vi.mock('../MarkdownToolbar', async () =>
  (await import('./helpers/monacoTestHarness')).markdownToolbarMock());

vi.mock('../TableConversionDialog', async () =>
  (await import('./helpers/monacoTestHarness')).tableConversionDialogMock());

vi.mock('../../api/desktopApi', async () =>
  (await import('./helpers/monacoTestHarness')).desktopApiMock());

vi.mock('../../utils/tableConverter', async () =>
  (await import('./helpers/monacoTestHarness')).tableConverterMock());

vi.mock('@monaco-editor/react', async () =>
  (await import('./helpers/monacoTestHarness')).monacoEditorReactMock());

import MarkdownEditor from '../Editor';
import {
  captured,
  resetCaptured,
  setWindowMonaco,
  deleteWindowMonaco,
  createMockMonacoEditor,
} from './helpers/monacoTestHarness';

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
    resetCaptured();
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
    // (absorbs former T-ED-13c: plain Ctrl+F must not enable replace mode)
    it('T-ED-12: Ctrl+F opens search in single-tab mode', () => {
      setWindowMonaco();

      render(<MarkdownEditor {...defaultProps()} />);
      const mockEditor = createMockMonacoEditor();
      captured.onMount!(mockEditor);

      // Execute Ctrl+F handler (first addCommand call, second arg is the callback)
      const ctrlFHandler = (mockEditor.addCommand as ReturnType<typeof vi.fn>).mock.calls[0][1];
      act(() => { ctrlFHandler(); });

      expect(screen.getByTestId('search-panel')).toBeInTheDocument();
      expect(screen.getByTestId('search-panel').dataset.allTabs).toBe('false');
      expect(screen.getByTestId('search-panel').dataset.showReplace).toBe('false');

      deleteWindowMonaco();
    });

    // T-ED-13: Ctrl+Shift+F opens search in all-tabs mode
    it('T-ED-13: Ctrl+Shift+F opens search in all-tabs mode', () => {
      setWindowMonaco();

      render(<MarkdownEditor {...defaultProps()} />);
      const mockEditor = createMockMonacoEditor();
      captured.onMount!(mockEditor);

      // Execute Ctrl+Shift+F handler (third addCommand call)
      const handler = (mockEditor.addCommand as ReturnType<typeof vi.fn>).mock.calls[2][1];
      act(() => { handler(); });

      expect(screen.getByTestId('search-panel')).toBeInTheDocument();
      expect(screen.getByTestId('search-panel').dataset.allTabs).toBe('true');

      deleteWindowMonaco();
    });

    // T-ED-13b: Ctrl+H opens search in replace mode
    it('T-ED-13b: Ctrl+H opens search in replace mode', () => {
      setWindowMonaco();

      render(<MarkdownEditor {...defaultProps()} />);
      const mockEditor = createMockMonacoEditor();
      captured.onMount!(mockEditor);

      // Execute Ctrl+H handler (second addCommand call)
      const ctrlHHandler = (mockEditor.addCommand as ReturnType<typeof vi.fn>).mock.calls[1][1];
      act(() => { ctrlHHandler(); });

      expect(screen.getByTestId('search-panel')).toBeInTheDocument();
      expect(screen.getByTestId('search-panel').dataset.showReplace).toBe('true');
      expect(screen.getByTestId('search-panel').dataset.allTabs).toBe('false');

      deleteWindowMonaco();
    });
  });

  // =========================================================================
  // onStatusChange
  // =========================================================================

  describe('status change reporting', () => {
    // T-ED-14: onStatusChange fires on mount
    it('T-ED-14: calls onStatusChange with initial cursor position', () => {
      setWindowMonaco();

      const onStatusChange = vi.fn();
      render(<MarkdownEditor {...defaultProps({ onStatusChange })} />);
      const mockEditor = createMockMonacoEditor();
      captured.onMount!(mockEditor);

      expect(onStatusChange).toHaveBeenCalledWith({
        line: 1,
        column: 1,
        totalCharacters: 5, // "hello"
        selectedCharacters: 0,
        totalWords: 1, // "hello"
        selectedWords: 0,
      });

      deleteWindowMonaco();
    });
  });

  // =========================================================================
  // Scroll sync
  // =========================================================================

  describe('scroll sync', () => {
    // T-ED-17: scroll handler computes fraction correctly
    it('T-ED-17: scroll handler sends correct scrollFraction', () => {
      setWindowMonaco();

      const onScrollChange = vi.fn();
      render(<MarkdownEditor {...defaultProps({ onScrollChange })} />);

      const mockEditor = createMockMonacoEditor({
        getScrollTop: vi.fn().mockReturnValue(250) as unknown as editor.IStandaloneCodeEditor['getScrollTop'],
        getScrollHeight: vi.fn().mockReturnValue(1000) as unknown as editor.IStandaloneCodeEditor['getScrollHeight'],
        getLayoutInfo: vi.fn().mockReturnValue({ height: 500 }) as unknown as editor.IStandaloneCodeEditor['getLayoutInfo'],
      });

      captured.onMount!(mockEditor);

      // Get and call the scroll handler
      const scrollHandler = (mockEditor.onDidScrollChange as ReturnType<typeof vi.fn>).mock.calls[0][0];
      scrollHandler();

      // fraction = 250 / (1000 - 500) = 0.5
      expect(onScrollChange).toHaveBeenCalledWith(0.5);

      deleteWindowMonaco();
    });

    // T-ED-37: receiving side of preview -> editor sync. A scrollFraction prop
    // change must be applied to Monaco via setScrollTop.
    it('T-ED-37: scrollFraction prop applies the scroll position via setScrollTop', () => {
      setWindowMonaco();

      const mockEditor = createMockMonacoEditor();
      const { rerender } = render(<MarkdownEditor {...defaultProps()} />);
      captured.onMount!(mockEditor);

      rerender(<MarkdownEditor {...defaultProps()} scrollFraction={0.5} />);

      // targetScroll = 0.5 * (1000 - 500) = 250
      expect(mockEditor.setScrollTop).toHaveBeenCalledWith(250);

      deleteWindowMonaco();
    });

    // T-ED-38: the isProgrammaticScrollRef guard must swallow the scroll event
    // produced by our own setScrollTop (otherwise editor <-> preview sync
    // enters a feedback loop), and release after the next animation frame so
    // real user scrolls keep reporting.
    it('T-ED-38: programmatic scroll does not echo back through onScrollChange', async () => {
      setWindowMonaco();

      const onScrollChange = vi.fn();
      const mockEditor = createMockMonacoEditor();
      const { rerender } = render(
        <MarkdownEditor {...defaultProps({ onScrollChange })} />,
      );
      captured.onMount!(mockEditor);

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

      deleteWindowMonaco();
    });
  });

  // =========================================================================
  // Focus management
  // =========================================================================

  describe('focus management', () => {
    // T-ED-18: focusRequestId triggers editor focus
    it('T-ED-18: changing focusRequestId calls editor.focus()', async () => {
      setWindowMonaco();

      const mockEditor = createMockMonacoEditor();
      const { rerender } = render(
        <MarkdownEditor {...defaultProps()} focusRequestId={0} />,
      );
      captured.onMount!(mockEditor);

      // Change focusRequestId to trigger focus
      rerender(
        <MarkdownEditor {...defaultProps()} focusRequestId={1} />,
      );

      await waitFor(() => {
        expect(mockEditor.focus).toHaveBeenCalled();
      });

      deleteWindowMonaco();
    });
  });

  // =========================================================================
  // Reveal line (outline click)
  // =========================================================================

  describe('reveal line', () => {
    // T-ED-19: revealLineRequest triggers revealLineInCenter
    it('T-ED-19: revealLineRequest reveals and positions at specified line', async () => {
      setWindowMonaco();

      const mockEditor = createMockMonacoEditor();
      const { rerender } = render(
        <MarkdownEditor {...defaultProps()} revealLineRequest={{ lineNumber: 1, requestId: 0 }} />,
      );
      captured.onMount!(mockEditor);

      rerender(
        <MarkdownEditor {...defaultProps()} revealLineRequest={{ lineNumber: 42, requestId: 1 }} />,
      );

      await waitFor(() => {
        expect(mockEditor.revealLineInCenter).toHaveBeenCalledWith(42);
        expect(mockEditor.setPosition).toHaveBeenCalledWith({ lineNumber: 42, column: 1 });
        expect(mockEditor.focus).toHaveBeenCalled();
      });

      deleteWindowMonaco();
    });

    // T-ED-20: requestId=0 does not reveal
    it('T-ED-20: revealLineRequest with requestId=0 does nothing', () => {
      setWindowMonaco();

      const mockEditor = createMockMonacoEditor();
      render(
        <MarkdownEditor {...defaultProps()} revealLineRequest={{ lineNumber: 10, requestId: 0 }} />,
      );
      captured.onMount!(mockEditor);

      expect(mockEditor.revealLineInCenter).not.toHaveBeenCalled();

      deleteWindowMonaco();
    });
  });
});
