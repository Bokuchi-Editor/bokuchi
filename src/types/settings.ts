import { OutlineDisplayMode } from './outline';
import { FolderTreeDisplayMode } from './folderTree';

export type ScrollSyncMode = 'editor-to-preview' | 'bidirectional' | 'off';

// Editor settings type definition
export interface EditorSettings {
  fontSize: number;
  showLineNumbers: boolean;
  tabSize: number;
  wordWrap: boolean;
  minimap: boolean;
}

// Appearance settings type definition
export interface AppearanceSettings {
  theme: string;
  showLineNumbers: boolean;
}

// Interface settings type definition
export interface InterfaceSettings {
  language: string;
  tabLayout: 'horizontal' | 'vertical';
  tabCloseButtonPosition: 'left' | 'right';
  zoomLevel: number;
  outlineDisplayMode: OutlineDisplayMode;
  folderTreeDisplayMode: FolderTreeDisplayMode;
  folderTreeFileFilter: 'markdown' | 'all';
  scrollSyncMode: ScrollSyncMode;
}

// Rendering settings type definition
export interface RenderingSettings {
  enableKatex: boolean;
  enableMermaid: boolean;
  enableMarp: boolean;
}

// How the preview lays out tables.
// - equal: every column gets the same width; long content wraps inside cells (CSS table-layout: fixed).
// - auto-wrap: column widths follow content; long content still wraps so the table fits the pane.
// - auto-scroll: column widths follow content; the table can grow past the pane and scroll horizontally.
export type TableLayoutMode = 'equal' | 'auto-wrap' | 'auto-scroll';

// Preview settings type definition
export interface PreviewSettings {
  tableLayout: TableLayoutMode;
}

// Advanced settings type definition
export interface AdvancedSettings {
  autoSave: boolean;
  showWhitespace: boolean;
  tableConversion: 'auto' | 'confirm' | 'off';
}

// Recent files settings type definition
export interface RecentFilesSettings {
  maxRecentFiles: number;
  showPreview: boolean;
  previewLength: number;
}

// Combined application settings type definition
export interface AppSettings {
  editor: EditorSettings;
  appearance: AppearanceSettings;
  interface: InterfaceSettings;
  advanced: AdvancedSettings;
  rendering: RenderingSettings;
  preview: PreviewSettings;
  recentFiles: RecentFilesSettings;
  globalVariables: Record<string, string>;
}

// Default settings
export const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
  fontSize: 14,
  showLineNumbers: true,
  tabSize: 2,
  wordWrap: true,
  minimap: true,
};

export const DEFAULT_APPEARANCE_SETTINGS: AppearanceSettings = {
  theme: 'default',
  showLineNumbers: true,
};

export const DEFAULT_INTERFACE_SETTINGS: InterfaceSettings = {
  language: 'en',
  tabLayout: 'horizontal',
  tabCloseButtonPosition: 'right',
  zoomLevel: 1.0,
  outlineDisplayMode: 'persistent',
  folderTreeDisplayMode: 'off',
  folderTreeFileFilter: 'markdown',
  scrollSyncMode: 'editor-to-preview',
};

export const DEFAULT_ADVANCED_SETTINGS: AdvancedSettings = {
  autoSave: true,
  showWhitespace: false,
  tableConversion: 'confirm',
};

export const DEFAULT_RENDERING_SETTINGS: RenderingSettings = {
  enableKatex: true,
  enableMermaid: false,
  enableMarp: false,
};

export const DEFAULT_PREVIEW_SETTINGS: PreviewSettings = {
  tableLayout: 'auto-wrap',
};

export const DEFAULT_RECENT_FILES_SETTINGS: RecentFilesSettings = {
  maxRecentFiles: 20,
  showPreview: true,
  previewLength: 100,
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  editor: DEFAULT_EDITOR_SETTINGS,
  appearance: DEFAULT_APPEARANCE_SETTINGS,
  interface: DEFAULT_INTERFACE_SETTINGS,
  advanced: DEFAULT_ADVANCED_SETTINGS,
  rendering: DEFAULT_RENDERING_SETTINGS,
  preview: DEFAULT_PREVIEW_SETTINGS,
  recentFiles: DEFAULT_RECENT_FILES_SETTINGS,
  globalVariables: {},
};
