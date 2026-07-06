import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock Tauri APIs that useTabsDesktop pulls in transitively.
vi.mock('@tauri-apps/api/core');
vi.mock('@tauri-apps/plugin-fs');

vi.mock('../../api/desktopApi', () => ({
  desktopApi: {
    readFileFromPath: vi.fn(),
    writeFileToPath: vi.fn(),
    readFileByPath: vi.fn().mockResolvedValue({ content: '', filePath: undefined, error: undefined }),
    openFile: vi.fn(),
    saveFile: vi.fn(),
    saveFileAs: vi.fn(),
    saveFileToPath: vi.fn().mockResolvedValue({ success: true }),
    getFileHash: vi.fn().mockResolvedValue({ hash: 'h', modified_time: 1, file_size: 1 }),
    renameFile: vi.fn(),
  },
}));

vi.mock('../../api/storeApi', () => ({
  storeApi: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    loadState: vi.fn().mockResolvedValue(null),
    saveState: vi.fn().mockResolvedValue(undefined),
    createInitialState: vi.fn().mockReturnValue({ tabs: [], activeTabId: null }),
    addRecentFile: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../utils/fileChangeDetection', () => ({
  detectFileChange: vi.fn().mockResolvedValue(false),
}));

// editorSync is the contract we want to assert against. Spy on syncModelForTab.
const syncModelForTabMock = vi.fn();
vi.mock('../../utils/editorSync', () => ({
  syncModelForTab: (...args: unknown[]) => syncModelForTabMock(...args),
  setModelContentSilently: vi.fn(),
  isModelSilentlyEditing: vi.fn().mockReturnValue(false),
  findModelForTab: vi.fn().mockReturnValue(null),
}));

import { useTabsDesktop } from '../useTabsDesktop';
import { desktopApi } from '../../api/desktopApi';
import { storeApi } from '../../api/storeApi';
import { detectFileChange } from '../../utils/fileChangeDetection';
import type { Tab } from '../../types/tab';

/**
 * These tests pin down the contract that any tab-state mutation that originates
 * OUTSIDE the Monaco editor (e.g. a preview checkbox toggle, a search/replace,
 * a future "format document" command) must push the new content into the
 * Monaco model via syncModelForTab. The Editor is intentionally uncontrolled
 * (Monaco model is source of truth), so without this sync the editor view
 * silently goes out of step with React state — which has caused at least three
 * checkbox-toggle regressions historically.
 *
 * If you need to remove the syncModelForTab call from updateTabContent or
 * reloadTabContent: stop, read src/utils/editorSync.ts and the comments on
 * src/components/Editor.tsx around the <Editor defaultValue={content}> usage,
 * and add an alternative model-sync mechanism BEFORE deleting these tests.
 */
describe('useTabsDesktop – Monaco model sync contract', () => {
  beforeEach(() => {
    syncModelForTabMock.mockClear();
  });

  // T-UTD-01: updateTabContent must sync the Monaco model with the new content.
  // This is the assertion that catches the regression chain that has bitten
  // checkbox toggles three times: Preview → onContentChange → updateTabContent
  // → (must) → syncModelForTab → Monaco model.
  it('T-UTD-01: updateTabContent calls syncModelForTab with the same id and content', () => {
    const { result } = renderHook(() => useTabsDesktop());

    let tabId: string;
    act(() => {
      tabId = result.current.addTab({
        title: 'Tasks',
        content: '- [ ] task',
        isModified: false,
        isNew: true,
      });
    });

    syncModelForTabMock.mockClear(); // ignore any sync triggered by addTab

    act(() => {
      result.current.updateTabContent(tabId!, '- [x] task');
    });

    expect(syncModelForTabMock).toHaveBeenCalledTimes(1);
    expect(syncModelForTabMock).toHaveBeenCalledWith(tabId!, '- [x] task');
    // React state must also reflect the new content.
    expect(result.current.tabs[0].content).toBe('- [x] task');
  });

  // T-UTD-02: model sync runs BEFORE the reducer dispatch so that the silent
  // flag is set while Monaco's onChange re-fires. Without this ordering the
  // tab's isModified would flicker / fire onChange twice.
  it('T-UTD-02: updateTabContent syncs the model before React state changes', () => {
    const { result } = renderHook(() => useTabsDesktop());

    let tabId: string;
    act(() => {
      tabId = result.current.addTab({
        title: 'A',
        content: 'old',
        isModified: false,
        isNew: true,
      });
    });

    let contentAtSyncTime: string | undefined;
    syncModelForTabMock.mockImplementationOnce((_id: string, c: string) => {
      // At the moment syncModelForTab is invoked, React state should still
      // have the OLD content. The reducer dispatch happens after.
      contentAtSyncTime = result.current.tabs[0].content;
      // Returned content must be the new content we are syncing INTO Monaco.
      expect(c).toBe('new');
    });

    act(() => {
      result.current.updateTabContent(tabId!, 'new');
    });

    expect(contentAtSyncTime).toBe('old');
    expect(result.current.tabs[0].content).toBe('new');
  });

  // T-UTD-03: reloadTabContent (file-change reload path) also must sync the
  // model. Same regression class — covered explicitly so a future refactor of
  // the reload path can't quietly drop the sync.
  it('T-UTD-03: reloadTabContent calls syncModelForTab with the new content', () => {
    const { result } = renderHook(() => useTabsDesktop());

    let tabId: string;
    act(() => {
      tabId = result.current.addTab({
        title: 'A',
        content: 'old',
        isModified: true,
        isNew: false,
      });
    });

    syncModelForTabMock.mockClear();

    act(() => {
      result.current.reloadTabContent(tabId!, 'reloaded');
    });

    expect(syncModelForTabMock).toHaveBeenCalledTimes(1);
    expect(syncModelForTabMock).toHaveBeenCalledWith(tabId!, 'reloaded');
    expect(result.current.tabs[0].content).toBe('reloaded');
    // reload path also resets isModified.
    expect(result.current.tabs[0].isModified).toBe(false);
  });
});

/**
 * File lifecycle contract: save conflict handling, duplicate-open detection,
 * session restore degradation and save-dialog cancellation. These paths guard
 * against the two failure modes that actually lose user data: silently
 * overwriting a file that changed on disk, and dropping tabs/edits during
 * restore or a cancelled save.
 */
describe('useTabsDesktop – file lifecycle', () => {
  beforeEach(() => {
    vi.mocked(desktopApi.readFileByPath).mockReset().mockResolvedValue({ content: '', filePath: undefined, error: undefined });
    vi.mocked(desktopApi.saveFileToPath).mockReset().mockResolvedValue({ success: true });
    vi.mocked(desktopApi.saveFile).mockReset();
    vi.mocked(desktopApi.getFileHash).mockReset().mockResolvedValue({ hash: 'h', modified_time: 1, file_size: 1 });
    vi.mocked(storeApi.loadState).mockReset().mockResolvedValue(null);
    vi.mocked(storeApi.createInitialState).mockReset().mockReturnValue({ tabs: [], activeTabId: null, lastOpenedAt: 0 });
    vi.mocked(storeApi.addRecentFile).mockReset().mockResolvedValue(undefined);
    vi.mocked(detectFileChange).mockReset().mockResolvedValue(false);
  });

  // restoreState dispatches LOAD_STATE asynchronously on mount; tests that add
  // tabs and then await anything must let it land first, or the late LOAD_STATE
  // would wipe the tabs they just added.
  const renderInitialized = async () => {
    const utils = renderHook(() => useTabsDesktop());
    await waitFor(() => {
      expect(utils.result.current.isInitialized).toBe(true);
    });
    return utils;
  };

  // T-UTD-04: saveTab must NOT overwrite a file that changed on disk since it
  // was loaded. It defers to the conflict dialog (fileChangeDetected event) and
  // reports success=true because the save flow is taken over by the dialog —
  // returning false here would make callers surface a spurious "save failed".
  // This is the core data-loss guard for external edits.
  it('T-UTD-04: saveTab dispatches fileChangeDetected and does not write when the file changed on disk', async () => {
    const { result } = await renderInitialized();

    let tabId: string;
    act(() => {
      tabId = result.current.addTab({
        title: 'a.md',
        content: 'local edits',
        filePath: '/path/a.md',
        isModified: true,
        isNew: false,
      });
    });

    vi.mocked(detectFileChange).mockResolvedValueOnce(true);
    const conflictListener = vi.fn();
    window.addEventListener('fileChangeDetected', conflictListener);
    try {
      let saved: boolean | undefined;
      await act(async () => {
        saved = await result.current.saveTab(tabId!);
      });

      expect(saved).toBe(true);
      // The file on disk must be left untouched until the user decides.
      expect(desktopApi.saveFileToPath).not.toHaveBeenCalled();
      expect(conflictListener).toHaveBeenCalledTimes(1);
      const event = conflictListener.mock.calls[0][0] as CustomEvent;
      expect(event.detail.tabId).toBe(tabId!);
      expect(event.detail.fileName).toBe('a.md');
      // The tab keeps its unsaved edits.
      expect(result.current.tabs[0].isModified).toBe(true);
      expect(result.current.tabs[0].content).toBe('local edits');
    } finally {
      window.removeEventListener('fileChangeDetected', conflictListener);
    }
  });

  // T-UTD-05: opening a file that is already open must activate the existing
  // tab instead of creating a duplicate (duplicate tabs would fork edits of
  // the same file into two diverging buffers).
  it('T-UTD-05: openFile activates the existing tab instead of duplicating it', async () => {
    const { result } = await renderInitialized();

    vi.mocked(desktopApi.readFileByPath).mockResolvedValue({
      content: '# Doc',
      filePath: '/path/dup.md',
      error: undefined,
    });

    let firstId: string | undefined;
    await act(async () => {
      firstId = await result.current.openFile('/path/dup.md');
    });
    expect(result.current.tabs).toHaveLength(1);

    // Move focus away so we can observe the duplicate-open re-activating it.
    act(() => {
      result.current.createNewTab();
    });
    expect(result.current.activeTabId).not.toBe(firstId);

    let secondId: string | undefined;
    await act(async () => {
      secondId = await result.current.openFile('/path/dup.md');
    });

    expect(secondId).toBe(firstId);
    // Still one file tab + the untitled tab; no duplicate was created.
    expect(result.current.tabs).toHaveLength(2);
    expect(result.current.activeTabId).toBe(firstId);
  });

  // T-UTD-06: session restore must degrade per-tab, not fail wholesale. A tab
  // whose file disappeared (deleted/renamed/unmounted drive) is downgraded to
  // an unsaved tab (isNew: true, filePath cleared) while the other tabs are
  // restored with their on-disk content.
  it('T-UTD-06: restoreState downgrades tabs whose file cannot be read and restores the rest', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const savedTabs: Tab[] = [
        { id: 'ok', title: 'ok.md', content: 'stale', filePath: '/path/ok.md', isModified: false, isNew: false },
        { id: 'gone', title: 'gone.md', content: 'last known content', filePath: '/path/gone.md', isModified: false, isNew: false },
      ];
      vi.mocked(storeApi.loadState).mockResolvedValueOnce({
        tabs: savedTabs,
        activeTabId: 'ok',
        lastOpenedAt: 123,
      });
      vi.mocked(desktopApi.readFileByPath).mockImplementation(async (path: string) =>
        path === '/path/ok.md'
          ? { content: 'fresh from disk', filePath: path, error: undefined }
          : { content: '', filePath: undefined, error: 'file not found' }
      );

      const { result } = await renderInitialized();

      expect(result.current.tabs).toHaveLength(2);
      const okTab = result.current.tabs.find((t) => t.id === 'ok')!;
      const goneTab = result.current.tabs.find((t) => t.id === 'gone')!;
      // Healthy tab is refreshed from disk.
      expect(okTab.content).toBe('fresh from disk');
      expect(okTab.isNew).toBe(false);
      // Missing file: downgraded but the last known content is kept in the tab.
      expect(goneTab.isNew).toBe(true);
      expect(goneTab.filePath).toBeUndefined();
      expect(goneTab.content).toBe('last known content');
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  // T-UTD-07: if loading the persisted state itself throws (corrupt store),
  // the app must still come up with a clean initial state instead of hanging
  // uninitialized.
  it('T-UTD-07: restoreState falls back to the initial state when loadState throws', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      vi.mocked(storeApi.loadState).mockRejectedValueOnce(new Error('store corrupted'));

      const { result } = await renderInitialized();

      expect(storeApi.createInitialState).toHaveBeenCalled();
      expect(result.current.tabs).toEqual([]);
      expect(result.current.activeTabId).toBeNull();
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  // T-UTD-08: cancelling the Save dialog for a new tab is not an error: saveTab
  // returns false (so close flows keep the tab open) and the tab keeps its
  // unsaved state.
  it('T-UTD-08: saveTab returns false and keeps the tab unsaved when the Save dialog is cancelled', async () => {
    const { result } = await renderInitialized();

    let tabId: string;
    act(() => {
      tabId = result.current.addTab({
        title: 'Untitled',
        content: 'draft',
        isModified: true,
        isNew: true,
      });
    });

    // User cancelled the native save dialog.
    vi.mocked(desktopApi.saveFile).mockResolvedValueOnce({ success: false });

    let saved: boolean | undefined;
    await act(async () => {
      saved = await result.current.saveTab(tabId!);
    });

    expect(saved).toBe(false);
    expect(result.current.tabs[0].isModified).toBe(true);
    expect(result.current.tabs[0].isNew).toBe(true);
    expect(result.current.tabs[0].filePath).toBeUndefined();
  });
});
