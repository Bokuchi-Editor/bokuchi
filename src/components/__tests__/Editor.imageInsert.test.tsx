// MarkdownEditor image paste insertion: clipboard bitmap -> images/ directory
// via desktopApi + Markdown link insertion.

import { render, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';

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
import { desktopApi } from '../../api/desktopApi';
import {
  captured,
  resetCaptured,
  setWindowMonaco,
  deleteWindowMonaco,
  mountFocusedEditor,
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

describe('MarkdownEditor image paste insertion', () => {
  beforeEach(() => {
    resetCaptured();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

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

  // T-ED-IMG-01: unsaved tab (no filePath) -> warn and do not insert
  it('T-ED-IMG-01: image paste on an unsaved tab warns and inserts nothing', async () => {
    setWindowMonaco();

    const onSnackbar = vi.fn();
    const { mockEditor, domNode } = mountFocusedEditor();

    render(<MarkdownEditor {...defaultProps()} onSnackbar={onSnackbar} />);
    captured.onMount!(mockEditor);

    dispatchImagePaste();

    await waitFor(() => {
      expect(onSnackbar).toHaveBeenCalledWith('imageInsert.saveFirst', 'warning');
    });
    expect(desktopApi.saveImageBytes).not.toHaveBeenCalled();
    expect(mockEditor.executeEdits).not.toHaveBeenCalled();

    document.body.removeChild(domNode);
    deleteWindowMonaco();
  });

  // T-ED-IMG-02: saved tab -> bytes written via desktopApi and link inserted
  it('T-ED-IMG-02: image paste on a saved tab saves bytes and inserts a Markdown link', async () => {
    setWindowMonaco();

    const onSnackbar = vi.fn();
    const { mockEditor, domNode } = mountFocusedEditor();

    render(
      <MarkdownEditor {...defaultProps()} filePath="/docs/note.md" onSnackbar={onSnackbar} />,
    );
    captured.onMount!(mockEditor);

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
    deleteWindowMonaco();
  });
});
