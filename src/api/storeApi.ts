import { load, Store } from '@tauri-apps/plugin-store';
import { AppState } from '../types/tab';
import { ThemeName } from '../themes';
import { AppSettings, DEFAULT_APP_SETTINGS } from '../types/settings';

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
      console.log('Saving state:', state);
      const storeInstance = await getStore();
      await storeInstance.set('appState', state);
      await storeInstance.save();
      console.log('State saved successfully');
    } catch (error) {
      console.error('Failed to save state:', error);
      throw error;
    }
  },

  // 状態を読み込み
  async loadState(): Promise<AppState | null> {
    try {
      console.log('Loading state...');
      const storeInstance = await getStore();
      const state = await storeInstance.get('appState') as AppState;
      console.log('Loaded state:', state);
      return state || null;
    } catch (error) {
      console.error('Failed to load state:', error);
      return null;
    }
  },

  // グローバル変数を保存
  async saveGlobalVariables(variables: Record<string, string>): Promise<void> {
    try {
      console.log('Saving global variables:', variables);
      const storeInstance = await getStore();
      await storeInstance.set('globalVariables', variables);
      await storeInstance.save();
      console.log('Global variables saved successfully');
    } catch (error) {
      console.error('Failed to save global variables:', error);
      throw error;
    }
  },

  // グローバル変数を読み込み
  async loadGlobalVariables(): Promise<Record<string, string>> {
    try {
      console.log('Loading global variables...');
      const storeInstance = await getStore();
      const variables = await storeInstance.get('globalVariables') as Record<string, string>;
      console.log('Loaded global variables:', variables);
      return variables || {};
    } catch (error) {
      console.error('Failed to load global variables:', error);
      return {};
    }
  },

  // 言語設定を保存
  async saveLanguage(language: string): Promise<void> {
    try {
      console.log('Saving language:', language);
      const storeInstance = await getStore();
      await storeInstance.set('language', language);
      await storeInstance.save();
      console.log('Language saved successfully');
    } catch (error) {
      console.error('Failed to save language:', error);
      throw error;
    }
  },

  // 言語設定を読み込み
  async loadLanguage(): Promise<string> {
    try {
      console.log('Loading language...');
      const storeInstance = await getStore();
      const language = await storeInstance.get('language') as string;
      console.log('Loaded language:', language);
      return language || 'en';
    } catch (error) {
      console.error('Failed to load language:', error);
      return 'en';
    }
  },

  // ズーム設定を保存
  async saveZoomLevel(zoomLevel: number): Promise<void> {
    try {
      console.log('Saving zoom level:', zoomLevel);
      const storeInstance = await getStore();
      await storeInstance.set('zoomLevel', zoomLevel);
      await storeInstance.save();
      console.log('Zoom level saved successfully');
    } catch (error) {
      console.error('Failed to save zoom level:', error);
      throw error;
    }
  },

  // ズーム設定を読み込み
  async loadZoomLevel(): Promise<number> {
    try {
      console.log('Loading zoom level...');
      const storeInstance = await getStore();
      const zoomLevel = await storeInstance.get('zoomLevel') as number;
      console.log('Loaded zoom level:', zoomLevel);
      return zoomLevel || 1.0;
    } catch (error) {
      console.error('Failed to load zoom level:', error);
      return 1.0;
    }
  },

  // ダークモード設定を保存
  async saveDarkMode(darkMode: boolean): Promise<void> {
    try {
      console.log('Saving dark mode:', darkMode);
      const storeInstance = await getStore();
      await storeInstance.set('darkMode', darkMode);
      await storeInstance.save();
      console.log('Dark mode saved successfully');
    } catch (error) {
      console.error('Failed to save dark mode:', error);
      throw error;
    }
  },

  // ダークモード設定を読み込み
  async loadDarkMode(): Promise<boolean> {
    try {
      console.log('Loading dark mode...');
      const storeInstance = await getStore();
      const darkMode = await storeInstance.get('darkMode') as boolean;
      console.log('Loaded dark mode:', darkMode);
      return darkMode || false;
    } catch (error) {
      console.error('Failed to load dark mode:', error);
      return false;
    }
  },

  // テーマ設定を保存
  async saveTheme(theme: ThemeName): Promise<void> {
    try {
      console.log('Saving theme:', theme);
      const storeInstance = await getStore();
      await storeInstance.set('theme', theme);
      await storeInstance.save();
      console.log('Theme saved successfully');
    } catch (error) {
      console.error('Failed to save theme:', error);
      throw error;
    }
  },

  // テーマ設定を読み込み
  async loadTheme(): Promise<ThemeName> {
    try {
      console.log('Loading theme...');
      const storeInstance = await getStore();
      const theme = await storeInstance.get('theme') as ThemeName;
      console.log('Loaded theme:', theme);
      return theme || 'default';
    } catch (error) {
      console.error('Failed to load theme:', error);
      return 'default';
    }
  },

  // タブレイアウト設定を保存
  async saveTabLayout(tabLayout: 'horizontal' | 'vertical'): Promise<void> {
    try {
      console.log('Saving tab layout:', tabLayout);
      const storeInstance = await getStore();
      await storeInstance.set('tabLayout', tabLayout);
      await storeInstance.save();
      console.log('Tab layout saved successfully');
    } catch (error) {
      console.error('Failed to save tab layout:', error);
      throw error;
    }
  },

  // タブレイアウト設定を読み込み
  async loadTabLayout(): Promise<'horizontal' | 'vertical'> {
    try {
      console.log('Loading tab layout...');
      const storeInstance = await getStore();
      const tabLayout = await storeInstance.get('tabLayout') as 'horizontal' | 'vertical';
      console.log('Loaded tab layout:', tabLayout);
      return tabLayout || 'horizontal';
    } catch (error) {
      console.error('Failed to load tab layout:', error);
      return 'horizontal';
    }
  },

  // ビューモード設定を保存
  async saveViewMode(viewMode: 'split' | 'editor' | 'preview'): Promise<void> {
    try {
      console.log('Saving view mode:', viewMode);
      const storeInstance = await getStore();
      await storeInstance.set('viewMode', viewMode);
      await storeInstance.save();
      console.log('View mode saved successfully');
    } catch (error) {
      console.error('Failed to save view mode:', error);
      throw error;
    }
  },

  // ビューモード設定を読み込み
  async loadViewMode(): Promise<'split' | 'editor' | 'preview'> {
    try {
      console.log('Loading view mode...');
      const storeInstance = await getStore();
      const viewMode = await storeInstance.get('viewMode') as 'split' | 'editor' | 'preview';
      console.log('Loaded view mode:', viewMode);
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
      console.log('Saving app settings:', settings);
      const storeInstance = await getStore();
      await storeInstance.set('appSettings', settings);
      await storeInstance.save();
      console.log('App settings saved successfully');
    } catch (error) {
      console.error('Failed to save app settings:', error);
      throw error;
    }
  },

  // アプリケーション設定を読み込み
  async loadAppSettings(): Promise<AppSettings> {
    try {
      console.log('Loading app settings...');
      const storeInstance = await getStore();
      const settings = await storeInstance.get('appSettings') as AppSettings;
      console.log('Loaded app settings:', settings);

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
      console.log('Resetting app settings...');
      const storeInstance = await getStore();
      await storeInstance.set('appSettings', DEFAULT_APP_SETTINGS);
      await storeInstance.save();
      console.log('App settings reset successfully');
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
      console.log('App settings imported successfully');
    } catch (error) {
      console.error('Failed to import app settings:', error);
      throw error;
    }
  },
};
