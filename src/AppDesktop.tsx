import { useState, useEffect, MouseEvent } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box, AppBar, Toolbar, Typography, IconButton, Snackbar, Alert, Menu, MenuItem, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { FolderOpen, Save, SaveAlt, MoreVert, ViewColumn, Edit, Visibility, Add, Settings as SettingsIcon2, HelpOutline } from '@mui/icons-material';

import Editor from './components/Editor';
import Preview from './components/Preview';
import TabBar from './components/TabBar';
import Settings from './components/Settings';
import HelpDialog from './components/Help';
import { useTabsDesktop } from './hooks/useTabsDesktop';
import { storeApi } from './api/storeApi';
import { variableApi } from './api/variableApi';
import { desktopApi } from './api/desktopApi';
import { useTranslation } from 'react-i18next';
import './i18n';

import './App.css';

function AppDesktop() {
  const { t, i18n } = useTranslation();
  const [darkMode, setDarkMode] = useState(false);
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

  const {
    tabs,
    activeTabId,
    activeTab,
    isInitialized,
    removeTab,
    setActiveTab,
    updateTabContent,
    openFile,
    saveTab,
    saveTabAs,
    createNewTab,
  } = useTabsDesktop();

  const theme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
    },
  });

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

  const handleDarkModeChange = (newDarkMode: boolean) => {
    setDarkMode(newDarkMode);
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

        // ダークモード設定を読み込み
        const savedDarkMode = await storeApi.loadDarkMode();
        console.log('Loaded saved dark mode:', savedDarkMode);
        setDarkMode(savedDarkMode);

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

  // ダークモード設定の保存
  useEffect(() => {
    if (!isSettingsLoaded) return; // 初期読み込み中は保存しない

    const saveDarkMode = async () => {
      try {
        console.log('Saving dark mode:', darkMode);
        await storeApi.saveDarkMode(darkMode);
      } catch (error) {
        console.error('Failed to save dark mode:', error);
      }
    };

    saveDarkMode();
  }, [darkMode, isSettingsLoaded]);

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
    <ThemeProvider theme={theme}>
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
                        darkMode={darkMode}
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
                        darkMode={darkMode}
                        globalVariables={globalVariables}
                      />
                    </Box>
                  </>
                )}
                {viewMode === 'editor' && (
                  <Box sx={{ flex: 1 }}>
                    <Editor
                      content={activeTab.content}
                      onChange={handleContentChange}
                      darkMode={darkMode}
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
                      darkMode={darkMode}
                      globalVariables={globalVariables}
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

        <Settings
          open={settingsOpen}
          onClose={handleSettingsClose}
          darkMode={darkMode}
          onDarkModeChange={handleDarkModeChange}
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
      </Box>
    </ThemeProvider>
  );
}

export default AppDesktop;
