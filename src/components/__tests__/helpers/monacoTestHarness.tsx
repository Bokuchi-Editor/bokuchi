// Shared test harness for MarkdownEditor (src/components/Editor.tsx) tests.
// Provides the window.monaco fixture setup/teardown, a mock Monaco editor
// instance factory, focused-editor mounting, and the mock-module factories
// consumed from vi.mock() callbacks.
//
// NOTE: vi.mock() calls are hoisted to the top of each test file, so the
// vi.mock() declarations themselves must live in every Editor*.test.tsx.
// Only the factory bodies are shared here; load them inside the async
// factory callback, e.g.:
//   vi.mock('@monaco-editor/react', async () =>
//     (await import('./helpers/monacoTestHarness')).monacoEditorReactMock());

import { vi } from 'vitest';
import type { editor } from 'monaco-editor';

// ---------------------------------------------------------------------------
// Props captured from the mocked @monaco-editor/react component
// ---------------------------------------------------------------------------

export const captured: {
  onMount: ((editorInstance: editor.IStandaloneCodeEditor) => void) | null;
  path: string | undefined;
  keepCurrentModel: boolean | undefined;
} = {
  onMount: null,
  path: undefined,
  keepCurrentModel: undefined,
};

export function resetCaptured() {
  captured.onMount = null;
  captured.path = undefined;
  captured.keepCurrentModel = undefined;
}

// ---------------------------------------------------------------------------
// window.monaco fixture (KeyMod/KeyCode consumed by the editor's onMount)
// ---------------------------------------------------------------------------

export function setWindowMonaco(extra: Record<string, unknown> = {}) {
  (window as unknown as Record<string, unknown>).monaco = {
    KeyMod: { CtrlCmd: 2048, Shift: 1024 },
    KeyCode: { KeyF: 36, KeyH: 38, KeyV: 52 },
    ...extra,
  };
}

export function deleteWindowMonaco() {
  delete (window as unknown as Record<string, unknown>).monaco;
}

// ---------------------------------------------------------------------------
// Mock Monaco editor instance
// ---------------------------------------------------------------------------

export function createMockMonacoEditor(overrides: Partial<editor.IStandaloneCodeEditor> = {}) {
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

// Focus setup shared by the paste/image tests: the global paste listener only
// acts when the active element is inside the editor DOM. The caller must
// `document.body.removeChild(domNode)` at the end of the test.
export function mountFocusedEditor() {
  const mockEditor = createMockMonacoEditor();
  const domNode = document.createElement('div');
  const textarea = document.createElement('textarea');
  domNode.appendChild(textarea);
  document.body.appendChild(domNode);
  textarea.focus();
  (mockEditor.getDomNode as ReturnType<typeof vi.fn>).mockReturnValue(domNode);
  return { mockEditor, domNode };
}

// ---------------------------------------------------------------------------
// vi.mock() factory bodies
// ---------------------------------------------------------------------------

export function reactI18nextMock() {
  return {
    useTranslation: () => ({
      t: (key: string) => key,
    }),
  };
}

// The editor registers a drag-drop listener for image insertion on mount.
export function tauriWebviewMock() {
  return {
    getCurrentWebview: () => ({
      onDragDropEvent: vi.fn().mockResolvedValue(() => {}),
    }),
  };
}

// Mock SearchReplacePanel – we test its integration, not its internals
export function searchReplacePanelMock() {
  return {
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
  };
}

export function markdownToolbarMock() {
  return {
    default: () => <div data-testid="markdown-toolbar" />,
  };
}

export function tableConversionDialogMock() {
  return {
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
  };
}

// Mock desktopApi – image bytes are persisted through the Rust backend.
export function desktopApiMock() {
  return {
    desktopApi: {
      saveImageBytes: vi.fn().mockResolvedValue('images/image-saved.png'),
      copyImageAsset: vi.fn().mockResolvedValue('images/image-copied.png'),
    },
  };
}

// Mock tableConverter utilities
export function tableConverterMock() {
  return {
    htmlTableToMarkdown: vi.fn().mockReturnValue('| A | B |\n| --- | --- |\n| 1 | 2 |'),
    validateMarkdownTable: vi.fn().mockReturnValue(true),
    convertTsvCsvToMarkdown: vi.fn().mockReturnValue('| A | B |\n| --- | --- |\n| 1 | 2 |'),
  };
}

// Monaco Editor mock — captures onMount/path/keepCurrentModel into `captured`
// so tests can exercise editor logic. The real component uses defaultValue
// (uncontrolled) — accept either.
export function monacoEditorReactMock() {
  return {
    default: (props: {
      onMount?: (editorInstance: editor.IStandaloneCodeEditor) => void;
      onChange?: (value: string | undefined) => void;
      value?: string;
      defaultValue?: string;
      path?: string;
      options?: Record<string, unknown>;
      theme?: string;
      keepCurrentModel?: boolean;
    }) => {
      captured.onMount = props.onMount ?? null;
      captured.path = props.path;
      captured.keepCurrentModel = props.keepCurrentModel;
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
  };
}
