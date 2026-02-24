import { OutlineDisplayMode } from './outline';

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
  zoomLevel: number;
  outlineDisplayMode: OutlineDisplayMode;
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
  recentFiles: RecentFilesSettings;
  globalVariables: Record<string, string>;
}

// Default settings
export const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
  fontSize: 14,
  showLineNumbers: true,
  tabSize: 2,
  wordWrap: true,
  minimap: false,
};

export const DEFAULT_APPEARANCE_SETTINGS: AppearanceSettings = {
  theme: 'default',
  showLineNumbers: true,
};

export const DEFAULT_INTERFACE_SETTINGS: InterfaceSettings = {
  language: 'en',
  tabLayout: 'horizontal',
  zoomLevel: 1.0,
  outlineDisplayMode: 'persistent',
};

export const DEFAULT_ADVANCED_SETTINGS: AdvancedSettings = {
  autoSave: true,
  showWhitespace: false,
  tableConversion: 'confirm',
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
  recentFiles: DEFAULT_RECENT_FILES_SETTINGS,
  globalVariables: {},
};
