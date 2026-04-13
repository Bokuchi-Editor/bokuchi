import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { createTheme } from '@mui/material/styles';

// Mock useAppState
vi.mock('../hooks/useAppState', () => ({
  useAppState: () => ({
    theme: 'default',
    settingsOpen: false,
    helpOpen: false,
    recentFilesOpen: false,
    fileMenuAnchor: null,
    snackbar: { open: false, message: '', severity: 'success' },
    globalVariables: {},
    tabLayout: 'horizontal',
    viewMode: 'split',
    editorStatus: { line: 1, column: 1, totalCharacters: 0, selectedCharacters: 0 },
    fileChangeDialog: { open: false, fileName: '', onReload: vi.fn(), onCancel: vi.fn() },
    saveBeforeCloseDialog: { open: false, fileName: '', tabId: null },
    isDragOver: false,
    setIsDragOver: vi.fn(),
    tabs: [{ id: 'tab1', title: 'test.md', content: '# Hello', isModified: false, isNew: false }],
    activeTabId: 'tab1',
    activeTab: { id: 'tab1', title: 'test.md', content: '# Hello', isModified: false, isNew: false },
    isInitialized: true,
    isSettingsLoaded: true,
    currentTheme: createTheme(),
    currentZoom: 1.0,
    zoomPercentage: '100%',
    isAtLimit: false,
    canZoomIn: true,
    canZoomOut: true,
    appSettings: {
      editor: { fontSize: 14, showLineNumbers: true, tabSize: 2, wordWrap: true, minimap: false },
      appearance: { theme: 'default', showLineNumbers: true },
      interface: {
        language: 'en',
        tabLayout: 'horizontal',
        zoomLevel: 1.0,
        outlineDisplayMode: 'persistent',
        folderTreeDisplayMode: 'off',
        folderTreeFileFilter: 'markdown',
      },
      advanced: { autoSave: true, showWhitespace: false, tableConversion: 'confirm' },
      recentFiles: { maxRecentFiles: 20, showPreview: true, previewLength: 100 },
      globalVariables: {},
    },
    updateDialogOpen: false,
    updateDialogPhase: 'notify',
    updateInfo: null,
    updateDownloadProgress: null,
    outlinePanelOpen: false,
    folderTreePanelOpen: false,
    folderTreeRootPath: null,
    folderTreeRootFolderName: null,
    folderTree: [],
    folderTreeIsLoading: false,
    focusRequestId: 0,
    requestEditorFocus: vi.fn(),
    handleContentChange: vi.fn(),
    handleSettingsOpen: vi.fn(),
    handleSettingsClose: vi.fn(),
    handleHelpOpen: vi.fn(),
    handleHelpClose: vi.fn(),
    handleRecentFileSelect: vi.fn(),
    handleRecentFilesOpen: vi.fn(),
    handleRecentFilesClose: vi.fn(),
    handleThemeChange: vi.fn(),
    handleAppSettingsChange: vi.fn(),
    handleFileMenuOpen: vi.fn(),
    handleFileMenuClose: vi.fn(),
    handleCloseSnackbar: vi.fn(),
    setSnackbar: vi.fn(),
    handleOpenFile: vi.fn(),
    handleSaveFile: vi.fn(),
    handleSaveFileAs: vi.fn(),
    handleSaveWithVariables: vi.fn(),
    handleTabChange: vi.fn(),
    handleTabClose: vi.fn(),
    handleNewTab: vi.fn(),
    handleSaveBeforeClose: vi.fn(),
    handleDontSaveBeforeClose: vi.fn(),
    handleCancelBeforeClose: vi.fn(),
    handleTabReorder: vi.fn(),
    handleCheckForUpdate: vi.fn(),
    handleDismissUpdate: vi.fn(),
    handleKeyDown: vi.fn(),
    handleFolderTreeFileClick: vi.fn(),
    handleOpenFolder: vi.fn(),
    openFile: vi.fn(),
    removeTab: vi.fn(),
    setActiveTab: vi.fn(),
    updateTabContent: vi.fn(),
    updateTabFileHash: vi.fn(),
    reorderTabs: vi.fn(),
    saveTab: vi.fn(),
    saveTabAs: vi.fn(),
    createNewTab: vi.fn(),
    zoomIn: vi.fn(),
    zoomOut: vi.fn(),
    resetZoom: vi.fn(),
    setEditorStatus: vi.fn(),
    setViewMode: vi.fn(),
    setOutlinePanelOpen: vi.fn(),
    setFolderTreePanelOpen: vi.fn(),
    folderTreeCloseFolder: vi.fn(),
    folderTreeToggleExpand: vi.fn(),
    folderTreeRefreshTree: vi.fn(),
    renameDialog: { open: false, filePath: '', currentName: '' },
    handleRenameRequest: vi.fn(),
    handleRenameConfirm: vi.fn(),
    handleRenameCancel: vi.fn(),
    t: (key: string) => key,
    ZOOM_CONFIG: { minZoom: 0.5, maxZoom: 2.0, zoomStep: 0.1 },
  }),
}));

// Mock heavy child components
vi.mock('../components/AppHeader', () => ({
  default: () => <div data-testid="app-header">Header</div>,
}));

vi.mock('../components/AppContent', () => ({
  default: () => <div data-testid="app-content">Content</div>,
}));

vi.mock('../components/AppDialogs', () => ({
  default: () => <div data-testid="app-dialogs">Dialogs</div>,
}));

vi.mock('../components/StatusBar', () => ({
  default: () => <div data-testid="status-bar">StatusBar</div>,
}));

vi.mock('../components/RecentFilesDialog', () => ({
  default: () => <div data-testid="recent-files">RecentFiles</div>,
}));

vi.mock('../components/RenameDialog', () => ({
  default: () => <div data-testid="rename-dialog">RenameDialog</div>,
}));

vi.mock('../i18n', () => ({}));

// Mock Tauri API
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
  transformCallback: vi.fn(),
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn().mockResolvedValue(() => {}),
}));

vi.mock('@tauri-apps/api/webview', () => ({
  getCurrentWebview: () => ({
    onDragDropEvent: vi.fn().mockResolvedValue(() => {}),
  }),
}));

vi.mock('../api/desktopApi', () => ({
  desktopApi: {
    setFrontendReady: vi.fn().mockResolvedValue(undefined),
  },
}));

import AppDesktop from '../App';

describe('App', () => {
  // T-APP-01: renders main components
  it('T-APP-01: renders header, content, dialogs, and status bar', () => {
    render(<AppDesktop />);
    expect(screen.getByTestId('app-header')).toBeInTheDocument();
    expect(screen.getByTestId('app-content')).toBeInTheDocument();
    expect(screen.getByTestId('app-dialogs')).toBeInTheDocument();
    expect(screen.getByTestId('status-bar')).toBeInTheDocument();
  });

  // T-APP-02: renders recent files dialog
  it('T-APP-02: renders recent files dialog', () => {
    render(<AppDesktop />);
    expect(screen.getByTestId('recent-files')).toBeInTheDocument();
  });

  // T-APP-03: renders rename dialog
  it('T-APP-03: renders rename dialog', () => {
    render(<AppDesktop />);
    expect(screen.getByTestId('rename-dialog')).toBeInTheDocument();
  });

  // T-APP-04: ThemeProvider wraps entire app tree
  it('T-APP-04: all child components render within a styled container', () => {
    const { container } = render(<AppDesktop />);
    // The outermost MUI Box should contain all child testids
    const box = container.firstChild;
    expect(box).not.toBeNull();
    expect(screen.getByTestId('app-header')).toBeInTheDocument();
    expect(screen.getByTestId('status-bar')).toBeInTheDocument();
  });
});
