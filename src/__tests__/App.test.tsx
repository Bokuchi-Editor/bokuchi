import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { createTheme } from '@mui/material/styles';

// Mock useAppState with only the values App.tsx itself reads (conditionals,
// nested property access, arguments to real helpers like isDarkTheme and
// useRinExitButton). Everything that is merely forwarded to the mocked child
// components is intentionally left undefined.
vi.mock('../hooks/useAppState', () => ({
  useAppState: () => ({
    theme: 'default',
    currentTheme: createTheme(),
    isInitialized: true,
    isSettingsLoaded: true,
    isDragOver: false,
    rinActive: false,
    exitRin: vi.fn(),
    showUnlockAnimation: false,
    editorStatus: { line: 1, column: 1, totalCharacters: 0, selectedCharacters: 0, totalWords: 0, selectedWords: 0 },
    renameDialog: { open: false, filePath: '', currentName: '' },
    appSettings: {
      editor: { fontSize: 14, showLineNumbers: true, tabSize: 2, wordWrap: true, minimap: false, showFormattingBar: true },
      interface: {
        outlineEnabled: true,
        outlineDisplayMode: 'persistent',
        folderTreeDisplayMode: 'off',
        scrollSyncMode: 'editor-to-preview',
        tabCloseButtonPosition: 'right',
        tabNewButtonPosition: 'top',
      },
      advanced: { autoSave: true, showWhitespace: false, tableConversion: 'confirm' },
    },
    // Stored in handlersRef and used by the mount-time event listeners.
    setIsDragOver: vi.fn(),
    setSnackbar: vi.fn(),
    requestEditorFocus: vi.fn(),
    openFile: vi.fn(),
    handleNewTab: vi.fn(),
    handleSaveFile: vi.fn(),
    handleSaveFileAs: vi.fn(),
    handleSaveWithVariables: vi.fn(),
    handleHelpOpen: vi.fn(),
    t: (key: string) => key,
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
  // T-APP-01: the app shell mounts with all top-level regions in place.
  // This is a smoke test: children and useAppState are mocked, so it only
  // verifies that App.tsx composes without crashing.
  it('T-APP-01: renders header, content, dialogs, status bar and modal dialogs', () => {
    render(<AppDesktop />);
    expect(screen.getByTestId('app-header')).toBeInTheDocument();
    expect(screen.getByTestId('app-content')).toBeInTheDocument();
    expect(screen.getByTestId('app-dialogs')).toBeInTheDocument();
    expect(screen.getByTestId('status-bar')).toBeInTheDocument();
    expect(screen.getByTestId('recent-files')).toBeInTheDocument();
    expect(screen.getByTestId('rename-dialog')).toBeInTheDocument();
  });
});
