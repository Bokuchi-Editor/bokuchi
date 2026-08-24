import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { Tab } from '../../types/tab';
import type { AppSettings } from '../../types/settings';

// ---------------------------------------------------------------------------
// Harness: useAppState is an orchestrator composing many sub-hooks. All
// sub-hooks are mocked so that only useAppState's own logic is under test.
// `h` holds the mutable inputs (tabs / activeTabId / appSettings) and the spy
// functions the mocked sub-hooks hand to useAppState. Tests mutate `h` before
// renderHook and assert on the spies / returned state afterwards.
// ---------------------------------------------------------------------------
const h = vi.hoisted(() => ({
  // Mutable inputs (reset in beforeEach)
  tabs: [] as Tab[],
  activeTabId: null as string | null,
  appSettings: undefined as unknown as AppSettings,

  // useTabsDesktop spies
  removeTab: vi.fn(),
  toggleTabPinned: vi.fn(),
  removeTabs: vi.fn(),
  setActiveTab: vi.fn(),
  updateTabContent: vi.fn(),
  reloadTabContent: vi.fn(),
  updateTabFileHash: vi.fn(),
  setTabModified: vi.fn(),
  reorderTabs: vi.fn(),
  openFile: vi.fn(),
  saveTab: vi.fn(),
  saveTabAs: vi.fn(),
  createNewTab: vi.fn(),
  renameFile: vi.fn(),
  updateTabTitle: vi.fn(),

  // useFileOperations spies (startCloseQueue is the data-loss-critical one)
  startCloseQueue: vi.fn(),
  handleTabClose: vi.fn(),

  // useSettings spies
  handleAppSettingsChange: vi.fn(),

  // useFolderTree spies
  folderTreeRefreshTree: vi.fn(),
  folderTreeOpenFolder: vi.fn(),

  // Misc spies
  requestEditorFocus: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// revealInFileManager imports @tauri-apps/plugin-opener; mock to keep the
// module graph free of Tauri runtime dependencies.
vi.mock('../../utils/revealInFileManager', () => ({
  revealInFileManager: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../useTabsDesktop', () => ({
  useTabsDesktop: () => ({
    tabs: h.tabs,
    activeTabId: h.activeTabId,
    activeTab: h.tabs.find((tab) => tab.id === h.activeTabId) ?? null,
    isInitialized: true,
    removeTab: h.removeTab,
    toggleTabPinned: h.toggleTabPinned,
    removeTabs: h.removeTabs,
    setActiveTab: h.setActiveTab,
    updateTabContent: h.updateTabContent,
    reloadTabContent: h.reloadTabContent,
    updateTabFileHash: h.updateTabFileHash,
    setTabModified: h.setTabModified,
    reorderTabs: h.reorderTabs,
    openFile: h.openFile,
    saveTab: h.saveTab,
    saveTabAs: h.saveTabAs,
    createNewTab: h.createNewTab,
    renameFile: h.renameFile,
    updateTabTitle: h.updateTabTitle,
  }),
}));

vi.mock('../useZoom', () => ({
  useZoom: () => ({
    currentZoom: 1.0,
    zoomPercentage: 100,
    isAtLimit: false,
    zoomIn: vi.fn(),
    zoomOut: vi.fn(),
    resetZoom: vi.fn(),
    canZoomIn: true,
    canZoomOut: true,
  }),
}));

vi.mock('../useEditorFocus', () => ({
  useEditorFocus: () => ({
    focusRequestId: 0,
    requestEditorFocus: h.requestEditorFocus,
  }),
}));

vi.mock('../useSettings', () => ({
  useSettings: () => ({
    theme: 'default',
    language: 'en',
    tabLayout: 'horizontal',
    setTabLayout: vi.fn(),
    tabSidebarPinned: true,
    toggleTabSidebarPinned: vi.fn(),
    tabSidebarWidth: 240,
    setTabSidebarWidth: vi.fn(),
    globalVariables: {},
    setGlobalVariables: vi.fn(),
    customThemes: [],
    handleCustomThemesChange: vi.fn(),
    appSettings: h.appSettings,
    isSettingsLoaded: true,
    currentTheme: {},
    handleLanguageChange: vi.fn(),
    handleThemeChange: vi.fn(),
    handleAppSettingsChange: h.handleAppSettingsChange,
  }),
}));

vi.mock('../useEasterEggs', () => ({
  useEasterEggs: () => ({
    as400Unlocked: false,
    showUnlockAnimation: false,
    isLateNight: false,
  }),
}));

vi.mock('../useFolderTree', () => ({
  useFolderTree: () => ({
    rootPath: null,
    rootFolderName: null,
    tree: [],
    isLoading: false,
    openFolder: h.folderTreeOpenFolder,
    closeFolder: vi.fn(),
    toggleExpand: vi.fn(),
    refreshTree: h.folderTreeRefreshTree,
  }),
}));

vi.mock('../useFileChangeDetection', () => ({
  useFileChangeDetection: () => ({
    fileChangeDialog: { open: false },
    setFileChangeDialog: vi.fn(),
  }),
}));

vi.mock('../useFileOperations', () => ({
  useFileOperations: () => ({
    saveBeforeCloseDialog: { open: false, tabId: '', fileName: '', queue: [] },
    setSaveBeforeCloseDialog: vi.fn(),
    isDragOver: false,
    setIsDragOver: vi.fn(),
    handleOpenFile: vi.fn(),
    handleSaveFile: vi.fn(),
    handleSaveFileAs: vi.fn(),
    handleSaveWithVariables: vi.fn(),
    handleTabClose: h.handleTabClose,
    handleSaveBeforeClose: vi.fn(),
    handleDontSaveBeforeClose: vi.fn(),
    handleCancelBeforeClose: vi.fn(),
    startCloseQueue: h.startCloseQueue,
  }),
}));

vi.mock('../useAutoSave', () => ({
  useAutoSave: () => undefined,
}));

vi.mock('../useUpdateChecker', () => ({
  useUpdateChecker: () => ({
    updateDialogOpen: false,
    updateDialogPhase: 'idle',
    updateInfo: null,
    updateDownloadProgress: 0,
    handleCheckForUpdate: vi.fn(),
    handleDismissUpdate: vi.fn(),
  }),
}));

vi.mock('../useMilestone', () => ({
  useMilestone: () => ({
    milestoneOpen: false,
    milestonePending: false,
    handleMilestoneClose: vi.fn(),
  }),
}));

vi.mock('../useWhatsNew', () => ({
  useWhatsNew: () => ({
    whatsNewOpen: false,
    handleWhatsNewOpen: vi.fn(),
    handleWhatsNewClose: vi.fn(),
  }),
}));

vi.mock('../useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: () => ({
    handleKeyDown: vi.fn(),
  }),
}));

import { useAppState } from '../useAppState';
import { DEFAULT_APP_SETTINGS } from '../../types/settings';

const makeTab = (overrides: Partial<Tab> & { id: string }): Tab => ({
  title: `${overrides.id}.md`,
  content: '',
  isModified: false,
  isNew: false,
  ...overrides,
});

describe('useAppState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.tabs = [];
    h.activeTabId = null;
    h.appSettings = structuredClone(DEFAULT_APP_SETTINGS);
    h.renameFile.mockResolvedValue(undefined);
  });

  // =========================================================================
  // Bulk tab close (handleCloseOtherTabs / handleCloseTabsToRight /
  // handleCloseAllTabs)
  //
  // Contract: pinned tabs are never closed; clean (unmodified) tabs are
  // removed immediately via removeTabs; dirty (modified) tabs MUST go through
  // startCloseQueue so the user is asked to save. A dirty tab id appearing in
  // removeTabs would mean silent data loss — the most critical invariant here.
  // =========================================================================

  // T-AS-01: closing "other tabs" keeps the target, removes clean others
  // immediately, and routes dirty others to the confirm queue. Expected split:
  // t2 is clean+unpinned (removeTabs), t3 is dirty+unpinned (startCloseQueue),
  // t1 is the target and must appear in neither.
  it('T-AS-01: handleCloseOtherTabs splits clean/dirty and keeps the target tab', () => {
    h.tabs = [
      makeTab({ id: 't1' }),
      makeTab({ id: 't2' }),
      makeTab({ id: 't3', isModified: true }),
    ];
    const { result } = renderHook(() => useAppState());

    act(() => {
      result.current.handleCloseOtherTabs('t1');
    });

    expect(h.removeTabs).toHaveBeenCalledTimes(1);
    expect(h.removeTabs).toHaveBeenCalledWith(['t2']);
    expect(h.startCloseQueue).toHaveBeenCalledTimes(1);
    expect(h.startCloseQueue).toHaveBeenCalledWith(['t3']);
  });

  // T-AS-02: pinned tabs are protected from bulk close regardless of dirty
  // state. Expected: pinned t2 (clean) and t3 (dirty) are excluded from both
  // removeTabs and startCloseQueue; only unpinned t4/t5 are affected.
  it('T-AS-02: handleCloseOtherTabs excludes pinned tabs', () => {
    h.tabs = [
      makeTab({ id: 't1' }),
      makeTab({ id: 't2', isPinned: true }),
      makeTab({ id: 't3', isPinned: true, isModified: true }),
      makeTab({ id: 't4' }),
      makeTab({ id: 't5', isModified: true }),
    ];
    const { result } = renderHook(() => useAppState());

    act(() => {
      result.current.handleCloseOtherTabs('t1');
    });

    expect(h.removeTabs).toHaveBeenCalledWith(['t4']);
    expect(h.startCloseQueue).toHaveBeenCalledWith(['t5']);
  });

  // T-AS-03: when every other tab is pinned there is nothing to close, so
  // neither removeTabs nor startCloseQueue may fire (the implementation guards
  // against calling them with empty arrays).
  it('T-AS-03: handleCloseOtherTabs is a no-op when all other tabs are pinned', () => {
    h.tabs = [
      makeTab({ id: 't1' }),
      makeTab({ id: 't2', isPinned: true }),
      makeTab({ id: 't3', isPinned: true, isModified: true }),
    ];
    const { result } = renderHook(() => useAppState());

    act(() => {
      result.current.handleCloseOtherTabs('t1');
    });

    expect(h.removeTabs).not.toHaveBeenCalled();
    expect(h.startCloseQueue).not.toHaveBeenCalled();
  });

  // T-AS-04: "close tabs to the right" must use array position, not id order.
  // Target t2 (index 1): t1 (left) and t2 (self) untouched; to the right,
  // clean t3 -> removeTabs, dirty t4 -> startCloseQueue.
  it('T-AS-04: handleCloseTabsToRight only affects tabs strictly to the right', () => {
    h.tabs = [
      makeTab({ id: 't1', isModified: true }), // left & dirty: must survive untouched
      makeTab({ id: 't2' }),
      makeTab({ id: 't3' }),
      makeTab({ id: 't4', isModified: true }),
    ];
    const { result } = renderHook(() => useAppState());

    act(() => {
      result.current.handleCloseTabsToRight('t2');
    });

    expect(h.removeTabs).toHaveBeenCalledWith(['t3']);
    expect(h.startCloseQueue).toHaveBeenCalledWith(['t4']);
  });

  // T-AS-05: pinned tabs to the right survive; with only a pinned tab to the
  // right of the last unpinned one, the dirty unpinned t4 still goes to the
  // queue while pinned t3 is skipped.
  it('T-AS-05: handleCloseTabsToRight skips pinned tabs on the right', () => {
    h.tabs = [
      makeTab({ id: 't1' }),
      makeTab({ id: 't2' }),
      makeTab({ id: 't3', isPinned: true }),
      makeTab({ id: 't4', isModified: true }),
    ];
    const { result } = renderHook(() => useAppState());

    act(() => {
      result.current.handleCloseTabsToRight('t2');
    });

    expect(h.removeTabs).not.toHaveBeenCalled(); // t3 pinned, t4 dirty -> no clean removals
    expect(h.startCloseQueue).toHaveBeenCalledWith(['t4']);
  });

  // T-AS-06: an id that is not in the tab list must bail out early (findIndex
  // returns -1); otherwise slice(0) would wrongly target every tab.
  it('T-AS-06: handleCloseTabsToRight does nothing for an unknown tab id', () => {
    h.tabs = [makeTab({ id: 't1' }), makeTab({ id: 't2', isModified: true })];
    const { result } = renderHook(() => useAppState());

    act(() => {
      result.current.handleCloseTabsToRight('nope');
    });

    expect(h.removeTabs).not.toHaveBeenCalled();
    expect(h.startCloseQueue).not.toHaveBeenCalled();
  });

  // T-AS-07: "close all" includes the active tab (no target exemption): clean
  // t1/t3 are removed at once, dirty t2 is queued, pinned t4 survives.
  it('T-AS-07: handleCloseAllTabs closes every unpinned tab, splitting clean and dirty', () => {
    h.tabs = [
      makeTab({ id: 't1' }),
      makeTab({ id: 't2', isModified: true }),
      makeTab({ id: 't3' }),
      makeTab({ id: 't4', isPinned: true }),
    ];
    h.activeTabId = 't1';
    const { result } = renderHook(() => useAppState());

    act(() => {
      result.current.handleCloseAllTabs();
    });

    expect(h.removeTabs).toHaveBeenCalledWith(['t1', 't3']);
    expect(h.startCloseQueue).toHaveBeenCalledWith(['t2']);
  });

  // T-AS-08: data-loss guard — when every candidate is dirty, removeTabs must
  // never fire; all ids must go through the save-confirmation queue.
  it('T-AS-08: handleCloseAllTabs never removes dirty tabs without confirmation', () => {
    h.tabs = [
      makeTab({ id: 't1', isModified: true }),
      makeTab({ id: 't2', isModified: true }),
    ];
    const { result } = renderHook(() => useAppState());

    act(() => {
      result.current.handleCloseAllTabs();
    });

    expect(h.removeTabs).not.toHaveBeenCalled();
    expect(h.startCloseQueue).toHaveBeenCalledWith(['t1', 't2']);
  });

  // =========================================================================
  // 臨 (Rin) focus mode — enter snapshots the current viewMode and forces
  // 'editor'; exit restores the snapshot. Session-only, guarded re-entry.
  // =========================================================================

  // T-AS-09: entering Rin forces the editor view. Expected because enterRin
  // does setViewMode('editor') and flips rinActive to true.
  it('T-AS-09: toggleRin enters Rin mode and forces editor view', () => {
    const { result } = renderHook(() => useAppState());

    act(() => {
      result.current.setViewMode('preview');
    });
    act(() => {
      result.current.toggleRin();
    });

    expect(result.current.rinActive).toBe(true);
    expect(result.current.viewMode).toBe('editor');
  });

  // T-AS-10: exiting restores the snapshot taken on entry ('preview'), not a
  // default — that is the whole point of the prevViewModeRef snapshot.
  it('T-AS-10: exitRin restores the view mode captured on entry', () => {
    const { result } = renderHook(() => useAppState());

    act(() => {
      result.current.setViewMode('preview');
    });
    act(() => {
      result.current.toggleRin(); // enter: snapshot 'preview'
    });
    act(() => {
      result.current.exitRin();
    });

    expect(result.current.rinActive).toBe(false);
    expect(result.current.viewMode).toBe('preview');
  });

  // T-AS-11: exitRin while inactive must be a no-op — it must NOT restore the
  // (stale, default 'split') snapshot over the user's current view mode.
  it('T-AS-11: exitRin is a no-op when Rin is not active', () => {
    const { result } = renderHook(() => useAppState());

    act(() => {
      result.current.setViewMode('preview');
    });
    act(() => {
      result.current.exitRin();
    });

    expect(result.current.rinActive).toBe(false);
    expect(result.current.viewMode).toBe('preview');
  });

  // T-AS-12: re-entry guard. A second "enter" while already active (possible
  // via a stale closure, e.g. a queued event handler from an earlier render)
  // must not overwrite the snapshot. Here the stale toggle was created while
  // viewMode was 'editor'; without the `if (active) return true` guard it
  // would re-snapshot 'editor' and exit would then strand the user in editor
  // view instead of restoring 'preview'.
  it('T-AS-12: entering Rin twice does not overwrite the view-mode snapshot', () => {
    const { result } = renderHook(() => useAppState());

    act(() => {
      result.current.setViewMode('editor');
    });
    // Stale closure: rinActive=false, captured viewMode='editor'
    const staleToggle = result.current.toggleRin;

    act(() => {
      result.current.setViewMode('preview');
    });
    act(() => {
      result.current.toggleRin(); // genuine enter: snapshot 'preview'
    });
    act(() => {
      staleToggle(); // stale enter while active: guard must ignore it
    });

    expect(result.current.rinActive).toBe(true);

    act(() => {
      result.current.exitRin();
    });

    // Guard intact -> restores the first snapshot 'preview'.
    // Guard broken -> the stale enter re-snapshots 'editor' and we'd get 'editor'.
    expect(result.current.viewMode).toBe('preview');
  });

  // =========================================================================
  // Outline toggle — one button, three behaviors depending on persisted
  // settings (outlineEnabled / outlineDisplayMode).
  // =========================================================================

  // T-AS-13: outline off -> the toggle re-enables it with the REMEMBERED
  // display style (outlineDisplayMode must stay 'overlay', only
  // outlineEnabled flips) and opens the panel.
  it('T-AS-13: handleOutlineToggle re-enables outline with remembered style when off', () => {
    h.appSettings.interface.outlineEnabled = false;
    h.appSettings.interface.outlineDisplayMode = 'overlay';
    const { result } = renderHook(() => useAppState());

    act(() => {
      result.current.setOutlinePanelOpen(false);
    });
    act(() => {
      result.current.handleOutlineToggle();
    });

    expect(h.handleAppSettingsChange).toHaveBeenCalledTimes(1);
    expect(h.handleAppSettingsChange).toHaveBeenCalledWith(
      expect.objectContaining({
        interface: expect.objectContaining({
          outlineEnabled: true,
          outlineDisplayMode: 'overlay', // remembered style preserved
        }),
      })
    );
    expect(result.current.outlinePanelOpen).toBe(true);
  });

  // T-AS-14: outline on + persistent -> the toggle turns the outline OFF via
  // settings (the only way to hide the docked panel); the transient
  // outlinePanelOpen state is not touched.
  it('T-AS-14: handleOutlineToggle disables outline when on in persistent mode', () => {
    h.appSettings.interface.outlineEnabled = true;
    h.appSettings.interface.outlineDisplayMode = 'persistent';
    const { result } = renderHook(() => useAppState());

    act(() => {
      result.current.handleOutlineToggle();
    });

    expect(h.handleAppSettingsChange).toHaveBeenCalledTimes(1);
    expect(h.handleAppSettingsChange).toHaveBeenCalledWith(
      expect.objectContaining({
        interface: expect.objectContaining({ outlineEnabled: false }),
      })
    );
    expect(result.current.outlinePanelOpen).toBe(true); // unchanged
  });

  // T-AS-15: outline on + overlay -> the toggle only opens/closes the
  // transient drawer (outlinePanelOpen flips each press); settings are never
  // written because turning overlay mode off lives in Settings, not here.
  it('T-AS-15: handleOutlineToggle toggles the drawer in overlay mode without touching settings', () => {
    h.appSettings.interface.outlineEnabled = true;
    h.appSettings.interface.outlineDisplayMode = 'overlay';
    const { result } = renderHook(() => useAppState());

    expect(result.current.outlinePanelOpen).toBe(true); // initial state

    act(() => {
      result.current.handleOutlineToggle();
    });
    expect(result.current.outlinePanelOpen).toBe(false);

    act(() => {
      result.current.handleOutlineToggle();
    });
    expect(result.current.outlinePanelOpen).toBe(true);

    expect(h.handleAppSettingsChange).not.toHaveBeenCalled();
  });

  // =========================================================================
  // Rename confirm — unsaved tab (title-only) vs saved file (filesystem
  // rename), success snackbar, and error handling.
  // =========================================================================

  // T-AS-16: renaming an UNSAVED tab (no filePath, dialog opened with a tabId)
  // must only change the tab title — there is no file on disk, so renameFile
  // and the folder-tree refresh must not run. Dialog closes, success snackbar.
  it('T-AS-16: handleRenameConfirm updates only the title for an unsaved tab', async () => {
    h.tabs = [makeTab({ id: 't1', title: 'Untitled', isNew: true })];
    const { result } = renderHook(() => useAppState());

    act(() => {
      result.current.handleTabRenameRequest('t1');
    });
    // Unsaved tab: dialog carries the tabId and an empty filePath
    expect(result.current.renameDialog).toEqual(
      expect.objectContaining({ open: true, filePath: '', currentName: 'Untitled', tabId: 't1' })
    );

    await act(async () => {
      await result.current.handleRenameConfirm('notes.md');
    });

    expect(h.updateTabTitle).toHaveBeenCalledWith('t1', 'notes.md');
    expect(h.renameFile).not.toHaveBeenCalled();
    expect(h.folderTreeRefreshTree).not.toHaveBeenCalled();
    expect(result.current.renameDialog.open).toBe(false);
    expect(result.current.snackbar).toEqual(
      expect.objectContaining({ open: true, severity: 'success', message: 'folderTree.renameSuccess' })
    );
  });

  // T-AS-17: renaming a SAVED file (dialog opened from the folder tree with a
  // filePath) must rename on the filesystem and refresh the folder tree so the
  // tree reflects the new name. Dialog closes, success snackbar.
  it('T-AS-17: handleRenameConfirm renames a saved file on disk and refreshes the tree', async () => {
    const { result } = renderHook(() => useAppState());

    act(() => {
      result.current.handleRenameRequest('/docs/old.md');
    });
    // currentName is derived from the path's basename
    expect(result.current.renameDialog).toEqual(
      expect.objectContaining({ open: true, filePath: '/docs/old.md', currentName: 'old.md' })
    );

    await act(async () => {
      await result.current.handleRenameConfirm('new.md');
    });

    expect(h.renameFile).toHaveBeenCalledWith('/docs/old.md', 'new.md');
    expect(h.folderTreeRefreshTree).toHaveBeenCalledTimes(1);
    expect(h.updateTabTitle).not.toHaveBeenCalled();
    expect(result.current.renameDialog.open).toBe(false);
    expect(result.current.snackbar).toEqual(
      expect.objectContaining({ open: true, severity: 'success' })
    );
  });

  // T-AS-18: a SAVED tab rename (dialog has both tabId and filePath) must take
  // the filesystem branch — the tabId-only shortcut applies solely when there
  // is no filePath (`renameDialog.tabId && !renameDialog.filePath`).
  it('T-AS-18: handleRenameConfirm uses the filesystem branch for a saved tab', async () => {
    h.tabs = [makeTab({ id: 't1', title: 'doc.md', filePath: '/docs/doc.md' })];
    const { result } = renderHook(() => useAppState());

    act(() => {
      result.current.handleTabRenameRequest('t1');
    });
    expect(result.current.renameDialog).toEqual(
      expect.objectContaining({ open: true, filePath: '/docs/doc.md', currentName: 'doc.md', tabId: 't1' })
    );

    await act(async () => {
      await result.current.handleRenameConfirm('renamed.md');
    });

    expect(h.renameFile).toHaveBeenCalledWith('/docs/doc.md', 'renamed.md');
    expect(h.updateTabTitle).not.toHaveBeenCalled();
  });

  // T-AS-19: when renameFile rejects (e.g. name collision) the user must see
  // an error snackbar carrying the Error's message, and the dialog must stay
  // open so they can correct the name. The tree must not be refreshed.
  it('T-AS-19: handleRenameConfirm shows an error snackbar and keeps the dialog open on failure', async () => {
    h.renameFile.mockRejectedValue(new Error('file already exists'));
    const { result } = renderHook(() => useAppState());

    act(() => {
      result.current.handleRenameRequest('/docs/old.md');
    });

    await act(async () => {
      await result.current.handleRenameConfirm('taken.md');
    });

    expect(result.current.snackbar).toEqual(
      expect.objectContaining({ open: true, severity: 'error', message: 'file already exists' })
    );
    expect(result.current.renameDialog.open).toBe(true); // stays open for correction
    expect(h.folderTreeRefreshTree).not.toHaveBeenCalled();
  });
});
