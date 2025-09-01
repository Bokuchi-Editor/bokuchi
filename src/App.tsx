import { useState, useEffect } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, Box, AppBar, Toolbar, Typography, IconButton, Button, Snackbar, Alert } from '@mui/material';
import { Brightness4, FolderOpen, Save, Settings as SettingsIcon } from '@mui/icons-material';
import Editor from './components/Editor';
import Preview from './components/Preview';
import TabBar from './components/TabBar';
import SaveFileDialog from './components/SaveFileDialog';
import StatusBar from './components/StatusBar';
import Settings from './components/Settings';
import { useTabs } from './hooks/useTabs';
import { ThemeName, getThemeByName, applyThemeToDocument } from './themes';
import './i18n';
import './App.css';

function App() {
  const [theme, setTheme] = useState<ThemeName>('default');
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [globalVariables, setGlobalVariables] = useState<Record<string, string>>({});
  const [language, setLanguage] = useState('en');
  const [tabLayout, setTabLayout] = useState<'horizontal' | 'vertical'>('horizontal');
  const [editorStatus, setEditorStatus] = useState({
    line: 1,
    column: 1,
    totalCharacters: 0,
    selectedCharacters: 0
  });
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  const {
    tabs,
    activeTabId,
    activeTab,
    // addTab,
    removeTab,
    setActiveTab,
    updateTabContent,
    openFile,
    saveTab,
    createNewTab,
  } = useTabs();

  const currentTheme = getThemeByName(theme);

  const handleContentChange = (content: string) => {
    if (activeTab) {
      updateTabContent(activeTab.id, content);
    }
  };

  // 初期化時とテーマが変更されたときにHTML要素にdata-theme属性を設定
  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  const toggleTheme = () => {
    // Cycle through themes: default -> dark -> pastel -> vivid -> darcula -> default
    const themeOrder: ThemeName[] = ['default', 'dark', 'pastel', 'vivid', 'darcula'];
    const currentIndex = themeOrder.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themeOrder.length;
    const newTheme = themeOrder[nextIndex];
    setTheme(newTheme);
    applyThemeToDocument(newTheme);
  };

  const handleOpenFile = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.md,.txt';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          await openFile(file);
          setSnackbar({ open: true, message: 'File loaded successfully', severity: 'success' });
        } catch (error) {
          setSnackbar({ open: true, message: 'Failed to load file', severity: 'error' });
        }
      }
    };
    input.click();
  };

  const handleSaveFile = async () => {
    if (activeTab) {
      if (activeTab.filePath && !activeTab.isNew) {
        // 既存ファイルに保存（ダウンロード）
        const success = await saveTab(activeTab.id);
        if (success) {
          setSnackbar({ open: true, message: 'File saved successfully', severity: 'success' });
        } else {
          setSnackbar({ open: true, message: 'Failed to save file', severity: 'error' });
        }
      } else {
        // 新しいファイルとして保存（ダイアログを開く）
        setSaveDialogOpen(true);
      }
    }
  };

  const handleSaveAs = async (fileName: string) => {
    if (activeTab) {
      const success = await saveTab(activeTab.id, fileName);
      if (success) {
        setSnackbar({ open: true, message: 'File saved successfully', severity: 'success' });
      } else {
        setSnackbar({ open: true, message: 'Failed to save file', severity: 'error' });
      }
    }
  };

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
  };

  const handleTabClose = (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (tab && tab.isModified) {
      // 変更がある場合は確認ダイアログを表示（簡易版）
      if (window.confirm('Save changes before closing?')) {
        if (tab.filePath && !tab.isNew) {
          saveTab(tabId).then(() => {
            removeTab(tabId);
          });
        } else {
          // 新しいファイルの場合は保存ダイアログを開く
          setActiveTab(tabId);
          setSaveDialogOpen(true);
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
              MD Editor (Web Version)
            </Typography>
            <Button
              color="inherit"
              startIcon={<FolderOpen />}
              onClick={handleOpenFile}
              sx={{ mr: 1 }}
            >
              Open
            </Button>
            <Button
              color="inherit"
              startIcon={<Save />}
              onClick={handleSaveFile}
              disabled={!activeTab}
              sx={{ mr: 1 }}
            >
              Save
            </Button>
            <Button
              color="inherit"
              startIcon={<SettingsIcon />}
              onClick={() => setSettingsOpen(true)}
              sx={{ mr: 1 }}
            >
              Settings
            </Button>
            <IconButton color="inherit" onClick={toggleTheme}>
              <Brightness4 />
            </IconButton>
          </Toolbar>
        </AppBar>

        {tabs.length > 0 && (
          <TabBar
            tabs={tabs}
            activeTabId={activeTabId}
            onTabChange={handleTabChange}
            onTabClose={handleTabClose}
            onNewTab={handleNewTab}
          />
        )}

        {activeTab && (
          <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            <Box sx={{ flex: 1, borderRight: 1, borderColor: 'divider' }}>
              <Editor
                content={activeTab.content}
                onChange={handleContentChange}
                darkMode={theme === 'dark'}
                theme={theme}
                onStatusChange={setEditorStatus}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Preview
                content={activeTab.content}
                darkMode={theme === 'dark'}
                theme={theme}
              />
            </Box>
          </Box>
        )}

        {!activeTab && tabs.length === 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
            <Typography variant="h6" color="text.secondary">
              No tabs open. Create a new tab to get started.
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
          onClose={() => setSettingsOpen(false)}
          theme={theme}
          onThemeChange={(newTheme) => {
            setTheme(newTheme);
            applyThemeToDocument(newTheme);
          }}
          globalVariables={globalVariables}
          onGlobalVariablesChange={setGlobalVariables}
          language={language}
          onLanguageChange={setLanguage}
          tabLayout={tabLayout}
          onTabLayoutChange={setTabLayout}
        />

        <SaveFileDialog
          open={saveDialogOpen}
          onClose={() => setSaveDialogOpen(false)}
          onSave={handleSaveAs}
          defaultFileName={activeTab?.title === 'Untitled' ? 'untitled' : activeTab?.title}
        />

        {/* ステータスバー */}
        <StatusBar
          line={editorStatus.line}
          column={editorStatus.column}
          totalCharacters={editorStatus.totalCharacters}
          selectedCharacters={editorStatus.selectedCharacters}
          darkMode={theme === 'dark'}
          theme={theme}
          onThemeChange={(newTheme) => {
            setTheme(newTheme);
            applyThemeToDocument(newTheme);
          }}
        />
      </Box>
    </ThemeProvider>
  );
}

export default App;
