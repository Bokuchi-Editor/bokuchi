import React, { useState, useEffect, useCallback } from 'react';
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

export const useAppState = () => {
  const { t, i18n } = useTranslation();

  // Basic state
  const [theme, setTheme] = useState<ThemeName>('default');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [recentFilesOpen, setRecentFilesOpen] = useState(false);
  const [fileMenuAnchor, setFileMenuAnchor] = useState<null | HTMLElement>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
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

  const currentTheme = getThemeByName(theme);

  // ズームレベルが変更された時に設定も更新
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
      // 永続化はしない（ユーザーが明示的に設定を変更した時のみ永続化）
    }
  }, [currentZoom, isSettingsLoaded, appSettings]);

  // 設定の初期読み込み（一度だけ実行）
  useEffect(() => {
    const loadSettings = async () => {
      try {
        console.log('Loading settings...');

        // 新しい統合設定システムで読み込み
        const settings = await storeApi.loadAppSettings();
        console.log('Loaded app settings:', settings);
        setAppSettings(settings);

        // 個別設定も更新（後方互換性のため）
        setLanguage(settings.interface.language);
        i18n.changeLanguage(settings.interface.language);

        setTheme(settings.appearance.theme as ThemeName);
        applyThemeToDocument(settings.appearance.theme as ThemeName);

        setGlobalVariables(settings.globalVariables);
        setTabLayout(settings.interface.tabLayout);

        setIsSettingsLoaded(true);
        console.log('Settings loaded successfully');
      } catch (error) {
        console.error('Failed to load settings:', error);
        setIsSettingsLoaded(true);
      }
    };

    // useTabsDesktopの初期化を待つ
    if (isInitialized) {
      loadSettings();
    }
  }, [isInitialized]);

  // ファイル変更検出イベントリスナー
  useEffect(() => {
    const handleFileChangeDetected = (event: Event) => {
      console.log('🔍 [DEBUG] File change detected event received:', event);
      const customEvent = event as CustomEvent;
      const { fileName, onCancel, tabId } = customEvent.detail;
      console.log('🔍 [DEBUG] Event details:', { fileName, tabId });
      setFileChangeDialog({
        open: true,
        fileName,
        onReload: async () => {
          console.log('🔍 [DEBUG] onReload called for tabId:', tabId);
          try {
            // タブ情報を取得（最新のtabsを参照）
            const currentTabs = tabs;
            const tab = currentTabs.find(t => t.id === tabId);
            console.log('🔍 [DEBUG] Found tab:', tab);

            if (tab && tab.filePath && !tab.isNew) {
              // ファイルから最新のコンテンツを読み込み
              const fileContent = await desktopApi.readFileFromPath(tab.filePath);

              // タブを更新
              updateTabContent(tabId, fileContent);

              // ファイルハッシュ情報を更新
              try {
                const newHashInfo = await desktopApi.getFileHash(tab.filePath);
                updateTabFileHash(tabId, newHashInfo);
              } catch (error) {
                console.warn('Failed to update file hash after reload:', error);
              }
            }
            // タブをアクティブにする
            setActiveTab(tabId);
          } catch (error) {
            console.error('Failed to reload file:', error);
          }
          console.log('🔍 [DEBUG] Closing dialog after reload');
          setFileChangeDialog(prev => ({ ...prev, open: false }));
        },
        onCancel: async () => {
          console.log('🔍 [DEBUG] onCancel called for tabId:', tabId);
          onCancel();
          // キャンセル時もファイル情報を更新してループ防止
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
          // タブをアクティブにする
          setActiveTab(tabId);
          console.log('🔍 [DEBUG] Closing dialog after cancel');
          setFileChangeDialog(prev => ({ ...prev, open: false }));
        },
      });
    };

    window.addEventListener('fileChangeDetected', handleFileChangeDetected);

    // ファイル開くイベントのリスナー
    const handleOpenFile = async (event: { payload: { file_path: string } }) => {
      const { file_path } = event.payload;
      console.log('Opening file from command line:', file_path);
      console.log('Current tabs before opening:', tabs.map(t => ({ id: t.id, filePath: t.filePath, title: t.title })));

      try {
        // ファイルを開く
        await openFile(file_path);
        console.log('File opened successfully:', file_path);
        setSnackbar({
          open: true,
          message: `Opened file: ${file_path}`,
          severity: 'success'
        });
      } catch (error) {
        console.error('Failed to open file:', error);
        setSnackbar({
          open: true,
          message: `Failed to open file: ${error}`,
          severity: 'error'
        });
      }
    };

    // Tauriのイベントリスナーを設定
    let unlisten: (() => void) | undefined;

    const setupTauriListener = async () => {
      const { listen } = await import('@tauri-apps/api/event');
      unlisten = await listen('open-file', handleOpenFile);
    };

    setupTauriListener();

    return () => {
      window.removeEventListener('fileChangeDetected', handleFileChangeDetected);
      if (unlisten) {
        unlisten();
      }
    };
  }, [updateTabContent, updateTabFileHash, setActiveTab, isInitialized]);

  // ファイル変更検知の共通処理
  const checkFileChange = useCallback(async (tab: Tab, source: string) => {
    if (!tab || tab.isNew || !tab.filePath) return;

    try {
      const hasChanged = await detectFileChange(tab);
      if (hasChanged) {
        console.log('🔍 [DEBUG] File change detected, dispatching event from:', source, 'for tab:', tab.id);
        // ファイル変更検出イベントを発火
        const event = new CustomEvent('fileChangeDetected', {
          detail: {
            fileName: tab.title,
            tabId: tab.id,
            onReload: async () => {
              console.log('🔍 [DEBUG] onReload called from checkFileChange for tab:', tab.id);
              try {
                // ファイルから最新のコンテンツを読み込み
                const fileContent = await desktopApi.readFileFromPath(tab.filePath!);

                // タブを更新
                updateTabContent(tab.id, fileContent);

                // ファイルハッシュ情報を更新
                const newHashInfo = await desktopApi.getFileHash(tab.filePath!);
                updateTabFileHash(tab.id, newHashInfo);

                // タブをアクティブにする
                setActiveTab(tab.id);
              } catch (error) {
                console.error('Failed to reload file:', error);
              }
            },
            onCancel: async () => {
              console.log('🔍 [DEBUG] onCancel called from checkFileChange for tab:', tab.id);
              // キャンセル時もファイル情報を更新してループ防止
              try {
                const newHashInfo = await desktopApi.getFileHash(tab.filePath!);
                updateTabFileHash(tab.id, newHashInfo);
              } catch (error) {
                console.warn('Failed to update file hash after cancel:', error);
              }
              // タブをアクティブにする
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

  // タブ切り替え時のファイル変更チェック（無効化）
  // useEffect(() => {
  //   if (!isInitialized || !activeTab) return;
  //
  //   checkFileChange(activeTab, 'tab switch');
  // }, [isInitialized, activeTab, checkFileChange]);

  // 定期的なファイル変更チェック（5秒間隔）
  useEffect(() => {
    if (!isInitialized) return;

    const interval = setInterval(async () => {
      // アクティブなタブのファイル変更をチェック
      if (activeTab && !activeTab.isNew && activeTab.filePath) {
        await checkFileChange(activeTab, 'periodic check');
      }
    }, 5000); // 5秒間隔

    return () => clearInterval(interval);
  }, [isInitialized, activeTab, checkFileChange]);

  // 言語設定の保存
  useEffect(() => {
    if (!isSettingsLoaded) return; // 初期読み込み中は保存しない

    const saveLanguage = async () => {
      try {
        console.log('Saving language:', language);
        await storeApi.saveLanguage(language);
      } catch (error) {
        console.error('Failed to save language:', error);
      }
    };

    saveLanguage();
  }, [language, isSettingsLoaded]);

  // テーマ設定の保存
  useEffect(() => {
    if (!isSettingsLoaded) return; // 初期読み込み中は保存しない

    const saveTheme = async () => {
      try {
        console.log('Saving theme:', theme);
        await storeApi.saveTheme(theme);
      } catch (error) {
        console.error('Failed to save theme:', error);
      }
    };

    saveTheme();
  }, [theme, isSettingsLoaded]);

  // グローバル変数の保存
  useEffect(() => {
    if (!isSettingsLoaded) return; // 初期読み込み中は保存しない

    const saveGlobalVariables = async () => {
      try {
        console.log('Saving global variables:', globalVariables);
        await storeApi.saveGlobalVariables(globalVariables);
      } catch (error) {
        console.error('Failed to save global variables:', error);
      }
    };

    if (Object.keys(globalVariables).length > 0) {
      saveGlobalVariables();
    }
  }, [globalVariables, isSettingsLoaded]);

  // タブレイアウト設定の保存
  useEffect(() => {
    if (!isSettingsLoaded) return; // 初期読み込み中は保存しない

    const saveTabLayout = async () => {
      try {
        console.log('Saving tab layout:', tabLayout);
        await storeApi.saveTabLayout(tabLayout);
      } catch (error) {
        console.error('Failed to save tab layout:', error);
      }
    };

    saveTabLayout();
  }, [tabLayout, isSettingsLoaded]);

  // ビューモード設定の保存
  useEffect(() => {
    if (!isSettingsLoaded) return; // 初期読み込み中は保存しない

    const saveViewMode = async () => {
      try {
        console.log('Saving view mode:', viewMode);
        await storeApi.saveViewMode(viewMode);
      } catch (error) {
        console.error('Failed to save view mode:', error);
      }
    };

    saveViewMode();
  }, [viewMode, isSettingsLoaded]);

  // 初期タブを作成
  useEffect(() => {
    if (tabs.length === 0) {
      createNewTab();
    }
  }, [tabs.length, createNewTab]);

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

  // 新しい統合設定変更ハンドラー
  const handleAppSettingsChange = useCallback(async (newSettings: AppSettings) => {
    console.log('Saving app settings:', newSettings);
    setAppSettings(newSettings);

    // 個別設定も更新（後方互換性のため）
    setLanguage(newSettings.interface.language);
    i18n.changeLanguage(newSettings.interface.language);

    setTheme(newSettings.appearance.theme as ThemeName);
    applyThemeToDocument(newSettings.appearance.theme as ThemeName);

    setGlobalVariables(newSettings.globalVariables);
    setTabLayout(newSettings.interface.tabLayout);

    // ズームレベルが変更された場合、useZoomの状態も更新
    if (newSettings.interface.zoomLevel !== currentZoom) {
      // ズームレベルを直接設定（useZoomの内部状態を更新）
      const zoomDiff = newSettings.interface.zoomLevel - currentZoom;
      if (zoomDiff > 0) {
        // ズームイン
        for (let i = 0; i < Math.abs(zoomDiff) / ZOOM_CONFIG.zoomStep; i++) {
          zoomIn();
        }
      } else if (zoomDiff < 0) {
        // ズームアウト
        for (let i = 0; i < Math.abs(zoomDiff) / ZOOM_CONFIG.zoomStep; i++) {
          zoomOut();
        }
      }
    }

    // 設定を永続化
    await storeApi.saveAppSettings(newSettings);
    console.log('App settings saved successfully');
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
    } catch (error) {
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
      } catch (error) {
        setSnackbar({ open: true, message: t('fileOperations.fileSaveFailed'), severity: 'error' });
      }
    }
  };

  const handleSaveFileAs = async () => {
    console.log('handleSaveFileAs called');
    console.log('activeTab:', activeTab);

    if (activeTab) {
      try {
        console.log('Calling saveTabAs with id:', activeTab.id);
        const success = await saveTabAs(activeTab.id);
        console.log('saveTabAs result:', success);

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
      console.log('No active tab');
    }
  };

  const handleSaveWithVariables = async () => {
    if (!activeTab) return;

    try {
      // 変数展開済みのコンテンツを取得
      const expandedContent = await variableApi.getExpandedMarkdown(activeTab.content, globalVariables);

      // 保存ダイアログを開く
      const result = await desktopApi.saveFileAs(expandedContent);
      if (result.success) {
        setSnackbar({ open: true, message: t('fileOperations.fileSaved'), severity: 'success' });
        console.log('File saved with variables applied:', result.filePath);
      } else {
        setSnackbar({ open: true, message: t('fileOperations.fileSaveFailed'), severity: 'error' });
      }
    } catch (error) {
      console.error('Failed to save file with variables:', error);
      setSnackbar({ open: true, message: t('fileOperations.fileSaveFailed'), severity: 'error' });
    }
  };

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
  };

  const handleTabClose = (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    // 変更がある場合は確認ダイアログを表示
    if (tab.isModified) {
      setSaveBeforeCloseDialog({
        open: true,
        fileName: tab.title,
        tabId: tabId,
      });
    } else {
      // 変更がない場合はそのままタブを閉じる
      removeTab(tabId);
    }
  };

  const handleNewTab = () => {
    createNewTab();
  };

  const handleSaveBeforeClose = async () => {
    if (!saveBeforeCloseDialog.tabId) return;

    try {
      const success = await saveTab(saveBeforeCloseDialog.tabId);
      if (success) {
        removeTab(saveBeforeCloseDialog.tabId);
        setSnackbar({ open: true, message: t('fileOperations.fileSaved'), severity: 'success' });
      }
      // 保存に失敗した場合やキャンセルされた場合はタブを閉じない
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

    // 複数ファイルの場合は最初のファイルを開く
    const fileToOpen = markdownFiles[0];

    try {
      // File APIを使用してファイルを読み込む
      const content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve(e.target?.result as string || '');
        };
        reader.onerror = reject;
        reader.readAsText(fileToOpen);
      });

      // 新しいタブを作成してファイルを開く
      const newTabId = createNewTab();
      updateTabContent(newTabId, content);

      // ファイル名を設定（パスは含めない）
      const fileName = fileToOpen.name;
      console.log('Opened file via drag and drop:', fileName);

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

  // ショートカットキーのイベントリスナーを設定
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]); // handleKeyDownの依存関係のみを含める

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