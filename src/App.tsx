import { useEffect } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, Box, Typography } from '@mui/material';

import AppHeader from './components/AppHeader';
import AppContent from './components/AppContent';
import AppDialogs from './components/AppDialogs';
import StatusBar from './components/StatusBar';
import RecentFilesDialog from './components/RecentFilesDialog';
import { useAppState } from './hooks/useAppState';
import './i18n';
import './styles/variables.css';
import './styles/base.css';
import './styles/markdown.css';
import './styles/syntax.css';

function AppDesktop() {
  const {
    // State
    theme,
    settingsOpen,
    helpOpen,
    recentFilesOpen,
    fileMenuAnchor,
    snackbar,
    globalVariables,
    tabLayout,
    viewMode,
    editorStatus,
    fileChangeDialog,
    saveBeforeCloseDialog,
    isDragOver,
    tabs,
    activeTabId,
    activeTab,
    isInitialized,
    isSettingsLoaded,
    currentTheme,
    currentZoom,
    zoomPercentage,
    isAtLimit,
    canZoomIn,
    canZoomOut,
    appSettings,

    // Handlers
    handleContentChange,
    handleSettingsOpen,
    handleSettingsClose,
    handleHelpOpen,
    handleHelpClose,
    handleRecentFileSelect,
    handleRecentFilesClose,
    handleThemeChange,
    handleAppSettingsChange,
    handleFileMenuOpen,
    handleFileMenuClose,
    handleCloseSnackbar,
    setSnackbar,
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
    openFile,


    // Zoom handlers
    zoomIn,
    zoomOut,
    resetZoom,

    // Setters
    setEditorStatus,
    setViewMode,

    // Translation
    t,

    // Constants
    ZOOM_CONFIG,
  } = useAppState();

  // メニューイベントのリスナーを設定
  useEffect(() => {

    let unlistenMenu: (() => void) | undefined;
    let unlistenNewFile: (() => void) | undefined;
    let unlistenOpenFile: (() => void) | undefined;
    let unlistenSaveAs: (() => void) | undefined;
    let unlistenSaveWithVariables: (() => void) | undefined;
    let unlistenHelp: (() => void) | undefined;
    let unlistenFileOpen: (() => void) | undefined;

    const setupMenuListeners = async () => {
      const { listen } = await import('@tauri-apps/api/event');

      // デバウンス処理用の変数（グローバルに移動）
      const globalDebounce = (window as unknown as {
        lastMenuEventTime?: number;
        DEBOUNCE_DELAY: number;
      });

      if (!globalDebounce.lastMenuEventTime) {
        globalDebounce.lastMenuEventTime = 0;
      }
      globalDebounce.DEBOUNCE_DELAY = 100;

      unlistenMenu = await listen('menu-save', () => {
        const now = Date.now();
        const timeDiff = now - globalDebounce.lastMenuEventTime!;

        if (timeDiff < globalDebounce.DEBOUNCE_DELAY) {
          return;
        }
        globalDebounce.lastMenuEventTime = now;
        handleSaveFile();
      });

      unlistenNewFile = await listen('menu-new-file', () => {
        const now = Date.now();
        const timeDiff = now - globalDebounce.lastMenuEventTime!;

        if (timeDiff < globalDebounce.DEBOUNCE_DELAY) {
          return;
        }
        globalDebounce.lastMenuEventTime = now;
        handleNewTab();
      });

      unlistenOpenFile = await listen('menu-open-file', async () => {
        const now = Date.now();
        const timeDiff = now - globalDebounce.lastMenuEventTime!;

        if (timeDiff < globalDebounce.DEBOUNCE_DELAY) {
          return;
        }
        globalDebounce.lastMenuEventTime = now;
        try {
          await openFile();
        } catch (error) {
          console.error('Failed to open file from menu:', error);
        }
      });

      unlistenSaveAs = await listen('menu-save-as', () => {
        const now = Date.now();
        const timeDiff = now - globalDebounce.lastMenuEventTime!;

        if (timeDiff < globalDebounce.DEBOUNCE_DELAY) {
          return;
        }
        globalDebounce.lastMenuEventTime = now;
        handleSaveFileAs();
      });

      unlistenSaveWithVariables = await listen('menu-save-with-variables', () => {
        const now = Date.now();
        const timeDiff = now - globalDebounce.lastMenuEventTime!;

        if (timeDiff < globalDebounce.DEBOUNCE_DELAY) {
          return;
        }
        globalDebounce.lastMenuEventTime = now;
        handleSaveWithVariables();
      });

      unlistenHelp = await listen('menu-help', () => {
        const now = Date.now();
        const timeDiff = now - globalDebounce.lastMenuEventTime!;

        if (timeDiff < globalDebounce.DEBOUNCE_DELAY) {
          return;
        }
        globalDebounce.lastMenuEventTime = now;
        handleHelpOpen();
      });

      // File association event listener
      unlistenFileOpen = await listen('open-file', (event: { payload: { file_path: string } }) => {
        console.log('File open event received:', event.payload.file_path);
        openFile(event.payload.file_path);
      });
    };

    setupMenuListeners();

    return () => {
      if (unlistenMenu) unlistenMenu();
      if (unlistenNewFile) unlistenNewFile();
      if (unlistenOpenFile) unlistenOpenFile();
      if (unlistenSaveAs) unlistenSaveAs();
      if (unlistenSaveWithVariables) unlistenSaveWithVariables();
      if (unlistenHelp) unlistenHelp();
      if (unlistenFileOpen) unlistenFileOpen();
    };
  }, [handleSaveFileAs, handleSaveWithVariables, handleHelpOpen, openFile]); // 依存配列に関数を追加

  // Check for pending file paths on app startup (macOS file association)
  useEffect(() => {
    const checkPendingFiles = async () => {
      try {
        const { desktopApi } = await import('./api/desktopApi');
        const pendingPaths = await desktopApi.getPendingFilePaths();

        if (pendingPaths.length > 0) {
          console.log('Found pending file paths:', pendingPaths);
          // Open the first file (in case multiple files were queued)
          for (const filePath of pendingPaths) {
            console.log('Opening pending file:', filePath);
            await openFile(filePath);
            // Only open the first file to avoid overwhelming the user
            break;
          }
        }
      } catch (error) {
        console.error('Error checking pending files:', error);
      }
    };

    // Small delay to ensure frontend is ready
    const timer = setTimeout(checkPendingFiles, 500);
    return () => clearTimeout(timer);
  }, [openFile]);

  return (
    <ThemeProvider theme={currentTheme}>
      <CssBaseline />
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          position: 'relative',
          ...(isDragOver && {
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.1)',
              border: '2px dashed',
              borderColor: 'primary.main',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
            },
            '&::after': {
              content: `"${t('fileOperations.dropMarkdownFile')}"`,
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'primary.main',
              color: 'primary.contrastText',
              padding: 2,
              borderRadius: 1,
              fontSize: '1.2rem',
              fontWeight: 'bold',
              zIndex: 1001,
              pointerEvents: 'none',
            }
          })
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <AppHeader
          viewMode={viewMode}
          fileMenuAnchor={fileMenuAnchor}
          activeTab={activeTab}
          onViewModeChange={setViewMode}
          onFileMenuOpen={handleFileMenuOpen}
          onFileMenuClose={handleFileMenuClose}
          onNewTab={handleNewTab}
          onOpenFile={handleOpenFile}
          onSaveFile={handleSaveFile}
          onSaveFileAs={handleSaveFileAs}
          onSaveWithVariables={handleSaveWithVariables}
          onSettingsOpen={handleSettingsOpen}
          onHelpOpen={handleHelpOpen}
          onRecentFileSelect={handleRecentFileSelect}
          t={t}
        />

        <AppContent
          tabLayout={tabLayout}
          viewMode={viewMode}
          tabs={tabs}
          activeTabId={activeTabId}
          activeTab={activeTab}
          theme={theme}
          globalVariables={globalVariables}
          currentZoom={currentZoom}
          isInitialized={isInitialized}
          isSettingsLoaded={isSettingsLoaded}
          editorSettings={{
            fontSize: appSettings.editor.fontSize,
            showLineNumbers: appSettings.editor.showLineNumbers,
            tabSize: appSettings.editor.tabSize,
            wordWrap: appSettings.editor.wordWrap,
            minimap: appSettings.editor.minimap,
            showWhitespace: appSettings.advanced.showWhitespace,
            tableConversion: appSettings.advanced.tableConversion,
          }}
          onTabChange={handleTabChange}
          onTabClose={handleTabClose}
          onNewTab={handleNewTab}
          onTabReorder={handleTabReorder}
          onContentChange={handleContentChange}
          onStatusChange={setEditorStatus}
          onSnackbar={(message, severity) => setSnackbar({ open: true, message, severity })}
          t={t}
        />

        {(!isInitialized || !isSettingsLoaded) && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
            <Typography variant="h6" color="text.secondary">
              {t('app.loading')}
            </Typography>
          </Box>
        )}

        <AppDialogs
          snackbar={snackbar}
          isAtLimit={isAtLimit}
          currentZoom={currentZoom}
          ZOOM_CONFIG={ZOOM_CONFIG}
          settingsOpen={settingsOpen}
          settings={appSettings}
          helpOpen={helpOpen}
          fileChangeDialog={fileChangeDialog}
          saveBeforeCloseDialog={saveBeforeCloseDialog}
          onCloseSnackbar={handleCloseSnackbar}
          onSettingsClose={handleSettingsClose}
          onSettingsChange={handleAppSettingsChange}
          onHelpClose={handleHelpClose}
          onSaveBeforeClose={handleSaveBeforeClose}
          onDontSaveBeforeClose={handleDontSaveBeforeClose}
          onCancelBeforeClose={handleCancelBeforeClose}
          t={t}
        />

        <RecentFilesDialog
          open={recentFilesOpen}
          onClose={handleRecentFilesClose}
          onFileSelect={handleRecentFileSelect}
          t={t}
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
