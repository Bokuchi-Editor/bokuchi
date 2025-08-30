import { useState, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box, AppBar, Toolbar, Typography, IconButton, Button, Snackbar, Alert, Menu, MenuItem } from '@mui/material';
import { Brightness4, Brightness7, FolderOpen, Save, SaveAlt, Settings, MoreVert } from '@mui/icons-material';
import Editor from './components/Editor';
import Preview from './components/Preview';
import TabBar from './components/TabBar';
import VariableSettings from './components/VariableSettings';
import { useTabsDesktop } from './hooks/useTabsDesktop';

import './App.css';

function AppDesktop() {
  const [darkMode, setDarkMode] = useState(false);
  const [variableSettingsOpen, setVariableSettingsOpen] = useState(false);
  const [fileMenuAnchor, setFileMenuAnchor] = useState<null | HTMLElement>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });



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

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const handleOpenFile = async () => {
    try {
      await openFile();
      setSnackbar({ open: true, message: 'File loaded successfully', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to load file', severity: 'error' });
    }
  };

  const handleSaveFile = async () => {
    if (activeTab) {
      try {
        const success = await saveTab(activeTab.id);
        if (success) {
          setSnackbar({ open: true, message: 'File saved successfully', severity: 'success' });
        } else {
          setSnackbar({ open: true, message: 'Failed to save file', severity: 'error' });
        }
      } catch (error) {
        setSnackbar({ open: true, message: 'Failed to save file', severity: 'error' });
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
          setSnackbar({ open: true, message: 'File saved successfully', severity: 'success' });
        } else {
          setSnackbar({ open: true, message: 'Failed to save file', severity: 'error' });
        }
      } catch (error) {
        console.error('Error in handleSaveFileAs:', error);
        setSnackbar({ open: true, message: 'Failed to save file', severity: 'error' });
      }
    } else {
      console.log('No active tab');
    }
  };

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
  };

  const handleTabClose = async (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (tab && tab.isModified) {
      // 変更がある場合は確認ダイアログを表示
      if (window.confirm('Save changes before closing?')) {
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

  const handleFileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setFileMenuAnchor(event.currentTarget);
  };

  const handleFileMenuClose = () => {
    setFileMenuAnchor(null);
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
              MD Editor (Desktop)
            </Typography>

            {/* File Menu */}
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
              startIcon={<SaveAlt />}
              onClick={() => {
                console.log('Save As button clicked');
                handleSaveFileAs();
              }}
              disabled={!activeTab}
              sx={{ mr: 1 }}
            >
              Save As
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

            <IconButton
              color="inherit"
              onClick={handleFileMenuOpen}
              sx={{ ml: 1 }}
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
            New File
          </MenuItem>
          <MenuItem onClick={() => { handleOpenFile(); handleFileMenuClose(); }}>
            Open File
          </MenuItem>
          <MenuItem
            onClick={() => { handleSaveFile(); handleFileMenuClose(); }}
            disabled={!activeTab}
          >
            Save
          </MenuItem>
          <MenuItem
            onClick={() => { handleSaveFileAs(); handleFileMenuClose(); }}
            disabled={!activeTab}
          >
            Save As
          </MenuItem>
        </Menu>

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
              />
            </Box>
          </Box>
        )}

        {!isInitialized && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
            <Typography variant="h6" color="text.secondary">
              Loading...
            </Typography>
          </Box>
        )}

        {isInitialized && !activeTab && tabs.length === 0 && (
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
      </Box>
    </ThemeProvider>
  );
}

export default AppDesktop;
