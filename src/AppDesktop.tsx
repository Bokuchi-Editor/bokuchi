import { useState, useEffect, MouseEvent } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, Box, AppBar, Toolbar, Typography, IconButton, Snackbar, Alert, Menu, MenuItem, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { FolderOpen, Save, SaveAlt, MoreVert, ViewColumn, Edit, Visibility, Add, Settings as SettingsIcon2, HelpOutline } from '@mui/icons-material';

import Editor from './components/Editor';
import Preview from './components/Preview';
import TabBar from './components/TabBar';
import Settings from './components/Settings';
import HelpDialog from './components/Help';
import StatusBar from './components/StatusBar';
import FileChangeDialog from './components/FileChangeDialog';
import { useTabsDesktop } from './hooks/useTabsDesktop';
import { storeApi } from './api/storeApi';
import { variableApi } from './api/variableApi';
import { detectFileChange } from './utils/fileChangeDetection';
import { desktopApi } from './api/desktopApi';
import { useTranslation } from 'react-i18next';
import { ThemeName, getThemeByName, applyThemeToDocument } from './themes';
import { useZoom } from './hooks/useZoom';
import { ZOOM_CONFIG } from './constants/zoom';
import './i18n';

import './App.css';

function AppDesktop() {
  const { t, i18n } = useTranslation();
  const [theme, setTheme] = useState<ThemeName>('default');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
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

  const {
    tabs,
    activeTabId,
    activeTab,
    isInitialized,
    removeTab,
    setActiveTab,
    updateTabContent,
    updateTabFileHash,
    openFile,
    saveTab,
    saveTabAs,
    createNewTab,
  } = useTabsDesktop();

  const currentTheme = getThemeByName(theme);

  // ズーム機能の初期化
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

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    i18n.changeLanguage(newLanguage);
  };

  const handleThemeChange = (newTheme: ThemeName) => {
    setTheme(newTheme);
    applyThemeToDocument(newTheme);
  };

  // 設定の初期読み込み（一度だけ実行）
  useEffect(() => {
    const loadSettings = async () => {
      try {
        console.log('Loading settings...');

        // 言語設定を読み込み
        const savedLanguage = await storeApi.loadLanguage();
        console.log('Loaded saved language:', savedLanguage);
        setLanguage(savedLanguage);
        i18n.changeLanguage(savedLanguage);

        // テーマ設定を読み込み
        const savedTheme = await storeApi.loadTheme();
        console.log('Loaded saved theme:', savedTheme);
        const themeToSet = savedTheme || 'default';
        setTheme(themeToSet);
        applyThemeToDocument(themeToSet);

        // グローバル変数を読み込み
        const variables = await storeApi.loadGlobalVariables();
        console.log('Loaded saved global variables:', variables);
        setGlobalVariables(variables);

        // タブレイアウト設定を読み込み
        const savedTabLayout = await storeApi.loadTabLayout();
        console.log('Loaded saved tab layout:', savedTabLayout);
        setTabLayout(savedTabLayout);

        // ビューモード設定を読み込み
        const savedViewMode = await storeApi.loadViewMode();
        console.log('Loaded saved view mode:', savedViewMode);
        setViewMode(savedViewMode);

        setIsSettingsLoaded(true);
        console.log('Settings loaded successfully');
      } catch (error) {
        console.error('Failed to load settings:', error);
        setIsSettingsLoaded(true);
      }
    };

    loadSettings();
  }, []);

  // ファイル変更検出イベントリスナー
  useEffect(() => {
    const handleFileChangeDetected = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { fileName, onReload, onCancel, tabId } = customEvent.detail;
      setFileChangeDialog({
        open: true,
        fileName,
        onReload: async () => {
          console.log('File change dialog: Reload button clicked');
          try {
            // ファイルから最新のコンテンツを読み込み
            const tab = tabs.find(t => t.id === tabId);
            if (tab && tab.filePath && !tab.isNew) {
              const newContent = await desktopApi.readFileFromPath(tab.filePath);
              console.log('Loaded new content from file:', newContent.length, 'characters');
              onReload(newContent);
            } else {
              console.error('Tab not found or invalid:', { tabId, tab, hasFilePath: tab?.filePath, isNew: tab?.isNew });
            }
          } catch (error) {
            console.error('Failed to reload file:', error);
          }
          setFileChangeDialog(prev => ({ ...prev, open: false }));
        },
        onCancel: () => {
          onCancel();
          setFileChangeDialog(prev => ({ ...prev, open: false }));
        },
      });
    };

    window.addEventListener('fileChangeDetected', handleFileChangeDetected);

    return () => {
      window.removeEventListener('fileChangeDetected', handleFileChangeDetected);
    };
  }, [tabs, activeTabId]);

  // 定期的なファイル変更チェック（5秒間隔）
  useEffect(() => {
    if (!isInitialized) return;

    const interval = setInterval(async () => {
      // アクティブなタブのファイル変更をチェック
      if (activeTab && !activeTab.isNew && activeTab.filePath) {
        try {
          const hasChanged = await detectFileChange(activeTab);
          if (hasChanged) {
            console.log('File change detected during periodic check:', activeTab.filePath);
            // ファイル変更検出イベントを発火
            const event = new CustomEvent('fileChangeDetected', {
              detail: {
                fileName: activeTab.title,
                tabId: activeTab.id,
                onReload: async (newContent: string) => {
                  console.log('Reloading file from periodic check:', newContent.length, 'characters');
                  updateTabContent(activeTab.id, newContent);
                  // ファイルハッシュ情報を更新
                  try {
                    const newHashInfo = await desktopApi.getFileHash(activeTab.filePath!);
                    updateTabFileHash(activeTab.id, newHashInfo);
                    console.log('File hash updated after periodic reload:', newHashInfo);
                  } catch (error) {
                    console.warn('Failed to update file hash after periodic reload:', error);
                  }
                },
                onCancel: () => {
                  console.log('File change reload cancelled during periodic check');
                },
              },
            });
            window.dispatchEvent(event);
          }
        } catch (error) {
          console.warn('Failed to check file change during periodic check:', error);
        }
      }
    }, 5000); // 5秒間隔

    return () => clearInterval(interval);
  }, [isInitialized, activeTab, updateTabContent, updateTabFileHash]);

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

  const handleTabClose = async (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (tab && tab.isModified) {
      // 変更がある場合は確認ダイアログを表示
      if (window.confirm(t('dialogs.saveChanges'))) {
        const success = await saveTab(tabId);
        if (success) {
          removeTab(tabId);
        }
      } else {
        removeTab(tabId);
      }
    } else {
      removeTab(tabId);
    }
  };

  const handleNewTab = () => {
    createNewTab();
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleFileMenuOpen = (event: MouseEvent<HTMLElement>) => {
    setFileMenuAnchor(event.currentTarget);
  };

  const handleFileMenuClose = () => {
    setFileMenuAnchor(null);
  };

  // ショートカットキーのハンドラー
  const handleKeyDown = (event: KeyboardEvent) => {
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
  };

  // ショートカットキーのイベントリスナーを設定
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeTab]); // activeTabが変更されたときにハンドラーを更新

  // 初期タブを作成
  useEffect(() => {
    if (tabs.length === 0) {
      createNewTab();
    }
  }, [tabs.length, createNewTab]);

  return (
    <ThemeProvider theme={currentTheme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              {t('app.title')}
            </Typography>

            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_, newViewMode) => {
                if (newViewMode !== null) {
                  setViewMode(newViewMode);
                }
              }}
              size="small"
              sx={{ mr: 1 }}
            >
              <ToggleButton value="split" aria-label={t('buttons.splitView')}>
                <ViewColumn />
              </ToggleButton>
              <ToggleButton value="editor" aria-label={t('buttons.editorOnly')}>
                <Edit />
              </ToggleButton>
              <ToggleButton value="preview" aria-label={t('buttons.previewOnly')}>
                <Visibility />
              </ToggleButton>
            </ToggleButtonGroup>

            <IconButton
              color="inherit"
              onClick={handleFileMenuOpen}
            >
              <MoreVert />
            </IconButton>
          </Toolbar>
        </AppBar>

        {/* File Menu */}
        <Menu
          anchorEl={fileMenuAnchor}
          open={Boolean(fileMenuAnchor)}
          onClose={handleFileMenuClose}
        >
          <MenuItem onClick={() => { handleNewTab(); handleFileMenuClose(); }}>
            <Add sx={{ mr: 1 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <span>{t('buttons.newFile')}</span>
              <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                {t('shortcuts.newFile')}
              </Typography>
            </Box>
          </MenuItem>
          <MenuItem onClick={() => { handleOpenFile(); handleFileMenuClose(); }}>
            <FolderOpen sx={{ mr: 1 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <span>{t('buttons.openFile')}</span>
              <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                {t('shortcuts.openFile')}
              </Typography>
            </Box>
          </MenuItem>
          <MenuItem
            onClick={() => { handleSaveFile(); handleFileMenuClose(); }}
            disabled={!activeTab}
          >
            <Save sx={{ mr: 1 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <span>{t('buttons.save')}</span>
              <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                {t('shortcuts.save')}
              </Typography>
            </Box>
          </MenuItem>
          <MenuItem
            onClick={() => { handleSaveFileAs(); handleFileMenuClose(); }}
            disabled={!activeTab}
          >
            <SaveAlt sx={{ mr: 1 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <span>{t('buttons.saveAs')}</span>
              <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                {t('shortcuts.saveAs')}
              </Typography>
            </Box>
          </MenuItem>
          <MenuItem
            onClick={() => { handleSaveWithVariables(); handleFileMenuClose(); }}
            disabled={!activeTab}
          >
            <SaveAlt sx={{ mr: 1 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <span>{t('buttons.saveWithVariables')}</span>
            </Box>
          </MenuItem>
          <MenuItem onClick={() => { handleSettingsOpen(); handleFileMenuClose(); }}>
            <SettingsIcon2 sx={{ mr: 1 }} />
            {t('buttons.settings')}
          </MenuItem>
          <MenuItem onClick={() => { handleHelpOpen(); handleFileMenuClose(); }}>
            <HelpOutline sx={{ mr: 1 }} />
            {t('help.title')}
          </MenuItem>
        </Menu>

        {activeTab && (
          <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            {tabLayout === 'vertical' && (
              <TabBar
                tabs={tabs}
                activeTabId={activeTabId}
                onTabChange={handleTabChange}
                onTabClose={handleTabClose}
                onNewTab={handleNewTab}
                layout={tabLayout}
              />
            )}
            <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              {tabLayout === 'horizontal' && (
                <TabBar
                  tabs={tabs}
                  activeTabId={activeTabId}
                  onTabChange={handleTabChange}
                  onTabClose={handleTabClose}
                  onNewTab={handleNewTab}
                  layout={tabLayout}
                />
              )}
              <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                {viewMode === 'split' && (
                  <>
                    <Box sx={{ flex: 1, borderRight: 1, borderColor: 'divider' }}>
                      <Editor
                        content={activeTab.content}
                        onChange={handleContentChange}
                        darkMode={theme === 'dark'}
                        theme={theme}
                        onStatusChange={setEditorStatus}
                        zoomLevel={currentZoom}
                        fileNotFound={
                          activeTab.isNew && activeTab.filePath
                            ? {
                                filePath: activeTab.filePath,
                                onClose: () => handleTabClose(activeTab.id),
                              }
                            : undefined
                        }
                      />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Preview
                        content={activeTab.content}
                        darkMode={theme === 'dark'}
                        theme={theme}
                        globalVariables={globalVariables}
                        zoomLevel={currentZoom}
                      />
                    </Box>
                  </>
                )}
                {viewMode === 'editor' && (
                  <Box sx={{ flex: 1 }}>
                                        <Editor
                      content={activeTab.content}
                      onChange={handleContentChange}
                      darkMode={theme === 'dark'}
                      theme={theme}
                      onStatusChange={setEditorStatus}
                      zoomLevel={currentZoom}
                      fileNotFound={
                        activeTab.isNew && activeTab.filePath
                          ? {
                              filePath: activeTab.filePath,
                              onClose: () => handleTabClose(activeTab.id),
                            }
                          : undefined
                        }
                      />
                  </Box>
                )}
                {viewMode === 'preview' && (
                  <Box sx={{ flex: 1 }}>
                    <Preview
                      content={activeTab.content}
                      darkMode={theme === 'dark'}
                      theme={theme}
                      globalVariables={globalVariables}
                      zoomLevel={currentZoom}
                    />
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
        )}

        {!isInitialized && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
            <Typography variant="h6" color="text.secondary">
              {t('app.loading')}
            </Typography>
          </Box>
        )}

        {isInitialized && !activeTab && tabs.length === 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
            <Typography variant="h6" color="text.secondary">
              {t('app.noTabsOpen')}
            </Typography>
          </Box>
        )}

        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
        >
          <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
            {snackbar.message}
          </Alert>
        </Snackbar>

        {/* ズーム制限警告 */}
        <Snackbar
          open={isAtLimit}
          autoHideDuration={2000}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert severity="warning" sx={{ width: '100%' }}>
            {currentZoom >= ZOOM_CONFIG.maxZoom
              ? t('zoom.maxLimitReached', { maxZoom: ZOOM_CONFIG.maxZoom * 100 })
              : t('zoom.minLimitReached', { minZoom: ZOOM_CONFIG.minZoom * 100 })
            }
          </Alert>
        </Snackbar>

        <Settings
          open={settingsOpen}
          onClose={handleSettingsClose}
          theme={theme}
          onThemeChange={handleThemeChange}
          globalVariables={globalVariables}
          onGlobalVariablesChange={setGlobalVariables}
          language={language}
          onLanguageChange={handleLanguageChange}
          tabLayout={tabLayout}
          onTabLayoutChange={setTabLayout}
        />

        <HelpDialog
          open={helpOpen}
          onClose={handleHelpClose}
        />

        <FileChangeDialog
          open={fileChangeDialog.open}
          fileName={fileChangeDialog.fileName}
          onReload={fileChangeDialog.onReload}
          onCancel={fileChangeDialog.onCancel}
        />

        {/* ステータスバー */}
        <StatusBar
          line={editorStatus.line}
          column={editorStatus.column}
          totalCharacters={editorStatus.totalCharacters}
          selectedCharacters={editorStatus.selectedCharacters}
          darkMode={theme === 'dark'}
          theme={theme}
          onThemeChange={handleThemeChange}
          zoomPercentage={zoomPercentage}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onResetZoom={resetZoom}
          canZoomIn={canZoomIn}
          canZoomOut={canZoomOut}
        />
      </Box>
    </ThemeProvider>
  );
}

export default AppDesktop;
