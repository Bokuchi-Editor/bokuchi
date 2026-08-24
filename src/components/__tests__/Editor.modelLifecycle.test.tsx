// MarkdownEditor Monaco model lifecycle: per-tab undo/redo isolation via the
// `path` prop, model disposal when tabs close, and the keepCurrentModel prop.

import { render, screen } from '@testing-library/react';
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
import {
  captured,
  resetCaptured,
  setWindowMonaco,
  deleteWindowMonaco,
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

describe('MarkdownEditor model lifecycle', () => {
  beforeEach(() => {
    resetCaptured();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
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
      expect(captured.path).toBe('tab-123');
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
      expect(captured.path).toBe('tab-A');

      rerender(
        <MarkdownEditor {...defaultProps()} activeTabId="tab-B" />,
      );
      expect(captured.path).toBe('tab-B');
    });

    // T-ED-33: closed tab model is disposed via getModels() iteration
    it('T-ED-33: disposes Monaco model when a tab is removed from tabs list', () => {
      const mockDispose = vi.fn();
      const mockModels = [
        { uri: { toString: () => 'tab-1' }, dispose: vi.fn() },
        { uri: { toString: () => 'tab-2' }, dispose: mockDispose },
      ];
      setWindowMonaco({ editor: { getModels: () => mockModels } });

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

      deleteWindowMonaco();
    });

    // T-ED-34: no model disposed when no tabs are removed
    it('T-ED-34: does not dispose any model when tabs remain unchanged', () => {
      const mockModel = { uri: { toString: () => 'tab-1' }, dispose: vi.fn() };
      setWindowMonaco({ editor: { getModels: () => [mockModel] } });

      const tab1 = { id: 'tab-1', title: 'File 1', content: 'a', isModified: false, isNew: false };

      const { rerender } = render(
        <MarkdownEditor {...defaultProps()} tabs={[tab1]} activeTabId="tab-1" />,
      );

      // Rerender with same tabs
      rerender(
        <MarkdownEditor {...defaultProps()} tabs={[tab1]} activeTabId="tab-1" />,
      );

      expect(mockModel.dispose).not.toHaveBeenCalled();

      deleteWindowMonaco();
    });

    // T-ED-35: URI with path prefix (e.g. "file:///tab-1") also matches
    it('T-ED-35: disposes model whose URI ends with /tabId', () => {
      const mockDispose = vi.fn();
      const mockModels = [
        { uri: { toString: () => 'file:///tab-2' }, dispose: mockDispose },
      ];
      setWindowMonaco({ editor: { getModels: () => mockModels } });

      const tab1 = { id: 'tab-1', title: 'File 1', content: 'a', isModified: false, isNew: false };
      const tab2 = { id: 'tab-2', title: 'File 2', content: 'b', isModified: false, isNew: false };

      const { rerender } = render(
        <MarkdownEditor {...defaultProps()} tabs={[tab1, tab2]} activeTabId="tab-1" />,
      );

      rerender(
        <MarkdownEditor {...defaultProps()} tabs={[tab1]} activeTabId="tab-1" />,
      );

      expect(mockDispose).toHaveBeenCalledTimes(1);

      deleteWindowMonaco();
    });

    // T-ED-36: on unmount, only orphaned models are disposed (live tabs survive)
    it('T-ED-36: unmount disposes orphaned models but keeps live tab models', () => {
      const disposedTab = vi.fn();
      const liveTab = vi.fn();
      const mockModels = [
        { uri: { toString: () => 'tab-alive' }, dispose: liveTab },
        { uri: { toString: () => 'tab-dead' }, dispose: disposedTab },
      ];
      setWindowMonaco({ editor: { getModels: () => mockModels } });

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

      deleteWindowMonaco();
    });
  });

  // =========================================================================
  // keepCurrentModel prop
  // =========================================================================

  describe('keepCurrentModel prop (CLAUDE.md critical rule)', () => {
    // T-ED-KCM-01: Monaco Editor receives keepCurrentModel={true}
    it('T-ED-KCM-01: passes keepCurrentModel={true} to Monaco Editor', () => {
      render(<MarkdownEditor {...defaultProps()} />);
      expect(captured.keepCurrentModel).toBe(true);
    });
  });
});
