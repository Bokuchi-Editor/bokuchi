import { load, Store } from '@tauri-apps/plugin-store';
import { AppState } from '../types/tab';
import { ThemeName } from '../themes';
import { AppSettings, DEFAULT_APP_SETTINGS } from '../types/settings';
import { RecentFile } from '../types/recentFiles';

let store: Store | null = null;

const getStore = async () => {
  if (!store) {
    // Create a new store or load the existing one
    store = await load('.app-state.dat', {
      autoSave: false,
      defaults: {}
    });
  }
  return store;
};

export const storeApi = {
  // 状態を保存
  async saveState(state: AppState): Promise<void> {
    try {
      const storeInstance = await getStore();
      await storeInstance.set('appState', state);
      await storeInstance.save();
    } catch (error) {
      console.error('Failed to save state:', error);
      throw error;
    }
  },

  // 状態を読み込み
  async loadState(): Promise<AppState | null> {
    try {
      const storeInstance = await getStore();
      const state = await storeInstance.get('appState') as AppState;
      return state || null;
    } catch (error) {
      console.error('Failed to load state:', error);
      return null;
    }
  },

  // グローバル変数を保存
  async saveGlobalVariables(variables: Record<string, string>): Promise<void> {
    try {
      const storeInstance = await getStore();
      await storeInstance.set('globalVariables', variables);
      await storeInstance.save();
    } catch (error) {
      console.error('Failed to save global variables:', error);
      throw error;
    }
  },

  // グローバル変数を読み込み
  async loadGlobalVariables(): Promise<Record<string, string>> {
    try {
      const storeInstance = await getStore();
      const variables = await storeInstance.get('globalVariables') as Record<string, string>;
      return variables || {};
    } catch (error) {
      console.error('Failed to load global variables:', error);
      return {};
    }
  },

  // 言語設定を保存
  async saveLanguage(language: string): Promise<void> {
    try {
      const storeInstance = await getStore();
      await storeInstance.set('language', language);
      await storeInstance.save();
    } catch (error) {
      console.error('Failed to save language:', error);
      throw error;
    }
  },

  // 言語設定を読み込み
  async loadLanguage(): Promise<string> {
    try {
      const storeInstance = await getStore();
      const language = await storeInstance.get('language') as string;
      return language || 'en';
    } catch (error) {
      console.error('Failed to load language:', error);
      return 'en';
    }
  },

  // ズーム設定を保存
  async saveZoomLevel(zoomLevel: number): Promise<void> {
    try {
      const storeInstance = await getStore();
      await storeInstance.set('zoomLevel', zoomLevel);
      await storeInstance.save();
    } catch (error) {
      console.error('Failed to save zoom level:', error);
      throw error;
    }
  },

  // ズーム設定を読み込み
  async loadZoomLevel(): Promise<number> {
    try {
      const storeInstance = await getStore();
      const zoomLevel = await storeInstance.get('zoomLevel') as number;
      return zoomLevel || 1.0;
    } catch (error) {
      console.error('Failed to load zoom level:', error);
      return 1.0;
    }
  },

  // ダークモード設定を保存
  async saveDarkMode(darkMode: boolean): Promise<void> {
    try {
      const storeInstance = await getStore();
      await storeInstance.set('darkMode', darkMode);
      await storeInstance.save();
    } catch (error) {
      console.error('Failed to save dark mode:', error);
      throw error;
    }
  },

  // ダークモード設定を読み込み
  async loadDarkMode(): Promise<boolean> {
    try {
      const storeInstance = await getStore();
      const darkMode = await storeInstance.get('darkMode') as boolean;
      return darkMode || false;
    } catch (error) {
      console.error('Failed to load dark mode:', error);
      return false;
    }
  },

  // テーマ設定を保存
  async saveTheme(theme: ThemeName): Promise<void> {
    try {
      const storeInstance = await getStore();
      await storeInstance.set('theme', theme);
      await storeInstance.save();
    } catch (error) {
      console.error('Failed to save theme:', error);
      throw error;
    }
  },

  // テーマ設定を読み込み
  async loadTheme(): Promise<ThemeName> {
    try {
      const storeInstance = await getStore();
      const theme = await storeInstance.get('theme') as ThemeName;
      return theme || 'default';
    } catch (error) {
      console.error('Failed to load theme:', error);
      return 'default';
    }
  },

  // タブレイアウト設定を保存
  async saveTabLayout(tabLayout: 'horizontal' | 'vertical'): Promise<void> {
    try {
      const storeInstance = await getStore();
      await storeInstance.set('tabLayout', tabLayout);
      await storeInstance.save();
    } catch (error) {
      console.error('Failed to save tab layout:', error);
      throw error;
    }
  },

  // タブレイアウト設定を読み込み
  async loadTabLayout(): Promise<'horizontal' | 'vertical'> {
    try {
      const storeInstance = await getStore();
      const tabLayout = await storeInstance.get('tabLayout') as 'horizontal' | 'vertical';
      return tabLayout || 'horizontal';
    } catch (error) {
      console.error('Failed to load tab layout:', error);
      return 'horizontal';
    }
  },

  // ビューモード設定を保存
  async saveViewMode(viewMode: 'split' | 'editor' | 'preview'): Promise<void> {
    try {
      const storeInstance = await getStore();
      await storeInstance.set('viewMode', viewMode);
      await storeInstance.save();
    } catch (error) {
      console.error('Failed to save view mode:', error);
      throw error;
    }
  },

  // ビューモード設定を読み込み
  async loadViewMode(): Promise<'split' | 'editor' | 'preview'> {
    try {
      const storeInstance = await getStore();
      const viewMode = await storeInstance.get('viewMode') as 'split' | 'editor' | 'preview';
      return viewMode || 'split';
    } catch (error) {
      console.error('Failed to load view mode:', error);
      return 'split';
    }
  },

  // 初期状態を作成
  createInitialState(): AppState {
    return {
      tabs: [{
        id: '1',
        title: 'Untitled',
        content: '',
        isNew: true,
        isModified: false,
      }],
      activeTabId: '1',
      lastOpenedAt: Date.now(),
    };
  },

  // アプリケーション設定を保存
  async saveAppSettings(settings: AppSettings): Promise<void> {
    try {
      const storeInstance = await getStore();
      await storeInstance.set('appSettings', settings);
      await storeInstance.save();
    } catch (error) {
      console.error('Failed to save app settings:', error);
      throw error;
    }
  },

  // アプリケーション設定を読み込み
  async loadAppSettings(): Promise<AppSettings> {
    try {
      const storeInstance = await getStore();
      const settings = await storeInstance.get('appSettings') as AppSettings;

      // デフォルト設定とマージして、不足している項目を補完
      const mergedSettings = {
        ...DEFAULT_APP_SETTINGS,
        ...settings,
        editor: { ...DEFAULT_APP_SETTINGS.editor, ...settings?.editor },
        appearance: { ...DEFAULT_APP_SETTINGS.appearance, ...settings?.appearance },
        interface: { ...DEFAULT_APP_SETTINGS.interface, ...settings?.interface },
        advanced: { ...DEFAULT_APP_SETTINGS.advanced, ...settings?.advanced },
        globalVariables: { ...DEFAULT_APP_SETTINGS.globalVariables, ...settings?.globalVariables },
      };

      return mergedSettings;
    } catch (error) {
      console.error('Failed to load app settings:', error);
      return DEFAULT_APP_SETTINGS;
    }
  },

  // 設定をリセット
  async resetAppSettings(): Promise<void> {
    try {
      const storeInstance = await getStore();
      await storeInstance.set('appSettings', DEFAULT_APP_SETTINGS);
      await storeInstance.save();
    } catch (error) {
      console.error('Failed to reset app settings:', error);
      throw error;
    }
  },

  // 設定をエクスポート
  async exportAppSettings(): Promise<string> {
    try {
      const settings = await this.loadAppSettings();
      return JSON.stringify(settings, null, 2);
    } catch (error) {
      console.error('Failed to export app settings:', error);
      throw error;
    }
  },

  // 設定をインポート
  async importAppSettings(settingsJson: string): Promise<void> {
    try {
      const settings = JSON.parse(settingsJson) as AppSettings;
      await this.saveAppSettings(settings);
    } catch (error) {
      console.error('Failed to import app settings:', error);
      throw error;
    }
  },

  // Recent Files関連のメソッド
  async saveRecentFiles(recentFiles: RecentFile[]): Promise<void> {
    try {
      const storeInstance = await getStore();
      await storeInstance.set('recentFiles', recentFiles);
      await storeInstance.save();
    } catch (error) {
      console.error('Failed to save recent files:', error);
      throw error;
    }
  },

  async loadRecentFiles(): Promise<RecentFile[]> {
    try {
      const storeInstance = await getStore();
      const recentFiles = await storeInstance.get<RecentFile[]>('recentFiles');
      return recentFiles || [];
    } catch (error) {
      console.error('Failed to load recent files:', error);
      return [];
    }
  },

  async addRecentFile(filePath: string, fileName: string, content: string, fileSize?: number, lastModified?: number): Promise<void> {
    try {
      const recentFiles = await this.loadRecentFiles();
      const appSettings = await this.loadAppSettings();
      const settings = appSettings.recentFiles;

      // 既存のファイルかチェック
      const existingIndex = recentFiles.findIndex(file => file.filePath === filePath);

      const now = Date.now();
      const preview = content.substring(0, settings.previewLength);

      if (existingIndex >= 0) {
        // 既存ファイルの場合は更新
        recentFiles[existingIndex] = {
          ...recentFiles[existingIndex],
          lastOpened: now,
          openCount: recentFiles[existingIndex].openCount + 1,
          lastModified,
          fileSize,
          preview,
        };
      } else {
        // 新規ファイルの場合は追加
        const newFile: RecentFile = {
          id: `recent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          filePath,
          fileName,
          lastOpened: now,
          openCount: 1,
          lastModified,
          fileSize,
          preview,
        };
        recentFiles.unshift(newFile);
      }

      // 最終更新時刻順でソート
      recentFiles.sort((a, b) => b.lastOpened - a.lastOpened);

      // 最大ファイル数を超えた場合は古いものを削除
      if (recentFiles.length > settings.maxRecentFiles) {
        recentFiles.splice(settings.maxRecentFiles);
      }

      await this.saveRecentFiles(recentFiles);
    } catch (error) {
      console.error('Failed to add recent file:', error);
      throw error;
    }
  },

  async removeRecentFile(filePath: string): Promise<void> {
    try {
      const recentFiles = await this.loadRecentFiles();
      const filteredFiles = recentFiles.filter(file => file.filePath !== filePath);
      await this.saveRecentFiles(filteredFiles);
    } catch (error) {
      console.error('Failed to remove recent file:', error);
      throw error;
    }
  },

  async clearRecentFiles(): Promise<void> {
    try {
      await this.saveRecentFiles([]);
    } catch (error) {
      console.error('Failed to clear recent files:', error);
      throw error;
    }
  },

};
