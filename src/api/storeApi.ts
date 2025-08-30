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
