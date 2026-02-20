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
  // Save state
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

  // Load state
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

  // Save global variables
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

  // Load global variables
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

  // Save language setting
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

  // Load language setting
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

  // Save zoom level
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

  // Load zoom level
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

  // Save dark mode setting
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

  // Load dark mode setting
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

  // Save theme setting
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

  // Load theme setting
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

  // Save tab layout setting
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

  // Load tab layout setting
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

  // Save view mode setting
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

  // Load view mode setting
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

  // Create initial state
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

  // Save application settings
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

  // Load application settings
  async loadAppSettings(): Promise<AppSettings> {
    try {
      const storeInstance = await getStore();
      const settings = await storeInstance.get('appSettings') as AppSettings;

      // Merge with default settings to fill in missing fields
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

  // Reset settings
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

  // Export settings
  async exportAppSettings(): Promise<string> {
    try {
      const settings = await this.loadAppSettings();
      return JSON.stringify(settings, null, 2);
    } catch (error) {
      console.error('Failed to export app settings:', error);
      throw error;
    }
  },

  // Import settings
  async importAppSettings(settingsJson: string): Promise<void> {
    try {
      const settings = JSON.parse(settingsJson) as AppSettings;
      await this.saveAppSettings(settings);
    } catch (error) {
      console.error('Failed to import app settings:', error);
      throw error;
    }
  },

  // Recent files methods
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

      // Check if the file already exists
      const existingIndex = recentFiles.findIndex(file => file.filePath === filePath);

      const now = Date.now();
      const preview = content.substring(0, settings.previewLength);

      if (existingIndex >= 0) {
        // Update existing file
        recentFiles[existingIndex] = {
          ...recentFiles[existingIndex],
          lastOpened: now,
          openCount: recentFiles[existingIndex].openCount + 1,
          lastModified,
          fileSize,
          preview,
        };
      } else {
        // Add new file
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

      // Sort by last opened time
      recentFiles.sort((a, b) => b.lastOpened - a.lastOpened);

      // Remove old entries if exceeding max count
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
