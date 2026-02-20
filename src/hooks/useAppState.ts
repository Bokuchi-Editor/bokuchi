import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ThemeName, getThemeByName, applyThemeToDocument } from '../themes';
import { storeApi } from '../api/storeApi';
import { variableApi } from '../api/variableApi';
import { useTabsDesktop } from './useTabsDesktop';
import { useZoom } from './useZoom';
import { ZOOM_CONFIG } from '../constants/zoom';
import { Tab } from '../types/tab';
import { desktopApi } from '../api/desktopApi';
import { detectFileChange } from '../utils/fileChangeDetection';
import { AppSettings, DEFAULT_APP_SETTINGS } from '../types/settings';
import { useEditorFocus } from './useEditorFocus';
import { updaterApi, UpdateInfo, DownloadProgress } from '../api/updaterApi';
import { Update } from '@tauri-apps/plugin-updater';
import { UpdateDialogPhase } from '../components/UpdateDialog';

export const useAppState = () => {
  const { t, i18n } = useTranslation();

  // Basic state
  const [theme, setTheme] = useState<ThemeName>('default');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [recentFilesOpen, setRecentFilesOpen] = useState(false);
  const [fileMenuAnchor, setFileMenuAnchor] = useState<null | HTMLElement>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'warning' }>({
    open: false,
    message: '',
    severity: 'success'
  });
  const [globalVariables, setGlobalVariables] = useState<Record<string, string>>({});
  const [language, setLanguage] = useState('en');
  const [tabLayout, setTabLayout] = useState<'horizontal' | 'vertical'>('horizontal');
  const [viewMode, setViewMode] = useState<'split' | 'editor' | 'preview'>('split');
  const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);

  // New unified settings state
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [editorStatus, setEditorStatus] = useState({
    line: 1,
    column: 1,
    totalCharacters: 0,
    selectedCharacters: 0
  });
  const [fileChangeDialog, setFileChangeDialog] = useState<{
    open: boolean;
    fileName: string;
    onReload: () => void;
    onCancel: () => void;
  }>({
    open: false,
    fileName: '',
    onReload: () => {},
    onCancel: () => {},
  });
  const [saveBeforeCloseDialog, setSaveBeforeCloseDialog] = useState<{
    open: boolean;
    fileName: string;
    tabId: string | null;
  }>({
    open: false,
    fileName: '',
    tabId: null,
  });
  const [isDragOver, setIsDragOver] = useState(false);

  // Update state
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [updateDialogPhase, setUpdateDialogPhase] = useState<UpdateDialogPhase>('notify');
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [updateDownloadProgress, setUpdateDownloadProgress] = useState<DownloadProgress | null>(null);
  const pendingUpdateRef = useRef<Update | null>(null);

  // Tab management
  const {
    tabs,
    activeTabId,
    activeTab,
    isInitialized,
    removeTab,
    setActiveTab,
    updateTabContent,
    updateTabFileHash,
    reorderTabs,
    openFile,
    saveTab,
    saveTabAs,
    createNewTab,
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

  const currentTheme = getThemeByName(theme);

  // Update settings when zoom level changes
  useEffect(() => {
    if (isSettingsLoaded && appSettings.interface.zoomLevel !== currentZoom) {
      const updatedSettings = {
        ...appSettings,
        interface: {
          ...appSettings.interface,
          zoomLevel: currentZoom,
        },
      };
      setAppSettings(updatedSettings);
      // Don't persist (only persist when user explicitly changes settings)
    }
  }, [currentZoom, isSettingsLoaded, appSettings]);

  // Initial settings load (runs once)
  useEffect(() => {
    const loadSettings = async () => {
      try {

        // Load with new unified settings system
        const settings = await storeApi.loadAppSettings();
        setAppSettings(settings);

        // Also update individual settings (for backward compatibility)
        setLanguage(settings.interface.language);
        i18n.changeLanguage(settings.interface.language);

        setTheme(settings.appearance.theme as ThemeName);
        applyThemeToDocument(settings.appearance.theme as ThemeName);

        setGlobalVariables(settings.globalVariables);
        setTabLayout(settings.interface.tabLayout);

        setIsSettingsLoaded(true);
      } catch (error) {
        console.error('Failed to load settings:', error);
        setIsSettingsLoaded(true);
      }
    };

    // Wait for useTabsDesktop initialization
    if (isInitialized) {
      loadSettings();
    }
  }, [isInitialized]);

  // Auto-check for updates after initialization
  useEffect(() => {
    if (!isInitialized || !isSettingsLoaded) return;

    const checkUpdate = async () => {
      try {
        const { info, update } = await updaterApi.checkForUpdate();
        if (info.available && update) {
          setUpdateInfo(info);
          pendingUpdateRef.current = update;
          setUpdateDialogPhase('notify');
          setUpdateDialogOpen(true);
        }
      } catch (error) {
        console.warn('Update check failed:', error);
      }
    };

    checkUpdate();
  }, [isInitialized, isSettingsLoaded]);

  // File change detection event listener
  useEffect(() => {
    const handleFileChangeDetected = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { fileName, onCancel, tabId } = customEvent.detail;
      setFileChangeDialog({
        open: true,
        fileName,
        onReload: async () => {
          try {
            // Get tab info (referencing latest tabs)
            const currentTabs = tabs;
            const tab = currentTabs.find(t => t.id === tabId);

            if (tab && tab.filePath && !tab.isNew) {
              // Load latest content from file
              const fileContent = await desktopApi.readFileFromPath(tab.filePath);

              // Update tab
              updateTabContent(tabId, fileContent);

              // Update file hash info
              try {
                const newHashInfo = await desktopApi.getFileHash(tab.filePath);
                updateTabFileHash(tabId, newHashInfo);
              } catch (error) {
                console.warn('Failed to update file hash after reload:', error);
              }
            }
            // Activate tab
            setActiveTab(tabId);
          } catch (error) {
            console.error('Failed to reload file:', error);
          }
          setFileChangeDialog(prev => ({ ...prev, open: false }));
        },
        onCancel: async () => {
          onCancel();
          // Update file info on cancel to prevent loop
          try {
            const currentTabs = tabs;
            const tab = currentTabs.find(t => t.id === tabId);
            if (tab && tab.filePath && !tab.isNew) {
              const newHashInfo = await desktopApi.getFileHash(tab.filePath);
              updateTabFileHash(tabId, newHashInfo);
            }
          } catch (error) {
            console.warn('Failed to update file hash after cancel:', error);
          }
          // Activate tab
          setActiveTab(tabId);
          setFileChangeDialog(prev => ({ ...prev, open: false }));
        },
      });
    };

    window.addEventListener('fileChangeDetected', handleFileChangeDetected);

    return () => {
      window.removeEventListener('fileChangeDetected', handleFileChangeDetected);
    };
  }, [updateTabContent, updateTabFileHash, setActiveTab, isInitialized]);

  // Common file change detection handler
  const checkFileChange = useCallback(async (tab: Tab, source: string) => {
    if (!tab || tab.isNew || !tab.filePath) return;

    try {
      const hasChanged = await detectFileChange(tab);
      if (hasChanged) {
        // Fire file change detection event
        const event = new CustomEvent('fileChangeDetected', {
          detail: {
            fileName: tab.title,
            tabId: tab.id,
            onReload: async () => {
              try {
                // Load latest content from file
                const fileContent = await desktopApi.readFileFromPath(tab.filePath!);

                // Update tab
                updateTabContent(tab.id, fileContent);

                // Update file hash info
                const newHashInfo = await desktopApi.getFileHash(tab.filePath!);
                updateTabFileHash(tab.id, newHashInfo);

                // Activate tab
                setActiveTab(tab.id);
              } catch (error) {
                console.error('Failed to reload file:', error);
              }
            },
            onCancel: async () => {
              // Update file info on cancel to prevent loop
              try {
                const newHashInfo = await desktopApi.getFileHash(tab.filePath!);
                updateTabFileHash(tab.id, newHashInfo);
              } catch (error) {
                console.warn('Failed to update file hash after cancel:', error);
              }
              // Activate tab
              setActiveTab(tab.id);
            },
          },
        });
        window.dispatchEvent(event);
      }
    } catch (error) {
      console.warn(`Failed to check file change during ${source}:`, error);
    }
  }, [updateTabContent, updateTabFileHash, setActiveTab]);

  // File change check on tab switch (disabled)
  // useEffect(() => {
  //   if (!isInitialized || !activeTab) return;
  //
  //   checkFileChange(activeTab, 'tab switch');
  // }, [isInitialized, activeTab, checkFileChange]);

  // Periodic file change check (every 5 seconds)
  useEffect(() => {
    if (!isInitialized) return;

    const interval = setInterval(async () => {
      // Check file changes for the active tab
      if (activeTab && !activeTab.isNew && activeTab.filePath) {
        await checkFileChange(activeTab, 'periodic check');
      }
    }, 5000); // 5-second interval

    return () => clearInterval(interval);
  }, [isInitialized, activeTab, checkFileChange]);

  // Save language setting
  useEffect(() => {
    if (!isSettingsLoaded) return; // Don't save during initial load

    const saveLanguage = async () => {
      try {
        await storeApi.saveLanguage(language);
      } catch (error) {
        console.error('Failed to save language:', error);
      }
    };

    saveLanguage();
  }, [language, isSettingsLoaded]);

  // Save theme setting
  useEffect(() => {
    if (!isSettingsLoaded) return; // Don't save during initial load

    const saveTheme = async () => {
      try {
        await storeApi.saveTheme(theme);
      } catch (error) {
        console.error('Failed to save theme:', error);
      }
    };

    saveTheme();
  }, [theme, isSettingsLoaded]);

  // Save global variables
  useEffect(() => {
    if (!isSettingsLoaded) return; // Don't save during initial load

    const saveGlobalVariables = async () => {
      try {
        await storeApi.saveGlobalVariables(globalVariables);
      } catch (error) {
        console.error('Failed to save global variables:', error);
      }
    };

    if (Object.keys(globalVariables).length > 0) {
      saveGlobalVariables();
    }
  }, [globalVariables, isSettingsLoaded]);

  // Save tab layout setting
  useEffect(() => {
    if (!isSettingsLoaded) return; // Don't save during initial load

    const saveTabLayout = async () => {
      try {
        await storeApi.saveTabLayout(tabLayout);
      } catch (error) {
        console.error('Failed to save tab layout:', error);
      }
    };

    saveTabLayout();
  }, [tabLayout, isSettingsLoaded]);

  // Save view mode setting
  useEffect(() => {
    if (!isSettingsLoaded) return; // Don't save during initial load

    const saveViewMode = async () => {
      try {
        await storeApi.saveViewMode(viewMode);
      } catch (error) {
        console.error('Failed to save view mode:', error);
      }
    };

    saveViewMode();
  }, [viewMode, isSettingsLoaded]);

  // Create initial tab
  useEffect(() => {
    if (tabs.length === 0) {
      createNewTab();
    }
  }, [tabs.length, createNewTab]);

  // Auto-save: debounced save for modified tabs with file paths
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isSettingsLoaded || !isInitialized || !appSettings.advanced.autoSave) return;
    if (!activeTab || !activeTab.isModified || activeTab.isNew || !activeTab.filePath) return;

    // Clear previous timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Debounce: save after 3 seconds of inactivity
    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        const success = await saveTab(activeTab.id);
        if (success) {
          setSnackbar({ open: true, message: t('fileOperations.fileSaved'), severity: 'success' });
        }
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }, 3000);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [activeTab?.content, activeTab?.id, activeTab?.isModified, activeTab?.isNew, activeTab?.filePath, appSettings.advanced.autoSave, isSettingsLoaded, isInitialized, saveTab, t]);

  // Handlers
  const handleContentChange = (content: string) => {
    if (activeTab) {
      updateTabContent(activeTab.id, content);
    }
  };

  const handleSettingsOpen = () => {
    setSettingsOpen(true);
  };

  const handleSettingsClose = () => {
    setSettingsOpen(false);
  };

  const handleHelpOpen = () => {
    setHelpOpen(true);
  };

  const handleHelpClose = () => {
    setHelpOpen(false);
  };

  const handleRecentFileSelect = async (filePath: string) => {
    try {
      await openFile(filePath);
      requestEditorFocus();
    } catch (error) {
      console.error('Failed to open recent file:', error);
      setSnackbar({ open: true, message: t('fileOperations.fileLoadFailed'), severity: 'error' });
    }
  };

  const handleRecentFilesOpen = () => {
    setRecentFilesOpen(true);
  };

  const handleRecentFilesClose = () => {
    setRecentFilesOpen(false);
  };

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    i18n.changeLanguage(newLanguage);
  };

  const handleThemeChange = (newTheme: ThemeName) => {
    setTheme(newTheme);
    applyThemeToDocument(newTheme);
  };

  // New unified settings change handler
  const handleAppSettingsChange = useCallback(async (newSettings: AppSettings) => {
    setAppSettings(newSettings);

    // Also update individual settings (for backward compatibility)
    setLanguage(newSettings.interface.language);
    i18n.changeLanguage(newSettings.interface.language);

    setTheme(newSettings.appearance.theme as ThemeName);
    applyThemeToDocument(newSettings.appearance.theme as ThemeName);

    setGlobalVariables(newSettings.globalVariables);
    setTabLayout(newSettings.interface.tabLayout);

    // If zoom level changed, also update useZoom state
    if (newSettings.interface.zoomLevel !== currentZoom) {
      // Set zoom level directly (update useZoom internal state)
      const zoomDiff = newSettings.interface.zoomLevel - currentZoom;
      if (zoomDiff > 0) {
        // Zoom in
        for (let i = 0; i < Math.abs(zoomDiff) / ZOOM_CONFIG.zoomStep; i++) {
          zoomIn();
        }
      } else if (zoomDiff < 0) {
        // Zoom out
        for (let i = 0; i < Math.abs(zoomDiff) / ZOOM_CONFIG.zoomStep; i++) {
          zoomOut();
        }
      }
    }

    // Persist settings
    await storeApi.saveAppSettings(newSettings);
  }, [i18n, currentZoom, zoomIn, zoomOut]);

  const handleFileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setFileMenuAnchor(event.currentTarget);
  };

  const handleFileMenuClose = () => {
    setFileMenuAnchor(null);
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleOpenFile = async () => {
    try {
      await openFile();
      setSnackbar({ open: true, message: t('fileOperations.fileLoaded'), severity: 'success' });
      requestEditorFocus();
    } catch {
      setSnackbar({ open: true, message: t('fileOperations.fileLoadFailed'), severity: 'error' });
    }
  };

  const handleSaveFile = async () => {
    if (activeTab) {
      try {
        const success = await saveTab(activeTab.id);
        if (success) {
          setSnackbar({ open: true, message: t('fileOperations.fileSaved'), severity: 'success' });
        } else {
          setSnackbar({ open: true, message: t('fileOperations.fileSaveFailed'), severity: 'error' });
        }
      } catch {
        setSnackbar({ open: true, message: t('fileOperations.fileSaveFailed'), severity: 'error' });
      }
    }
  };

  const handleSaveFileAs = useCallback(async () => {

    if (activeTab) {
      try {
        const success = await saveTabAs(activeTab.id);

        if (success) {
          setSnackbar({ open: true, message: t('fileOperations.fileSaved'), severity: 'success' });
        } else {
          setSnackbar({ open: true, message: t('fileOperations.fileSaveFailed'), severity: 'error' });
        }
      } catch (error) {
        console.error('Error in handleSaveFileAs:', error);
        setSnackbar({ open: true, message: t('fileOperations.fileSaveFailed'), severity: 'error' });
      }
    } else {
      setSnackbar({
        open: true,
        message: t('fileOperations.noActiveTab') || 'No active tab to save',
        severity: 'error'
      });
    }
  }, [activeTab, activeTabId, tabs, saveTabAs, setSnackbar, t]);

  const handleSaveWithVariables = useCallback(async () => {
    if (!activeTab) {
      setSnackbar({
        open: true,
        message: t('fileOperations.noActiveTab') || 'No active tab to save',
        severity: 'error'
      });
      return;
    }

    try {
      // Get content with variables expanded
      const expandedContent = await variableApi.getExpandedMarkdown(activeTab.content, globalVariables);

      // Open save dialog
      const result = await desktopApi.saveFileAs(expandedContent);
      if (result.success) {
        setSnackbar({ open: true, message: t('fileOperations.fileSaved'), severity: 'success' });
      } else {
        setSnackbar({ open: true, message: t('fileOperations.fileSaveFailed'), severity: 'error' });
      }
    } catch (error) {
      console.error('Failed to save file with variables:', error);
      setSnackbar({ open: true, message: t('fileOperations.fileSaveFailed'), severity: 'error' });
    }
  }, [activeTab, globalVariables, setSnackbar, t]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    requestEditorFocus();
  };

  const handleTabClose = (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    // Show confirmation dialog if there are changes
    if (tab.isModified) {
      setSaveBeforeCloseDialog({
        open: true,
        fileName: tab.title,
        tabId: tabId,
      });
    } else {
      // Close tab directly if no changes
      removeTab(tabId);
    }
  };

  const handleNewTab = () => {
    createNewTab();
    requestEditorFocus();
  };

  const handleSaveBeforeClose = async () => {
    if (!saveBeforeCloseDialog.tabId) return;

    try {
      const success = await saveTab(saveBeforeCloseDialog.tabId);
      if (success) {
        removeTab(saveBeforeCloseDialog.tabId);
        setSnackbar({ open: true, message: t('fileOperations.fileSaved'), severity: 'success' });
      }
      // Don't close tab if save failed or was cancelled
    } catch (error) {
      console.error('Failed to save file before closing:', error);
      setSnackbar({ open: true, message: t('fileOperations.fileSaveFailed'), severity: 'error' });
    } finally {
      setSaveBeforeCloseDialog({ open: false, fileName: '', tabId: null });
    }
  };

  const handleDontSaveBeforeClose = () => {
    if (saveBeforeCloseDialog.tabId) {
      removeTab(saveBeforeCloseDialog.tabId);
    }
    setSaveBeforeCloseDialog({ open: false, fileName: '', tabId: null });
  };

  const handleCancelBeforeClose = () => {
    setSaveBeforeCloseDialog({ open: false, fileName: '', tabId: null });
  };

  const handleTabReorder = (reorderedTabs: Tab[]) => {
    reorderTabs(reorderedTabs);
  };

  // Drag and drop handlers
  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(event.dataTransfer.files);
    const markdownFiles = files.filter(file =>
      file.name.toLowerCase().endsWith('.md') ||
      file.name.toLowerCase().endsWith('.markdown')
    );

    if (markdownFiles.length === 0) {
      setSnackbar({
        open: true,
        message: t('fileOperations.noMarkdownFiles'),
        severity: 'error'
      });
      return;
    }

    // Open the first file if multiple files
    const fileToOpen = markdownFiles[0];

    try {
      // Read file using File API
      const content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve(e.target?.result as string || '');
        };
        reader.onerror = reject;
        reader.readAsText(fileToOpen);
      });

      // Create new tab and open file
      const newTabId = createNewTab();
      updateTabContent(newTabId, content);
      requestEditorFocus();

      setSnackbar({
        open: true,
        message: t('fileOperations.fileLoaded'),
        severity: 'success'
      });
    } catch (error) {
      console.error('Failed to open dropped file:', error);
      setSnackbar({
        open: true,
        message: t('fileOperations.fileLoadFailed'),
        severity: 'error'
      });
    }
  };

  // Update handlers
  const handleCheckForUpdate = useCallback(async () => {
    if (!pendingUpdateRef.current) return;

    setUpdateDialogPhase('downloading');
    setUpdateDownloadProgress(null);

    try {
      await updaterApi.downloadAndInstall(
        pendingUpdateRef.current,
        (progress) => {
          setUpdateDownloadProgress(progress);
        },
      );
      // relaunch is called inside downloadAndInstall, so we won't reach here normally
    } catch (error) {
      console.error('Update failed:', error);
      setUpdateDialogOpen(false);
      setSnackbar({ open: true, message: t('dialogs.update.checkFailed'), severity: 'error' });
    }
  }, [t]);

  const handleDismissUpdate = useCallback(() => {
    setUpdateDialogOpen(false);
    pendingUpdateRef.current = null;
  }, []);

  // Focus editor when switching to a mode that shows the editor
  useEffect(() => {
    if (isSettingsLoaded && (viewMode === 'split' || viewMode === 'editor')) {
      const timer = setTimeout(() => {
        requestEditorFocus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [viewMode, isSettingsLoaded, requestEditorFocus]);

  // View mode rotation handler
  const rotateViewMode = useCallback(() => {
    const viewModes: ('split' | 'editor' | 'preview')[] = ['split', 'editor', 'preview'];
    const currentIndex = viewModes.indexOf(viewMode);
    const nextIndex = (currentIndex + 1) % viewModes.length;
    setViewMode(viewModes[nextIndex]);
  }, [viewMode]);

  // Direct view mode change handler
  const changeViewMode = useCallback((mode: 'split' | 'editor' | 'preview') => {
    setViewMode(mode);
  }, []);

  // Keyboard shortcuts handler
  const handleKeyDown = useCallback((event: KeyboardEvent) => {

    // Command + N: New File
    if ((event.metaKey || event.ctrlKey) && event.key === 'n') {
      event.preventDefault();
      handleNewTab();
    }
    // Command + O: Open File
    else if ((event.metaKey || event.ctrlKey) && event.key === 'o') {
      event.preventDefault();
      handleOpenFile();
    }
    // Command + S: Save
    else if ((event.metaKey || event.ctrlKey) && event.key === 's' && !event.shiftKey) {
      event.preventDefault();
      handleSaveFile();
    }
    // Command + Shift + S: Save As
    else if ((event.metaKey || event.ctrlKey) && event.key === 'S' && event.shiftKey) {
      event.preventDefault();
      handleSaveFileAs();
    }
    // Command + R: Recent Files
    else if ((event.metaKey || event.ctrlKey) && event.key === 'r') {
      event.preventDefault();
      handleRecentFilesOpen();
    }
    // F1: Help
    else if (event.key === 'F1') {
      event.preventDefault();
      handleHelpOpen();
    }
    // Command + ,: Settings
    else if ((event.metaKey || event.ctrlKey) && event.key === ',') {
      event.preventDefault();
      handleSettingsOpen();
    }
    // Ctrl + Shift + V: Rotate View Mode
    else if (event.ctrlKey && event.shiftKey && event.key === 'V') {
      event.preventDefault();
      rotateViewMode();
    }
    // Ctrl + Shift + 1: Split View
    else if (event.ctrlKey && event.shiftKey && (event.key === '1' || event.key === '!' || event.code === 'Digit1')) {
      event.preventDefault();
      changeViewMode('split');
    }
    // Ctrl + Shift + 2: Editor Only
    else if (event.ctrlKey && event.shiftKey && (event.key === '2' || event.key === '@' || event.code === 'Digit2')) {
      event.preventDefault();
      changeViewMode('editor');
    }
    // Ctrl + Shift + 3: Preview Only
    else if (event.ctrlKey && event.shiftKey && (event.key === '3' || event.key === '#' || event.code === 'Digit3')) {
      event.preventDefault();
      changeViewMode('preview');
    }
    // Ctrl + Tab: Switch Tabs (Next)
    else if (event.ctrlKey && event.key === 'Tab' && !event.shiftKey) {
      event.preventDefault();
      if (tabs.length > 1) {
        const currentIndex = tabs.findIndex(tab => tab.id === activeTabId);
        const nextIndex = (currentIndex + 1) % tabs.length;
        setActiveTab(tabs[nextIndex].id);
      }
    }
    // Ctrl + Shift + Tab: Switch Tabs (Previous)
    else if (event.ctrlKey && event.key === 'Tab' && event.shiftKey) {
      event.preventDefault();
      if (tabs.length > 1) {
        const currentIndex = tabs.findIndex(tab => tab.id === activeTabId);
        const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        setActiveTab(tabs[prevIndex].id);
      }
    }
  }, [
    handleNewTab,
    handleOpenFile,
    handleSaveFile,
    handleSaveFileAs,
    handleRecentFilesOpen,
    handleHelpOpen,
    handleSettingsOpen,
    rotateViewMode,
    changeViewMode,
    tabs,
    activeTabId,
    setActiveTab
  ]);

  // Set up keyboard shortcut event listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]); // Only include handleKeyDown dependency

  return {
    // State
    theme,
    settingsOpen,
    helpOpen,
    recentFilesOpen,
    fileMenuAnchor,
    snackbar,
    globalVariables,
    language,
    tabLayout,
    viewMode,
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

    // New unified settings
    appSettings,

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
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleCheckForUpdate,
    handleDismissUpdate,
    handleKeyDown,

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
    setGlobalVariables,
    setTabLayout,
    setViewMode,

    // Translation
    t,

    // Constants
    ZOOM_CONFIG,
  };
};