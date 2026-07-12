import { useEffect, useState } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, Box, Typography } from '@mui/material';

import AppHeader from './components/AppHeader';
import AppContent from './components/AppContent';
import AppDialogs from './components/AppDialogs';
import StatusBar from './components/StatusBar';
import RecentFilesDialog from './components/RecentFilesDialog';
import RenameDialog from './components/RenameDialog';
import RinControls from './components/RinControls';
import KonamiUnlockOverlay from './components/KonamiUnlockOverlay';
import { useAppState } from './hooks/useAppState';
import { useRinExitButton } from './hooks/useRinExitButton';
import { useDesktopEventListeners } from './hooks/useDesktopEventListeners';
import { isDarkTheme } from './themes';
import './i18n';
import './styles/variables.css';
import './styles/base.css';
import './styles/markdown.css';
import './styles/syntax.css';

function AppDesktop() {
  const {
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
    tabLayout,
    tabSidebarPinned,
    toggleTabSidebarPinned,
    viewMode,
    rinActive,
    toggleRin,
    exitRin,
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
    handleOutlineToggle,

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

  // 臨 (Rin) focus-mode exit button visibility (mouse-move shows, typing fades, Esc exits)
  const { exitVisible: rinExitVisible } = useRinExitButton(rinActive, exitRin);
  // 臨 editor width: false = 1000px centered, true = full width (session-only).
  const [rinFullWidth, setRinFullWidth] = useState(false);

  // Whether the outline is currently showing — drives the header button's lit/dimmed
  // state. Persistent: governed by the master switch. Overlay: also needs the drawer open.
  const outlineActive =
    appSettings.interface.outlineEnabled &&
    (appSettings.interface.outlineDisplayMode === 'overlay' ? outlinePanelOpen : true);

  // Register menu / file-association / drag-drop listeners once and learn when
  // they are ready. Handlers are read via a live ref inside the hook.
  const listenersReady = useDesktopEventListeners({
    handleNewTab, handleSaveFile, handleSaveFileAs, handleSaveWithVariables,
    handleHelpOpen, openFile, requestEditorFocus, setIsDragOver, setSnackbar, t,
  });

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
        {!rinActive && (
          <AppHeader
            viewMode={viewMode}
            fileMenuAnchor={fileMenuAnchor}
            activeTab={activeTab}
            outlineActive={outlineActive}
            folderTreePanelOpen={folderTreePanelOpen}
            folderTreeDisplayMode={appSettings.interface.folderTreeDisplayMode}
            rinActive={rinActive}
            onViewModeChange={setViewMode}
            onRinToggle={toggleRin}
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
            onOutlineToggle={handleOutlineToggle}
            onFolderTreeToggle={() => setFolderTreePanelOpen(prev => !prev)}
            t={t}
          />
        )}

        <AppContent
          tabLayout={tabLayout}
          viewMode={viewMode}
          tabSidebarPinned={tabSidebarPinned}
          onToggleSidebarPinned={toggleTabSidebarPinned}
          rinActive={rinActive}
          rinFullWidth={rinFullWidth}
          tabs={tabs}
          activeTabId={activeTabId}
          activeTab={activeTab}
          theme={theme}
          globalVariables={globalVariables}
          currentZoom={currentZoom}
          isInitialized={isInitialized}
          isSettingsLoaded={isSettingsLoaded}
          renderingSettings={appSettings.rendering}
          previewSettings={appSettings.preview}
          editorSettings={{
            fontSize: appSettings.editor.fontSize,
            showLineNumbers: appSettings.editor.showLineNumbers,
            tabSize: appSettings.editor.tabSize,
            wordWrap: appSettings.editor.wordWrap,
            minimap: appSettings.editor.minimap,
            // 臨 mode hides the formatting toolbar for a clean writing surface.
            showFormattingBar: rinActive ? false : appSettings.editor.showFormattingBar,
            showWhitespace: appSettings.advanced.showWhitespace,
            tableConversion: appSettings.advanced.tableConversion,
          }}
          scrollSyncMode={appSettings.interface.scrollSyncMode}
          outlineDisplayMode={appSettings.interface.outlineDisplayMode}
          outlineEnabled={appSettings.interface.outlineEnabled}
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
          tabNewButtonPosition={appSettings.interface.tabNewButtonPosition}
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

        {rinActive && (
          <RinControls
            visible={rinExitVisible}
            fullWidth={rinFullWidth}
            onExit={exitRin}
            onToggleWidth={() => setRinFullWidth((v) => !v)}
            t={t}
          />
        )}

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
          milestoneOpen={milestoneOpen}
          onMilestoneClose={handleMilestoneClose}
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
          customThemes={customThemes}
          onCustomThemesChange={handleCustomThemesChange}
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

      {/* Status bar (hidden in 臨 focus mode) */}
      {!rinActive && (
        <StatusBar
          line={editorStatus.line}
          column={editorStatus.column}
          totalCharacters={editorStatus.totalCharacters}
          selectedCharacters={editorStatus.selectedCharacters}
          totalWords={editorStatus.totalWords}
          selectedWords={editorStatus.selectedWords}
          wordWrap={appSettings.editor.wordWrap}
          onToggleWordWrap={() => handleAppSettingsChange({
            ...appSettings,
            editor: { ...appSettings.editor, wordWrap: !appSettings.editor.wordWrap },
          })}
          autoSave={appSettings.advanced.autoSave}
          onToggleAutoSave={() => handleAppSettingsChange({
            ...appSettings,
            advanced: { ...appSettings.advanced, autoSave: !appSettings.advanced.autoSave },
          })}
          darkMode={isDarkTheme(theme)}
          theme={theme}
          customThemes={customThemes}
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
      )}
      {/* Konami Code unlock animation */}
      {showUnlockAnimation && <KonamiUnlockOverlay />}
      </Box>
    </ThemeProvider>
  );
}

export default AppDesktop;
