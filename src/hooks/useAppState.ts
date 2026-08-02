import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useTabsDesktop } from './useTabsDesktop';
import { useZoom } from './useZoom';
import { ZOOM_CONFIG } from '../constants/zoom';
import { Tab } from '../types/tab';
import { SettingsFocusTarget } from '../types/settingsFocus';
import { useEditorFocus } from './useEditorFocus';
import { useFolderTree } from './useFolderTree';
import { rotateViewMode as rotateViewModeUtil } from '../utils/viewModeUtils';

// Extracted sub-hooks
import { useSettings } from './useSettings';
import { useFileChangeDetection } from './useFileChangeDetection';
import { useFileOperations } from './useFileOperations';
import { useAutoSave } from './useAutoSave';
import { useUpdateChecker } from './useUpdateChecker';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { useEasterEggs } from './useEasterEggs';
import { useWhatsNew } from './useWhatsNew';
import { useMilestone } from './useMilestone';

/** How long the transient "Saved" status message stays visible in the status bar. */
const SAVE_STATUS_DISPLAY_MS = 3000;

/** Delay before requesting editor focus after switching into a mode that shows the editor.
 * Gives Monaco time to finish mounting/layout before receiving focus. */
const EDITOR_FOCUS_DELAY_MS = 100;

export const useAppState = () => {
  const { t } = useTranslation();

  // UI state (owned by orchestrator)
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsFocusTarget, setSettingsFocusTarget] = useState<SettingsFocusTarget | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [recentFilesOpen, setRecentFilesOpen] = useState(false);
  const [fileMenuAnchor, setFileMenuAnchor] = useState<null | HTMLElement>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'warning' }>({
    open: false,
    message: '',
    severity: 'success'
  });
  const [saveStatusMessage, setSaveStatusMessage] = useState<string | null>(null);
  const saveStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showSaveStatus = useCallback((message: string) => {
    if (saveStatusTimerRef.current) {
      clearTimeout(saveStatusTimerRef.current);
    }
    setSaveStatusMessage(message);
    saveStatusTimerRef.current = setTimeout(() => {
      setSaveStatusMessage(null);
    }, SAVE_STATUS_DISPLAY_MS);
  }, []);
  const [editorStatus, setEditorStatus] = useState({
    line: 1,
    column: 1,
    totalCharacters: 0,
    selectedCharacters: 0,
    totalWords: 0,
    selectedWords: 0
  });
  const [viewMode, setViewMode] = useState<'split' | 'editor' | 'preview'>('split');
  const [outlinePanelOpen, setOutlinePanelOpen] = useState(true);
  const [folderTreePanelOpen, setFolderTreePanelOpen] = useState(false);

  // 臨 (Rin) focus mode — session-only (never persisted). Hides all chrome and
  // shows only the current file's editor. Forces Editor view-mode while active
  // and restores the previous view-mode on exit.
  const [rinActive, setRinActive] = useState(false);
  const prevViewModeRef = useRef<'split' | 'editor' | 'preview'>('split');

  // Tab management
  const {
    tabs,
    activeTabId,
    activeTab,
    isInitialized,
    removeTab,
    toggleTabPinned,
    removeTabs,
    setActiveTab,
    updateTabContent,
    reloadTabContent,
    updateTabFileHash,
    setTabModified,
    reorderTabs,
    openFile,
    saveTab,
    saveTabAs,
    createNewTab,
    renameFile,
    updateTabTitle,
  } = useTabsDesktop();

  // Zoom management
  const {
    currentZoom,
    zoomPercentage,
    isAtLimit,
    zoomIn,
    zoomOut,
    resetZoom,
    canZoomIn,
    canZoomOut,
  } = useZoom(ZOOM_CONFIG);

  // Editor focus management
  const { focusRequestId, requestEditorFocus } = useEditorFocus();

  // Settings management
  const {
    theme,
    language,
    tabLayout,
    setTabLayout,
    tabSidebarPinned,
    toggleTabSidebarPinned,
    tabSidebarWidth,
    setTabSidebarWidth,
    globalVariables,
    setGlobalVariables,
    customThemes,
    handleCustomThemesChange,
    appSettings,
    isSettingsLoaded,
    currentTheme,
    handleLanguageChange,
    handleThemeChange,
    handleAppSettingsChange,
  } = useSettings({
    isInitialized,
    currentZoom,
    zoomIn,
    zoomOut,
    viewMode,
    setViewMode,
  });

  // Easter eggs
  const {
    as400Unlocked,
    showUnlockAnimation,
    isLateNight,
  } = useEasterEggs(isInitialized, handleThemeChange);

  // Folder tree management
  const {
    rootPath: folderTreeRootPath,
    rootFolderName: folderTreeRootFolderName,
    tree: folderTree,
    isLoading: folderTreeIsLoading,
    openFolder: folderTreeOpenFolder,
    closeFolder: folderTreeCloseFolder,
    toggleExpand: folderTreeToggleExpand,
    refreshTree: folderTreeRefreshTree,
  } = useFolderTree(appSettings.interface.folderTreeFileFilter === 'all');

  // File change detection
  const {
    fileChangeDialog,
    setFileChangeDialog,
  } = useFileChangeDetection({
    tabs,
    activeTab,
    isInitialized,
    reloadTabContent,
    updateTabFileHash,
    setTabModified,
    setActiveTab,
  });

  // File operations
  const {
    saveBeforeCloseDialog,
    setSaveBeforeCloseDialog,
    isDragOver,
    setIsDragOver,
    handleOpenFile,
    handleSaveFile,
    handleSaveFileAs,
    handleSaveWithVariables,
    handleTabClose,
    handleSaveBeforeClose,
    handleDontSaveBeforeClose,
    handleCancelBeforeClose,
    startCloseQueue,
  } = useFileOperations({
    activeTab,
    tabs,
    globalVariables,
    openFile,
    saveTab,
    saveTabAs,
    removeTab,
    requestEditorFocus,
    setSnackbar,
    showSaveStatus,
    t,
  });

  // Auto-save
  useAutoSave({
    activeTab,
    appSettings,
    isSettingsLoaded,
    isInitialized,
    saveTab,
    showSaveStatus,
    t,
  });

  // Update checker
  const {
    updateDialogOpen,
    updateDialogPhase,
    updateInfo,
    updateDownloadProgress,
    handleCheckForUpdate,
    handleDismissUpdate,
  } = useUpdateChecker({
    isInitialized,
    isSettingsLoaded,
    setSnackbar,
    t,
  });

  // Milestone / thank-you greeting (shown once before What's New)
  const {
    milestoneOpen,
    milestonePending,
    handleMilestoneClose,
  } = useMilestone(isInitialized, isSettingsLoaded);

  // What's New dialog (waits behind a pending milestone greeting)
  const {
    whatsNewOpen,
    handleWhatsNewOpen,
    handleWhatsNewClose,
  } = useWhatsNew(isInitialized, isSettingsLoaded, milestonePending);

  // Simple handlers
  const handleContentChange = (content: string) => {
    if (activeTab) {
      updateTabContent(activeTab.id, content);
    }
  };

  const handleSettingsOpen = (target?: SettingsFocusTarget) => {
    setSettingsFocusTarget(target ?? null);
    setSettingsOpen(true);
  };
  const handleSettingsClose = () => {
    setSettingsOpen(false);
    setSettingsFocusTarget(null);
  };
  const handleHelpOpen = () => setHelpOpen(true);
  const handleHelpClose = () => setHelpOpen(false);

  const handleRecentFilesOpen = () => setRecentFilesOpen(true);
  const handleRecentFilesClose = () => setRecentFilesOpen(false);

  const handleRecentFileSelect = async (filePath: string) => {
    try {
      await openFile(filePath);
      requestEditorFocus();
    } catch (error) {
      console.error('Failed to open recent file:', error);
      setSnackbar({ open: true, message: t('fileOperations.fileLoadFailed'), severity: 'error' });
    }
  };

  // Rename dialog state
  const [renameDialog, setRenameDialog] = useState<{ open: boolean; filePath: string; currentName: string; tabId?: string }>({
    open: false, filePath: '', currentName: '',
  });

  const handleRenameRequest = useCallback((filePath: string) => {
    const name = filePath.substring(filePath.lastIndexOf('/') + 1);
    setRenameDialog({ open: true, filePath, currentName: name });
  }, []);

  const handleRenameConfirm = useCallback(async (newName: string) => {
    try {
      if (renameDialog.tabId && !renameDialog.filePath) {
        // Unsaved tab: only update title
        updateTabTitle(renameDialog.tabId, newName);
      } else {
        // Saved file (from tab or folder tree): rename on filesystem
        await renameFile(renameDialog.filePath, newName);
        folderTreeRefreshTree();
      }
      setRenameDialog({ open: false, filePath: '', currentName: '' });
      setSnackbar({ open: true, message: t('folderTree.renameSuccess'), severity: 'success' });
    } catch (error) {
      console.error('Failed to rename file:', error);
      const msg = error instanceof Error ? error.message : t('folderTree.renameFailed');
      setSnackbar({ open: true, message: msg, severity: 'error' });
    }
  }, [renameFile, renameDialog.filePath, renameDialog.tabId, updateTabTitle, folderTreeRefreshTree, t]);

  const handleRenameCancel = useCallback(() => {
    setRenameDialog({ open: false, filePath: '', currentName: '' });
  }, []);

  const handleTabRenameRequest = useCallback((tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;
    const currentName = tab.filePath
      ? tab.filePath.substring(tab.filePath.lastIndexOf('/') + 1)
      : tab.title;
    setRenameDialog({ open: true, filePath: tab.filePath || '', currentName, tabId });
  }, [tabs]);

  // Tab context menu handlers
  const handleToggleTabPinned = useCallback((tabId: string) => {
    toggleTabPinned(tabId);
  }, [toggleTabPinned]);

  const handleCopyFilePath = useCallback(async (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab?.filePath) return;
    try {
      await navigator.clipboard.writeText(tab.filePath);
      setSnackbar({ open: true, message: t('tabs.pathCopied'), severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: t('tabs.copyFailed'), severity: 'error' });
    }
  }, [tabs, t]);

  const handleCopyFileName = useCallback(async (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;
    const fileName = tab.filePath
      ? tab.filePath.substring(tab.filePath.lastIndexOf('/') + 1)
      : tab.title;
    try {
      await navigator.clipboard.writeText(fileName);
      setSnackbar({ open: true, message: t('tabs.fileNameCopied'), severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: t('tabs.copyFailed'), severity: 'error' });
    }
  }, [tabs, t]);

  const handleCloseOtherTabs = useCallback((tabId: string) => {
    const targets = tabs.filter(tab => tab.id !== tabId && !tab.isPinned);
    const cleanIds = targets.filter(tab => !tab.isModified).map(tab => tab.id);
    const dirtyIds = targets.filter(tab => tab.isModified).map(tab => tab.id);
    if (cleanIds.length > 0) {
      removeTabs(cleanIds);
    }
    if (dirtyIds.length > 0) {
      startCloseQueue(dirtyIds);
    }
  }, [tabs, removeTabs, startCloseQueue]);

  const handleCloseTabsToRight = useCallback((tabId: string) => {
    const tabIndex = tabs.findIndex(t => t.id === tabId);
    if (tabIndex === -1) return;
    const targets = tabs.slice(tabIndex + 1).filter(tab => !tab.isPinned);
    const cleanIds = targets.filter(tab => !tab.isModified).map(tab => tab.id);
    const dirtyIds = targets.filter(tab => tab.isModified).map(tab => tab.id);
    if (cleanIds.length > 0) {
      removeTabs(cleanIds);
    }
    if (dirtyIds.length > 0) {
      startCloseQueue(dirtyIds);
    }
  }, [tabs, removeTabs, startCloseQueue]);

  const handleCloseAllTabs = useCallback(() => {
    const targets = tabs.filter(tab => !tab.isPinned);
    const cleanIds = targets.filter(tab => !tab.isModified).map(tab => tab.id);
    const dirtyIds = targets.filter(tab => tab.isModified).map(tab => tab.id);
    if (cleanIds.length > 0) {
      removeTabs(cleanIds);
    }
    if (dirtyIds.length > 0) {
      startCloseQueue(dirtyIds);
    }
  }, [tabs, removeTabs, startCloseQueue]);

  const handleFolderTreeFileClick = useCallback(async (filePath: string) => {
    try {
      await openFile(filePath);
      requestEditorFocus();
    } catch (error) {
      console.error('Failed to open file from folder tree:', error);
      setSnackbar({ open: true, message: t('fileOperations.fileLoadFailed'), severity: 'error' });
    }
  }, [openFile, requestEditorFocus, t]);

  const handleOpenFolder = useCallback(async () => {
    const selected = await folderTreeOpenFolder();
    if (selected) {
      setFolderTreePanelOpen(true);
      if (appSettings.interface.folderTreeDisplayMode === 'off') {
        const updatedSettings = {
          ...appSettings,
          interface: {
            ...appSettings.interface,
            folderTreeDisplayMode: 'persistent' as const,
          },
        };
        handleAppSettingsChange(updatedSettings);
      }
    }
  }, [folderTreeOpenFolder, appSettings, handleAppSettingsChange]);

  const handleFileMenuOpen = (event: React.MouseEvent<HTMLElement>) => setFileMenuAnchor(event.currentTarget);
  const handleFileMenuClose = () => setFileMenuAnchor(null);
  const handleCloseSnackbar = () => setSnackbar({ ...snackbar, open: false });

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    requestEditorFocus();
  };

  const handleNewTab = () => {
    createNewTab();
    requestEditorFocus();
  };

  const handleTabReorder = (reorderedTabs: Tab[]) => {
    reorderTabs(reorderedTabs);
  };

  // Outline panel toggle (header button + Ctrl+Shift+O).
  // The outline setting persists as one of persistent / overlay / off
  // (off = `outlineEnabled` false). The button is a single entry point:
  //   - off            → restore to the remembered style and show
  //   - on, persistent → turn off (persisted; the only way to hide the docked panel)
  //   - on, overlay    → open/close the transient drawer (off stays in Settings)
  const handleOutlineToggle = useCallback(() => {
    const { outlineDisplayMode: mode, outlineEnabled: enabled } = appSettings.interface;
    if (!enabled) {
      handleAppSettingsChange({
        ...appSettings,
        interface: { ...appSettings.interface, outlineEnabled: true },
      });
      setOutlinePanelOpen(true);
      return;
    }
    if (mode === 'overlay') {
      setOutlinePanelOpen((prev) => !prev);
    } else {
      handleAppSettingsChange({
        ...appSettings,
        interface: { ...appSettings.interface, outlineEnabled: false },
      });
    }
  }, [appSettings, handleAppSettingsChange]);

  // View mode
  const rotateViewMode = useCallback(() => {
    setViewMode(rotateViewModeUtil(viewMode));
  }, [viewMode]);

  const changeViewMode = useCallback((mode: 'split' | 'editor' | 'preview') => {
    setViewMode(mode);
  }, []);

  // 臨 (Rin) focus mode toggle. Enter: snapshot current view-mode, force Editor.
  // Exit: restore the snapshot. Session-only — not persisted.
  const enterRin = useCallback(() => {
    setRinActive((active) => {
      if (active) return true;
      prevViewModeRef.current = viewMode;
      setViewMode('editor');
      return true;
    });
  }, [viewMode]);

  const exitRin = useCallback(() => {
    setRinActive((active) => {
      if (!active) return false;
      setViewMode(prevViewModeRef.current);
      return false;
    });
  }, []);

  const toggleRin = useCallback(() => {
    if (rinActive) {
      exitRin();
    } else {
      enterRin();
    }
  }, [rinActive, enterRin, exitRin]);

  // Focus editor when switching to a mode that shows the editor
  useEffect(() => {
    if (isSettingsLoaded && (viewMode === 'split' || viewMode === 'editor')) {
      const timer = setTimeout(() => {
        requestEditorFocus();
      }, EDITOR_FOCUS_DELAY_MS);
      return () => clearTimeout(timer);
    }
  }, [viewMode, isSettingsLoaded, requestEditorFocus]);

  // Note: No auto-creation of tabs when empty.
  // The EmptyState component is shown instead (see AppContent).

  // Keyboard shortcuts
  const { handleKeyDown } = useKeyboardShortcuts({
    onNewTab: handleNewTab,
    onOpenFile: handleOpenFile,
    onSaveFile: handleSaveFile,
    onSaveFileAs: handleSaveFileAs,
    onRecentFilesOpen: handleRecentFilesOpen,
    onHelpOpen: handleHelpOpen,
    onSettingsOpen: handleSettingsOpen,
    onRotateViewMode: rotateViewMode,
    onChangeViewMode: changeViewMode,
    tabs,
    activeTabId,
    setActiveTab,
    appSettings,
    onToggleOutline: handleOutlineToggle,
    setFolderTreePanelOpen,
  });

  return {
    // State
    theme,
    customThemes,
    handleCustomThemesChange,
    settingsOpen,
    settingsFocusTarget,
    helpOpen,
    recentFilesOpen,
    fileMenuAnchor,
    snackbar,
    globalVariables,
    language,
    tabLayout,
    tabSidebarPinned,
    toggleTabSidebarPinned,
    tabSidebarWidth,
    setTabSidebarWidth,
    viewMode,
    rinActive,
    toggleRin,
    exitRin,
    isSettingsLoaded,
    editorStatus,
    fileChangeDialog,
    saveBeforeCloseDialog,
    isDragOver,
    tabs,
    activeTabId,
    activeTab,
    isInitialized,
    currentTheme,
    currentZoom,
    zoomPercentage,
    isAtLimit,
    canZoomIn,
    canZoomOut,

    // Save status (for status bar)
    saveStatusMessage,

    // Outline panel
    outlinePanelOpen,
    handleOutlineToggle,

    // Folder tree
    folderTreePanelOpen,
    folderTreeRootPath,
    folderTreeRootFolderName,
    folderTree,
    folderTreeIsLoading,

    // New unified settings
    appSettings,

    // Easter eggs
    as400Unlocked,
    showUnlockAnimation,
    isLateNight,

    // Milestone greeting state
    milestoneOpen,
    handleMilestoneClose,

    // What's New state
    whatsNewOpen,

    // Update state
    updateDialogOpen,
    updateDialogPhase,
    updateInfo,
    updateDownloadProgress,

    // Editor focus
    focusRequestId,
    requestEditorFocus,

    // Handlers
    handleContentChange,
    handleSettingsOpen,
    handleSettingsClose,
    handleHelpOpen,
    handleHelpClose,
    handleRecentFileSelect,
    handleRecentFilesOpen,
    handleRecentFilesClose,
    handleLanguageChange,
    handleThemeChange,
    handleAppSettingsChange,
    handleFileMenuOpen,
    handleFileMenuClose,
    handleCloseSnackbar,
    handleOpenFile,
    handleSaveFile,
    handleSaveFileAs,
    handleSaveWithVariables,
    handleTabChange,
    handleTabClose,
    handleNewTab,
    handleSaveBeforeClose,
    handleDontSaveBeforeClose,
    handleCancelBeforeClose,
    handleTabReorder,
    handleCheckForUpdate,
    handleDismissUpdate,
    handleWhatsNewOpen,
    handleWhatsNewClose,
    handleKeyDown,
    handleFolderTreeFileClick,
    handleOpenFolder,

    // Tab handlers
    removeTab,
    setActiveTab,
    updateTabContent,
    updateTabFileHash,
    reorderTabs,
    openFile,
    saveTab,
    saveTabAs,
    createNewTab,

    // Zoom handlers
    zoomIn,
    zoomOut,
    resetZoom,

    // Setters
    setSnackbar,
    setEditorStatus,
    setFileChangeDialog,
    setSaveBeforeCloseDialog,
    setIsDragOver,
    setOutlinePanelOpen,
    setFolderTreePanelOpen,
    folderTreeCloseFolder,
    folderTreeToggleExpand,
    folderTreeRefreshTree,
    renameDialog,
    handleRenameRequest,
    handleRenameConfirm,
    handleRenameCancel,
    handleTabRenameRequest,
    handleToggleTabPinned,
    handleCopyFilePath,
    handleCopyFileName,
    handleCloseOtherTabs,
    handleCloseTabsToRight,
    handleCloseAllTabs,
    setGlobalVariables,
    setTabLayout,
    setViewMode,

    // Translation
    t,

    // Constants
    ZOOM_CONFIG,
  };
};
