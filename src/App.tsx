import React, { useState, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box, AppBar, Toolbar, Typography, IconButton, Button, Snackbar, Alert } from '@mui/material';
import { Brightness4, Brightness7, FolderOpen, Save, Settings } from '@mui/icons-material';
import Editor from './components/Editor';
import Preview from './components/Preview';
import TabBar from './components/TabBar';
import VariableSettings from './components/VariableSettings';
import SaveFileDialog from './components/SaveFileDialog';
import { useTabs } from './hooks/useTabs';
import './App.css';

function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [variableSettingsOpen, setVariableSettingsOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  const {
    tabs,
    activeTabId,
    activeTab,
    addTab,
    removeTab,
    setActiveTab,
    updateTabContent,
    openFile,
    saveTab,
    createNewTab,
  } = useTabs();

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

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
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
    <ThemeProvider theme={theme}>
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
              startIcon={<Settings />}
              onClick={() => setVariableSettingsOpen(true)}
              sx={{ mr: 1 }}
            >
              Variables
            </Button>
            <IconButton color="inherit" onClick={toggleDarkMode}>
              {darkMode ? <Brightness7 /> : <Brightness4 />}
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
                darkMode={darkMode}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Preview
                content={activeTab.content}
                darkMode={darkMode}
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

        <VariableSettings
          open={variableSettingsOpen}
          onClose={() => setVariableSettingsOpen(false)}
        />

        <SaveFileDialog
          open={saveDialogOpen}
          onClose={() => setSaveDialogOpen(false)}
          onSave={handleSaveAs}
          defaultFileName={activeTab?.title === 'Untitled' ? 'untitled' : activeTab?.title}
        />
      </Box>
    </ThemeProvider>
  );
}

export default App;
