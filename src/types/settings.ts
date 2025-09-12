// エディター設定の型定義
export interface EditorSettings {
  fontSize: number;
  showLineNumbers: boolean;
  tabSize: number;
  wordWrap: boolean;
  minimap: boolean;
}

// 外観設定の型定義
export interface AppearanceSettings {
  theme: string;
  showLineNumbers: boolean;
}

// インターフェース設定の型定義
export interface InterfaceSettings {
  language: string;
  tabLayout: 'horizontal' | 'vertical';
  zoomLevel: number;
}

// 高度な設定の型定義
export interface AdvancedSettings {
  autoSave: boolean;
  showWhitespace: boolean;
  tableConversion: 'auto' | 'confirm' | 'off';
}

// Recent Files設定の型定義
export interface RecentFilesSettings {
  maxRecentFiles: number;
  showPreview: boolean;
  previewLength: number;
}

// 全設定の統合型定義
export interface AppSettings {
  editor: EditorSettings;
  appearance: AppearanceSettings;
  interface: InterfaceSettings;
  advanced: AdvancedSettings;
  recentFiles: RecentFilesSettings;
  globalVariables: Record<string, string>;
}

// デフォルト設定
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
