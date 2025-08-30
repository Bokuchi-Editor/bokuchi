import { load } from '@tauri-apps/plugin-store';
import { AppState } from '../types/tab';

let store: any = null;

const getStore = async () => {
  if (!store) {
    // Create a new store or load the existing one
    store = await load('.app-state.dat', { autoSave: false });
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
      const state = await storeInstance.get<AppState>('appState');
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
      const variables = await storeInstance.get<Record<string, string>>('globalVariables');
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
      const language = await storeInstance.get<string>('language');
      console.log('Loaded language:', language);
      return language || 'en';
    } catch (error) {
      console.error('Failed to load language:', error);
      return 'en';
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
      const darkMode = await storeInstance.get<boolean>('darkMode');
      console.log('Loaded dark mode:', darkMode);
      return darkMode || false;
    } catch (error) {
      console.error('Failed to load dark mode:', error);
      return false;
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
      const tabLayout = await storeInstance.get<'horizontal' | 'vertical'>('tabLayout');
      console.log('Loaded tab layout:', tabLayout);
      return tabLayout || 'horizontal';
    } catch (error) {
      console.error('Failed to load tab layout:', error);
      return 'horizontal';
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
};
