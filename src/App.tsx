// import React from 'react';
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
          }}
          onTabChange={handleTabChange}
          onTabClose={handleTabClose}
          onNewTab={handleNewTab}
          onTabReorder={handleTabReorder}
          onContentChange={handleContentChange}
          onStatusChange={setEditorStatus}
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
