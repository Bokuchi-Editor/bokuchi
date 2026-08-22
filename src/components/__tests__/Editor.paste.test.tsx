// MarkdownEditor paste handling: table conversion on paste (HTML/TSV via the
// TableConversionDialog) and Shift+Cmd/Ctrl+V plain-text paste.

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
import { validateMarkdownTable, convertTsvCsvToMarkdown } from '../../utils/tableConverter';
import {
  captured,
  resetCaptured,
  setWindowMonaco,
  deleteWindowMonaco,
  createMockMonacoEditor,
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

// Dispatch a document-level paste event carrying the given clipboard payloads.
function dispatchPaste({ html = '', plain = '' }: { html?: string; plain?: string }) {
  const pasteEvent = new Event('paste', { bubbles: true, cancelable: true }) as unknown as ClipboardEvent;
  Object.defineProperty(pasteEvent, 'clipboardData', {
    value: {
      getData: (type: string) => {
        if (type === 'text/html') return html;
        if (type === 'text/plain') return plain;
        return '';
      },
    },
  });
  document.dispatchEvent(pasteEvent);
}

describe('MarkdownEditor paste handling', () => {
  beforeEach(() => {
    resetCaptured();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // Table conversion dialog integration
  // =========================================================================

  describe('table conversion', () => {
    // T-ED-21: paste with HTML table in confirm mode shows dialog
    it('T-ED-21: HTML table paste in confirm mode shows conversion dialog', async () => {
      setWindowMonaco();

      // Make the editor DOM node contain the active element
      const { mockEditor, domNode } = mountFocusedEditor();

      render(
        <MarkdownEditor {...defaultProps()} tableConversion="confirm" />,
      );
      captured.onMount!(mockEditor);

      // Dispatch a paste event with HTML table data
      dispatchPaste({
        html: '<table><tr><td>A</td><td>B</td></tr></table>',
        plain: 'A\tB',
      });

      await waitFor(() => {
        expect(screen.getByTestId('table-dialog')).toBeInTheDocument();
      });

      document.body.removeChild(domNode);
      deleteWindowMonaco();
    });

    // T-ED-22: table conversion off mode pastes plain text
    it('T-ED-22: tableConversion=off pastes as plain text', async () => {
      setWindowMonaco();

      const { mockEditor, domNode } = mountFocusedEditor();

      render(
        <MarkdownEditor {...defaultProps()} tableConversion="off" />,
      );
      captured.onMount!(mockEditor);

      dispatchPaste({
        html: '<table><tr><td>A</td></tr></table>',
        plain: 'plain text',
      });

      await waitFor(() => {
        expect(mockEditor.executeEdits).toHaveBeenCalledWith('paste', expect.arrayContaining([
          expect.objectContaining({ text: 'plain text' }),
        ]));
      });

      // Dialog should NOT appear
      expect(screen.queryByTestId('table-dialog')).not.toBeInTheDocument();

      document.body.removeChild(domNode);
      deleteWindowMonaco();
    });

    // T-ED-23: table conversion auto mode inserts markdown directly
    it('T-ED-23: tableConversion=auto inserts markdown table without dialog', async () => {
      setWindowMonaco();

      const onSnackbar = vi.fn();
      const { mockEditor, domNode } = mountFocusedEditor();

      render(
        <MarkdownEditor {...defaultProps()} tableConversion="auto" onSnackbar={onSnackbar} />,
      );
      captured.onMount!(mockEditor);

      dispatchPaste({
        html: '<table><tr><td>X</td></tr></table>',
        plain: 'X',
      });

      await waitFor(() => {
        expect(mockEditor.executeEdits).toHaveBeenCalledWith(
          'table-conversion',
          expect.anything(),
        );
        expect(onSnackbar).toHaveBeenCalledWith('tableConversion.conversionSuccess', 'success');
      });

      expect(screen.queryByTestId('table-dialog')).not.toBeInTheDocument();

      document.body.removeChild(domNode);
      deleteWindowMonaco();
    });

    // T-ED-24: confirm dialog "Convert" inserts table
    it('T-ED-24: confirming table conversion dialog inserts markdown', async () => {
      setWindowMonaco();

      const onSnackbar = vi.fn();
      const { mockEditor, domNode } = mountFocusedEditor();

      render(
        <MarkdownEditor {...defaultProps()} tableConversion="confirm" onSnackbar={onSnackbar} />,
      );
      captured.onMount!(mockEditor);

      // Trigger paste to open dialog
      dispatchPaste({
        html: '<table><tr><td>A</td></tr></table>',
        plain: 'A',
      });

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
      deleteWindowMonaco();
    });

    // T-ED-25: confirm dialog "Always" changes setting
    it('T-ED-25: confirming with "always" triggers setting change', async () => {
      setWindowMonaco();

      const onTableConversionSettingChange = vi.fn();
      const { mockEditor, domNode } = mountFocusedEditor();

      render(
        <MarkdownEditor
          {...defaultProps()}
          tableConversion="confirm"
          onTableConversionSettingChange={onTableConversionSettingChange}
        />,
      );
      captured.onMount!(mockEditor);

      dispatchPaste({
        html: '<table><tr><td>A</td></tr></table>',
        plain: 'A',
      });

      await waitFor(() => {
        expect(screen.getByTestId('table-dialog')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('table-confirm-always'));

      expect(onTableConversionSettingChange).toHaveBeenCalledWith('auto');

      document.body.removeChild(domNode);
      deleteWindowMonaco();
    });

    // T-ED-26: cancel dialog pastes plain text
    it('T-ED-26: cancelling table dialog pastes plain text instead', async () => {
      setWindowMonaco();

      const { mockEditor, domNode } = mountFocusedEditor();

      render(
        <MarkdownEditor {...defaultProps()} tableConversion="confirm" />,
      );
      captured.onMount!(mockEditor);

      dispatchPaste({
        html: '<table><tr><td>A</td></tr></table>',
        plain: 'fallback text',
      });

      await waitFor(() => {
        expect(screen.getByTestId('table-dialog')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('table-cancel'));

      expect(mockEditor.executeEdits).toHaveBeenCalledWith('paste', expect.arrayContaining([
        expect.objectContaining({ text: 'fallback text' }),
      ]));

      document.body.removeChild(domNode);
      deleteWindowMonaco();
    });

    // T-ED-27: invalid table falls back to plain text
    it('T-ED-27: invalid markdown table falls back to plain text paste', async () => {
      setWindowMonaco();

      // Make validation fail
      (validateMarkdownTable as ReturnType<typeof vi.fn>).mockReturnValueOnce(false);

      const { mockEditor, domNode } = mountFocusedEditor();

      render(
        <MarkdownEditor {...defaultProps()} tableConversion="confirm" />,
      );
      captured.onMount!(mockEditor);

      dispatchPaste({
        html: '<table><tr><td>bad</td></tr></table>',
        plain: 'plain fallback',
      });

      await waitFor(() => {
        expect(mockEditor.executeEdits).toHaveBeenCalledWith('paste', expect.arrayContaining([
          expect.objectContaining({ text: 'plain fallback' }),
        ]));
      });

      // Dialog should NOT appear for invalid tables
      expect(screen.queryByTestId('table-dialog')).not.toBeInTheDocument();

      document.body.removeChild(domNode);
      deleteWindowMonaco();
    });

    // T-ED-28: TSV paste triggers conversion
    it('T-ED-28: TSV paste triggers table conversion', async () => {
      setWindowMonaco();

      const { mockEditor, domNode } = mountFocusedEditor();

      render(
        <MarkdownEditor {...defaultProps()} tableConversion="confirm" />,
      );
      captured.onMount!(mockEditor);

      // No HTML on the clipboard, only TSV text
      dispatchPaste({ plain: "A\tB\n1\t2" });

      await waitFor(() => {
        expect(convertTsvCsvToMarkdown).toHaveBeenCalledWith("A\tB\n1\t2");
        expect(screen.getByTestId('table-dialog')).toBeInTheDocument();
      });

      document.body.removeChild(domNode);
      deleteWindowMonaco();
    });

    // T-ED-29: Regression test - paste handler updates when tableConversion prop changes (Issue #225)
    it('T-ED-29: paste handler reflects updated tableConversion setting', async () => {
      setWindowMonaco();

      const { mockEditor, domNode } = mountFocusedEditor();

      const onSnackbar = vi.fn();

      // Start with 'confirm' mode
      const { rerender } = render(
        <MarkdownEditor {...defaultProps()} tableConversion="confirm" onSnackbar={onSnackbar} />,
      );
      captured.onMount!(mockEditor);

      // Switch to 'auto' mode (simulating settings load completing)
      rerender(
        <MarkdownEditor {...defaultProps()} tableConversion="auto" onSnackbar={onSnackbar} />,
      );

      // Paste HTML table data
      dispatchPaste({
        html: '<table><tr><td>A</td></tr></table>',
        plain: 'A',
      });

      // In 'auto' mode, table should be inserted directly (no dialog)
      await waitFor(() => {
        expect(mockEditor.executeEdits).toHaveBeenCalled();
        // Dialog should NOT appear in auto mode
        expect(screen.queryByTestId('table-dialog')).not.toBeInTheDocument();
      });

      document.body.removeChild(domNode);
      deleteWindowMonaco();
    });
  });

  // =========================================================================
  // Shift + Cmd/Ctrl + V plain-text paste — cross-platform regression
  // (Windows reports e.key='V' uppercase when Shift held; we must rely on e.code)
  // =========================================================================

  describe('Shift+Cmd/Ctrl+V plain-text paste (cross-platform regression)', () => {
    // T-ED-PP-01: Windows case — Ctrl+Shift+V with e.key='V' (uppercase) still triggers paste
    it('T-ED-PP-01: Ctrl+Shift+V with uppercase e.key (Windows) pastes plain text', async () => {
      setWindowMonaco();

      const { readText } = await import('@tauri-apps/plugin-clipboard-manager');
      (readText as ReturnType<typeof vi.fn>).mockResolvedValueOnce('windows clipboard text');

      const mockEditor = createMockMonacoEditor();
      render(<MarkdownEditor {...defaultProps()} tableConversion="confirm" />);
      captured.onMount!(mockEditor);

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

      deleteWindowMonaco();
    });

    // T-ED-PP-02: Mac case — Cmd+Shift+V with e.key='v' (lowercase) still works
    it('T-ED-PP-02: Cmd+Shift+V with lowercase e.key (Mac) pastes plain text', async () => {
      setWindowMonaco();

      const { readText } = await import('@tauri-apps/plugin-clipboard-manager');
      (readText as ReturnType<typeof vi.fn>).mockResolvedValueOnce('mac clipboard text');

      const mockEditor = createMockMonacoEditor();
      render(<MarkdownEditor {...defaultProps()} tableConversion="confirm" />);
      captured.onMount!(mockEditor);

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

      deleteWindowMonaco();
    });
  });
});
