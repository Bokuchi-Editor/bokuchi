import { useEffect, useRef, useState } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, Box, Typography } from '@mui/material';

import AppHeader from './components/AppHeader';
import AppContent from './components/AppContent';
import AppDialogs from './components/AppDialogs';
import StatusBar from './components/StatusBar';
import RecentFilesDialog from './components/RecentFilesDialog';
import RenameDialog from './components/RenameDialog';
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
    settingsFocusTarget,
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
    setIsDragOver,
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
    saveStatusMessage,

    // What's New state
    whatsNewOpen,

    // Update state
    updateDialogOpen,
    updateDialogPhase,
    updateInfo,
    updateDownloadProgress,

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
    handleToggleTabPinned,
    handleCopyFilePath,
    handleCopyFileName,
    handleCloseOtherTabs,
    handleCloseTabsToRight,
    handleCloseAllTabs,
    handleCheckForUpdate,
    handleDismissUpdate,
    handleWhatsNewClose,
    openFile,

    // Easter eggs
    as400Unlocked,
    showUnlockAnimation,
    isLateNight,

    // Outline
    outlinePanelOpen,

    // Folder tree
    folderTreePanelOpen,
    folderTreeRootFolderName,
    folderTree,
    folderTreeIsLoading,
    handleFolderTreeFileClick,
    handleOpenFolder,

    // Focus
    focusRequestId,
    requestEditorFocus,

    // Zoom handlers
    zoomIn,
    zoomOut,
    resetZoom,

    // Setters
    setEditorStatus,
    setViewMode,
    setOutlinePanelOpen,
    setFolderTreePanelOpen,
    folderTreeCloseFolder,
    folderTreeToggleExpand,
    folderTreeRefreshTree,

    // Rename
    renameDialog,
    handleRenameRequest,
    handleRenameConfirm,
    handleRenameCancel,
    handleTabRenameRequest,

    // Translation
    t,

    // Constants
    ZOOM_CONFIG,
  } = useAppState();

  // Track whether event listeners are fully registered
  const [listenersReady, setListenersReady] = useState(false);

  // Ref to always hold the latest handlers, avoiding stale closures in event listeners
  const handlersRef = useRef({
    handleNewTab, handleSaveFile, handleSaveFileAs, handleSaveWithVariables,
    handleHelpOpen, openFile, requestEditorFocus, setIsDragOver, setSnackbar, t,
  });
  useEffect(() => {
    handlersRef.current = {
      handleNewTab, handleSaveFile, handleSaveFileAs, handleSaveWithVariables,
      handleHelpOpen, openFile, requestEditorFocus, setIsDragOver, setSnackbar, t,
    };
  });

  // Set up menu event listeners
  useEffect(() => {
    let cancelled = false;

    let unlistenMenu: (() => void) | undefined;
    let unlistenNewFile: (() => void) | undefined;
    let unlistenOpenFile: (() => void) | undefined;
    let unlistenSaveAs: (() => void) | undefined;
    let unlistenSaveWithVariables: (() => void) | undefined;
    let unlistenHelp: (() => void) | undefined;
    let unlistenFileOpen: (() => void) | undefined;
    let unlistenDragDrop: (() => void) | undefined;

    const setupMenuListeners = async () => {
      const { listen } = await import('@tauri-apps/api/event');

      // If effect was cleaned up during the async import, don't register listeners
      if (cancelled) return;

      const MENU_DEBOUNCE_MS = 100;
      const FILE_OPEN_DEBOUNCE_MS = 2000;

      // Shared debounce state for menu events (attached to window to survive re-renders)
      const globalDebounce = (window as unknown as {
        lastMenuEventTime?: number;
      });

      if (!globalDebounce.lastMenuEventTime) {
        globalDebounce.lastMenuEventTime = 0;
      }

      // Returns true if the event should be suppressed (within debounce window)
      const isMenuDebounced = (): boolean => {
        const now = Date.now();
        if (now - globalDebounce.lastMenuEventTime! < MENU_DEBOUNCE_MS) {
          return true;
        }
        globalDebounce.lastMenuEventTime = now;
        return false;
      };

      unlistenMenu = await listen('menu-save', () => {
        if (!isMenuDebounced()) handlersRef.current.handleSaveFile();
      });

      unlistenNewFile = await listen('menu-new-file', () => {
        if (!isMenuDebounced()) handlersRef.current.handleNewTab();
      });

      unlistenOpenFile = await listen('menu-open-file', async () => {
        if (isMenuDebounced()) return;
        try {
          await handlersRef.current.openFile();
        } catch (error) {
          console.error('Failed to open file from menu:', error);
        }
      });

      unlistenSaveAs = await listen('menu-save-as', () => {
        if (!isMenuDebounced()) handlersRef.current.handleSaveFileAs();
      });

      unlistenSaveWithVariables = await listen('menu-save-with-variables', () => {
        if (!isMenuDebounced()) handlersRef.current.handleSaveWithVariables();
      });

      unlistenHelp = await listen('menu-help', () => {
        if (!isMenuDebounced()) handlersRef.current.handleHelpOpen();
      });

      // File association event listener with debounce
      const fileOpenDebounce = (window as unknown as {
        lastFileOpenTime?: number;
        lastFilePath?: string;
      });

      if (!fileOpenDebounce.lastFileOpenTime) {
        fileOpenDebounce.lastFileOpenTime = 0;
      }
      if (!fileOpenDebounce.lastFilePath) {
        fileOpenDebounce.lastFilePath = '';
      }

      unlistenFileOpen = await listen('open-file', async (event: { payload: { file_path: string } }) => {
        const now = Date.now();
        const timeDiff = now - fileOpenDebounce.lastFileOpenTime!;
        const currentFilePath = event.payload.file_path;
        const isSameFile = currentFilePath === fileOpenDebounce.lastFilePath;

        // Debounce: same file within time limit
        if (isSameFile && timeDiff < FILE_OPEN_DEBOUNCE_MS) {
          return;
        }
        fileOpenDebounce.lastFileOpenTime = now;
        fileOpenDebounce.lastFilePath = currentFilePath;
        await handlersRef.current.openFile(currentFilePath);
        handlersRef.current.requestEditorFocus();
      });

      // Drag and drop event listener (uses Tauri API to get file paths)
      const { getCurrentWebview } = await import('@tauri-apps/api/webview');
      if (cancelled) return;

      const isSupportedFile = (path: string) => {
        const lower = path.toLowerCase();
        return lower.endsWith('.md') || lower.endsWith('.markdown') || lower.endsWith('.txt');
      };

      unlistenDragDrop = await getCurrentWebview().onDragDropEvent(async (event) => {
        if (event.payload.type === 'enter') {
          const hasSupported = event.payload.paths.some(isSupportedFile);
          if (hasSupported) {
            handlersRef.current.setIsDragOver(true);
          }
        } else if (event.payload.type === 'leave') {
          handlersRef.current.setIsDragOver(false);
        } else if (event.payload.type === 'drop') {
          handlersRef.current.setIsDragOver(false);
          const supportedPaths = event.payload.paths.filter(isSupportedFile);
          if (supportedPaths.length === 0) {
            handlersRef.current.setSnackbar({
              open: true,
              message: handlersRef.current.t('fileOperations.noMarkdownFiles'),
              severity: 'error',
            });
            return;
          }

          // Mark in fileOpenDebounce so the subsequent RunEvent::Opened
          // (which macOS also fires for dropped files) is suppressed
          fileOpenDebounce.lastFileOpenTime = Date.now();
          fileOpenDebounce.lastFilePath = supportedPaths[0];

          try {
            await handlersRef.current.openFile(supportedPaths[0]);
            handlersRef.current.requestEditorFocus();
          } catch {
            handlersRef.current.setSnackbar({
              open: true,
              message: handlersRef.current.t('fileOperations.fileLoadFailed'),
              severity: 'error',
            });
          }
        }
      });

      // Signal that all listeners are registered
      setListenersReady(true);
    };

    setupMenuListeners();

    return () => {
      cancelled = true;
      if (unlistenMenu) unlistenMenu();
      if (unlistenNewFile) unlistenNewFile();
      if (unlistenOpenFile) unlistenOpenFile();
      if (unlistenSaveAs) unlistenSaveAs();
      if (unlistenSaveWithVariables) unlistenSaveWithVariables();
      if (unlistenHelp) unlistenHelp();
      if (unlistenFileOpen) unlistenFileOpen();
      if (unlistenDragDrop) unlistenDragDrop();
    };
  }, []); // Empty dependency array to run only once

  // Notify Rust that frontend is ready AFTER both conditions are met:
  // 1. State restoration is complete (isInitialized) — prevents LOAD_STATE from overwriting file association tabs
  // 2. Event listeners are registered (listenersReady) — ensures open-file events can be received
  useEffect(() => {
    if (!isInitialized || !listenersReady) return;

    const notifyAndOpenPending = async () => {
      try {
        const { desktopApi } = await import('./api/desktopApi');
        // setFrontendReady also emits any buffered pending file paths as open-file events
        await desktopApi.setFrontendReady();
      } catch (error) {
        console.error('❌ Failed to notify Rust that frontend is ready:', error);
      }
    };

    notifyAndOpenPending();
  }, [isInitialized, listenersReady]);

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
      >
        <AppHeader
          viewMode={viewMode}
          fileMenuAnchor={fileMenuAnchor}
          activeTab={activeTab}
          outlinePanelOpen={outlinePanelOpen}
          folderTreePanelOpen={folderTreePanelOpen}
          folderTreeDisplayMode={appSettings.interface.folderTreeDisplayMode}
          onViewModeChange={setViewMode}
          onFileMenuOpen={handleFileMenuOpen}
          onFileMenuClose={handleFileMenuClose}
          onNewTab={handleNewTab}
          onOpenFile={handleOpenFile}
          onOpenFolder={handleOpenFolder}
          onSaveFile={handleSaveFile}
          onSaveFileAs={handleSaveFileAs}
          onSaveWithVariables={handleSaveWithVariables}
          onSettingsOpen={handleSettingsOpen}
          onHelpOpen={handleHelpOpen}
          onRecentFileSelect={handleRecentFileSelect}
          onOutlineToggle={() => setOutlinePanelOpen(prev => !prev)}
          onFolderTreeToggle={() => setFolderTreePanelOpen(prev => !prev)}
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
          renderingSettings={appSettings.rendering}
          editorSettings={{
            fontSize: appSettings.editor.fontSize,
            showLineNumbers: appSettings.editor.showLineNumbers,
            tabSize: appSettings.editor.tabSize,
            wordWrap: appSettings.editor.wordWrap,
            minimap: appSettings.editor.minimap,
            showWhitespace: appSettings.advanced.showWhitespace,
            tableConversion: appSettings.advanced.tableConversion,
          }}
          scrollSyncMode={appSettings.interface.scrollSyncMode}
          outlineDisplayMode={appSettings.interface.outlineDisplayMode}
          outlinePanelOpen={outlinePanelOpen}
          onOutlinePanelClose={() => setOutlinePanelOpen(false)}
          folderTreeDisplayMode={appSettings.interface.folderTreeDisplayMode}
          folderTreePanelOpen={folderTreePanelOpen}
          folderTreeRootFolderName={folderTreeRootFolderName}
          folderTree={folderTree}
          folderTreeIsLoading={folderTreeIsLoading}
          onFolderTreeFileClick={handleFolderTreeFileClick}
          onFolderTreeToggleExpand={folderTreeToggleExpand}
          onFolderTreeOpenFolder={handleOpenFolder}
          onFolderTreeCloseFolder={folderTreeCloseFolder}
          onFolderTreeRefresh={folderTreeRefreshTree}
          onFolderTreePanelClose={() => setFolderTreePanelOpen(false)}
          onRenameRequest={handleRenameRequest}
          onTabRename={handleTabRenameRequest}
          onToggleTabPinned={handleToggleTabPinned}
          onCopyFilePath={handleCopyFilePath}
          onCopyFileName={handleCopyFileName}
          onCloseOtherTabs={handleCloseOtherTabs}
          onCloseTabsToRight={handleCloseTabsToRight}
          onCloseAllTabs={handleCloseAllTabs}
          tabCloseButtonPosition={appSettings.interface.tabCloseButtonPosition}
          onTabChange={handleTabChange}
          onTabClose={handleTabClose}
          onNewTab={handleNewTab}
          onOpenFile={handleOpenFile}
          onRecentFileSelect={handleRecentFileSelect}
          onTabReorder={handleTabReorder}
          onContentChange={handleContentChange}
          onStatusChange={setEditorStatus}
          onSnackbar={(message, severity) => setSnackbar({ open: true, message, severity })}
          onTableConversionSettingChange={(newSetting) => {
            const updatedSettings = {
              ...appSettings,
              advanced: {
                ...appSettings.advanced,
                tableConversion: newSetting,
              },
            };
            handleAppSettingsChange(updatedSettings);
          }}
          onOpenSettings={handleSettingsOpen}
          focusRequestId={focusRequestId}
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
          settingsFocusTarget={settingsFocusTarget}
          settings={appSettings}
          helpOpen={helpOpen}
          fileChangeDialog={fileChangeDialog}
          saveBeforeCloseDialog={saveBeforeCloseDialog}
          whatsNewOpen={whatsNewOpen}
          onWhatsNewClose={handleWhatsNewClose}
          updateDialogOpen={updateDialogOpen}
          updateDialogPhase={updateDialogPhase}
          updateInfo={updateInfo}
          updateDownloadProgress={updateDownloadProgress}
          onCloseSnackbar={handleCloseSnackbar}
          onSettingsClose={handleSettingsClose}
          onSettingsChange={handleAppSettingsChange}
          onHelpClose={handleHelpClose}
          onSaveBeforeClose={handleSaveBeforeClose}
          onDontSaveBeforeClose={handleDontSaveBeforeClose}
          onCancelBeforeClose={handleCancelBeforeClose}
          onUpdate={handleCheckForUpdate}
          onDismissUpdate={handleDismissUpdate}
          as400Unlocked={as400Unlocked}
          t={t}
        />

        <RecentFilesDialog
          open={recentFilesOpen}
          onClose={handleRecentFilesClose}
          onFileSelect={handleRecentFileSelect}
          t={t}
        />

        <RenameDialog
          open={renameDialog.open}
          currentName={renameDialog.currentName}
          onConfirm={handleRenameConfirm}
          onCancel={handleRenameCancel}
        />

      {/* Status bar */}
      <StatusBar
        line={editorStatus.line}
        column={editorStatus.column}
        totalCharacters={editorStatus.totalCharacters}
        selectedCharacters={editorStatus.selectedCharacters}
        darkMode={theme === 'dark' || theme === 'as400'}
        theme={theme}
        onThemeChange={handleThemeChange}
        zoomPercentage={zoomPercentage}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onResetZoom={resetZoom}
        canZoomIn={canZoomIn}
        canZoomOut={canZoomOut}
        as400Unlocked={as400Unlocked}
        isLateNight={isLateNight}
        saveStatusMessage={saveStatusMessage}
      />
      {/* Konami Code unlock animation */}
      {showUnlockAnimation && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: 'none',
            zIndex: 9999,
            animation: 'konamiUnlock 2.5s ease-out forwards',
            '@keyframes konamiUnlock': {
              '0%': {
                backgroundColor: 'rgba(0, 255, 0, 0)',
                boxShadow: 'inset 0 0 0px rgba(0, 255, 0, 0)',
              },
              '15%': {
                backgroundColor: 'rgba(0, 255, 0, 0.15)',
                boxShadow: 'inset 0 0 60px rgba(0, 255, 0, 0.4)',
              },
              '30%': {
                backgroundColor: 'rgba(0, 255, 0, 0.05)',
                boxShadow: 'inset 0 0 30px rgba(0, 255, 0, 0.2)',
              },
              '45%': {
                backgroundColor: 'rgba(0, 255, 0, 0.1)',
                boxShadow: 'inset 0 0 40px rgba(0, 255, 0, 0.3)',
              },
              '100%': {
                backgroundColor: 'rgba(0, 255, 0, 0)',
                boxShadow: 'inset 0 0 0px rgba(0, 255, 0, 0)',
              },
            },
          }}
        >
          {/* Scanline effect */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'repeating-linear-gradient(0deg, rgba(0,255,0,0.03) 0px, rgba(0,255,0,0.03) 1px, transparent 1px, transparent 3px)',
              animation: 'scanlineScroll 0.1s linear infinite',
              '@keyframes scanlineScroll': {
                '0%': { backgroundPosition: '0 0' },
                '100%': { backgroundPosition: '0 3px' },
              },
            }}
          />
          {/* Theme unlocked text */}
          <Typography
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: '#00FF00',
              fontFamily: '"IBM Plex Mono", "Courier New", Courier, monospace',
              fontSize: '24px',
              fontWeight: 'bold',
              textShadow: '0 0 10px rgba(0,255,0,0.8), 0 0 20px rgba(0,255,0,0.4)',
              animation: 'unlockTextFade 2.5s ease-out forwards',
              whiteSpace: 'nowrap',
              '@keyframes unlockTextFade': {
                '0%': { opacity: 0 },
                '20%': { opacity: 1 },
                '70%': { opacity: 1 },
                '100%': { opacity: 0 },
              },
            }}
          >
            {'> AS/400 THEME UNLOCKED_'}
          </Typography>
        </Box>
      )}
      </Box>
    </ThemeProvider>
  );
}

export default AppDesktop;
