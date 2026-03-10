import { describe, it, expect, vi, beforeEach } from 'vitest';
import { load } from '@tauri-apps/plugin-store';
import { storeApi } from '../storeApi';
import { DEFAULT_APP_SETTINGS } from '../../types/settings';

vi.mock('@tauri-apps/plugin-store');

const mockStore = {
  get: vi.fn(),
  set: vi.fn(),
  save: vi.fn(),
};

beforeEach(() => {
  vi.mocked(load).mockResolvedValue(mockStore as never);
  mockStore.get.mockReset().mockResolvedValue(null);
  mockStore.set.mockReset().mockResolvedValue(undefined);
  mockStore.save.mockReset().mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// saveState / loadState
// ---------------------------------------------------------------------------
describe('storeApi.saveState', () => {
  it('stores and saves appState', async () => {
    const state = { tabs: [], activeTabId: null, lastOpenedAt: 0 };
    await storeApi.saveState(state);
    expect(mockStore.set).toHaveBeenCalledWith('appState', state);
    expect(mockStore.save).toHaveBeenCalled();
  });

  it('throws on store error', async () => {
    mockStore.set.mockRejectedValue(new Error('write fail'));
    await expect(storeApi.saveState({ tabs: [], activeTabId: null, lastOpenedAt: 0 }))
      .rejects.toThrow('write fail');
  });
});

describe('storeApi.loadState', () => {
  it('returns stored state', async () => {
    const state = { tabs: [{ id: '1' }], activeTabId: '1', lastOpenedAt: 100 };
    mockStore.get.mockResolvedValue(state);
    const result = await storeApi.loadState();
    expect(result).toEqual(state);
  });

  it('returns null when nothing stored', async () => {
    mockStore.get.mockResolvedValue(null);
    const result = await storeApi.loadState();
    expect(result).toBeNull();
  });

  it('returns null on error', async () => {
    mockStore.get.mockRejectedValue(new Error('read fail'));
    const result = await storeApi.loadState();
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// saveGlobalVariables / loadGlobalVariables
// ---------------------------------------------------------------------------
describe('storeApi.saveGlobalVariables', () => {
  it('stores variables', async () => {
    await storeApi.saveGlobalVariables({ foo: 'bar' });
    expect(mockStore.set).toHaveBeenCalledWith('globalVariables', { foo: 'bar' });
    expect(mockStore.save).toHaveBeenCalled();
  });
});

describe('storeApi.loadGlobalVariables', () => {
  it('returns stored variables', async () => {
    mockStore.get.mockResolvedValue({ foo: 'bar' });
    expect(await storeApi.loadGlobalVariables()).toEqual({ foo: 'bar' });
  });

  it('returns empty object when null', async () => {
    mockStore.get.mockResolvedValue(null);
    expect(await storeApi.loadGlobalVariables()).toEqual({});
  });

  it('returns empty object on error', async () => {
    mockStore.get.mockRejectedValue(new Error('fail'));
    expect(await storeApi.loadGlobalVariables()).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// saveLanguage / loadLanguage
// ---------------------------------------------------------------------------
describe('storeApi.saveLanguage', () => {
  it('stores language', async () => {
    await storeApi.saveLanguage('ja');
    expect(mockStore.set).toHaveBeenCalledWith('language', 'ja');
  });
});

describe('storeApi.loadLanguage', () => {
  it('returns stored language', async () => {
    mockStore.get.mockResolvedValue('ja');
    expect(await storeApi.loadLanguage()).toBe('ja');
  });

  it('returns "en" as default', async () => {
    mockStore.get.mockResolvedValue(null);
    expect(await storeApi.loadLanguage()).toBe('en');
  });

  it('returns "en" on error', async () => {
    mockStore.get.mockRejectedValue(new Error('fail'));
    expect(await storeApi.loadLanguage()).toBe('en');
  });
});

// ---------------------------------------------------------------------------
// saveZoomLevel / loadZoomLevel
// ---------------------------------------------------------------------------
describe('storeApi.saveZoomLevel', () => {
  it('stores zoom level', async () => {
    await storeApi.saveZoomLevel(1.5);
    expect(mockStore.set).toHaveBeenCalledWith('zoomLevel', 1.5);
  });
});

describe('storeApi.loadZoomLevel', () => {
  it('returns stored zoom', async () => {
    mockStore.get.mockResolvedValue(1.5);
    expect(await storeApi.loadZoomLevel()).toBe(1.5);
  });

  it('returns 1.0 as default', async () => {
    mockStore.get.mockResolvedValue(null);
    expect(await storeApi.loadZoomLevel()).toBe(1.0);
  });

  it('returns 1.0 on error', async () => {
    mockStore.get.mockRejectedValue(new Error('fail'));
    expect(await storeApi.loadZoomLevel()).toBe(1.0);
  });
});

// ---------------------------------------------------------------------------
// saveTheme / loadTheme
// ---------------------------------------------------------------------------
describe('storeApi.saveTheme', () => {
  it('stores theme', async () => {
    await storeApi.saveTheme('dark');
    expect(mockStore.set).toHaveBeenCalledWith('theme', 'dark');
  });
});

describe('storeApi.loadTheme', () => {
  it('returns stored theme', async () => {
    mockStore.get.mockResolvedValue('darcula');
    expect(await storeApi.loadTheme()).toBe('darcula');
  });

  it('returns "default" when null', async () => {
    mockStore.get.mockResolvedValue(null);
    expect(await storeApi.loadTheme()).toBe('default');
  });
});

// ---------------------------------------------------------------------------
// saveDarkMode / loadDarkMode
// ---------------------------------------------------------------------------
describe('storeApi.loadDarkMode', () => {
  it('returns stored value', async () => {
    mockStore.get.mockResolvedValue(true);
    expect(await storeApi.loadDarkMode()).toBe(true);
  });

  it('returns false as default', async () => {
    mockStore.get.mockResolvedValue(null);
    expect(await storeApi.loadDarkMode()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// saveTabLayout / loadTabLayout
// ---------------------------------------------------------------------------
describe('storeApi.loadTabLayout', () => {
  it('returns stored layout', async () => {
    mockStore.get.mockResolvedValue('vertical');
    expect(await storeApi.loadTabLayout()).toBe('vertical');
  });

  it('returns "horizontal" as default', async () => {
    mockStore.get.mockResolvedValue(null);
    expect(await storeApi.loadTabLayout()).toBe('horizontal');
  });
});

// ---------------------------------------------------------------------------
// saveViewMode / loadViewMode
// ---------------------------------------------------------------------------
describe('storeApi.loadViewMode', () => {
  it('returns stored mode', async () => {
    mockStore.get.mockResolvedValue('preview');
    expect(await storeApi.loadViewMode()).toBe('preview');
  });

  it('returns "split" as default', async () => {
    mockStore.get.mockResolvedValue(null);
    expect(await storeApi.loadViewMode()).toBe('split');
  });
});

// ---------------------------------------------------------------------------
// createInitialState
// ---------------------------------------------------------------------------
describe('storeApi.createInitialState', () => {
  it('returns state with one default tab', () => {
    const state = storeApi.createInitialState();
    expect(state.tabs).toHaveLength(1);
    expect(state.activeTabId).toBe('1');
    expect(state.tabs[0].isNew).toBe(true);
    expect(state.tabs[0].content).toBe('');
    expect(state.lastOpenedAt).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// loadAppSettings (merge logic)
// ---------------------------------------------------------------------------
describe('storeApi.loadAppSettings', () => {
  it('returns full default settings when nothing stored', async () => {
    mockStore.get.mockResolvedValue(null);
    const settings = await storeApi.loadAppSettings();
    expect(settings.editor).toEqual(DEFAULT_APP_SETTINGS.editor);
    expect(settings.appearance).toEqual(DEFAULT_APP_SETTINGS.appearance);
    expect(settings.interface).toEqual(DEFAULT_APP_SETTINGS.interface);
    expect(settings.advanced).toEqual(DEFAULT_APP_SETTINGS.advanced);
  });

  it('merges partial stored settings with defaults', async () => {
    mockStore.get.mockResolvedValue({
      editor: { fontSize: 18 },
    });
    const settings = await storeApi.loadAppSettings();
    expect(settings.editor.fontSize).toBe(18);
    expect(settings.editor.tabSize).toBe(DEFAULT_APP_SETTINGS.editor.tabSize);
    expect(settings.advanced).toEqual(DEFAULT_APP_SETTINGS.advanced);
  });

  it('returns defaults on error', async () => {
    mockStore.get.mockRejectedValue(new Error('fail'));
    const settings = await storeApi.loadAppSettings();
    expect(settings).toEqual(DEFAULT_APP_SETTINGS);
  });
});

// ---------------------------------------------------------------------------
// saveAppSettings / resetAppSettings
// ---------------------------------------------------------------------------
describe('storeApi.saveAppSettings', () => {
  it('stores settings', async () => {
    await storeApi.saveAppSettings(DEFAULT_APP_SETTINGS);
    expect(mockStore.set).toHaveBeenCalledWith('appSettings', DEFAULT_APP_SETTINGS);
    expect(mockStore.save).toHaveBeenCalled();
  });
});

describe('storeApi.resetAppSettings', () => {
  it('resets to defaults', async () => {
    await storeApi.resetAppSettings();
    expect(mockStore.set).toHaveBeenCalledWith('appSettings', DEFAULT_APP_SETTINGS);
    expect(mockStore.save).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// exportAppSettings / importAppSettings
// ---------------------------------------------------------------------------
describe('storeApi.exportAppSettings', () => {
  it('returns JSON string of settings', async () => {
    mockStore.get.mockResolvedValue(DEFAULT_APP_SETTINGS);
    const json = await storeApi.exportAppSettings();
    const parsed = JSON.parse(json);
    expect(parsed.editor).toBeDefined();
  });
});

describe('storeApi.importAppSettings', () => {
  it('parses JSON and saves', async () => {
    await storeApi.importAppSettings(JSON.stringify(DEFAULT_APP_SETTINGS));
    expect(mockStore.set).toHaveBeenCalledWith('appSettings', DEFAULT_APP_SETTINGS);
  });

  it('throws on invalid JSON', async () => {
    await expect(storeApi.importAppSettings('not json')).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Recent files
// ---------------------------------------------------------------------------
describe('storeApi.loadRecentFiles', () => {
  it('returns stored files', async () => {
    const files = [{ id: '1', filePath: '/a.md', fileName: 'a.md', lastOpened: 100, openCount: 1 }];
    mockStore.get.mockResolvedValue(files);
    expect(await storeApi.loadRecentFiles()).toEqual(files);
  });

  it('returns empty array when null', async () => {
    mockStore.get.mockResolvedValue(null);
    expect(await storeApi.loadRecentFiles()).toEqual([]);
  });

  it('returns empty array on error', async () => {
    mockStore.get.mockRejectedValue(new Error('fail'));
    expect(await storeApi.loadRecentFiles()).toEqual([]);
  });
});

describe('storeApi.clearRecentFiles', () => {
  it('saves empty array', async () => {
    await storeApi.clearRecentFiles();
    expect(mockStore.set).toHaveBeenCalledWith('recentFiles', []);
  });
});

// ---------------------------------------------------------------------------
// Folder tree root
// ---------------------------------------------------------------------------
describe('storeApi.saveFolderTreeRoot', () => {
  it('stores root path', async () => {
    await storeApi.saveFolderTreeRoot('/home/user/docs');
    expect(mockStore.set).toHaveBeenCalledWith('folderTreeRoot', '/home/user/docs');
  });

  it('stores null to clear', async () => {
    await storeApi.saveFolderTreeRoot(null);
    expect(mockStore.set).toHaveBeenCalledWith('folderTreeRoot', null);
  });
});

describe('storeApi.loadFolderTreeRoot', () => {
  it('returns stored path', async () => {
    mockStore.get.mockResolvedValue('/docs');
    expect(await storeApi.loadFolderTreeRoot()).toBe('/docs');
  });

  it('returns null when empty', async () => {
    mockStore.get.mockResolvedValue(null);
    expect(await storeApi.loadFolderTreeRoot()).toBeNull();
  });

  it('returns null on error', async () => {
    mockStore.get.mockRejectedValue(new Error('fail'));
    expect(await storeApi.loadFolderTreeRoot()).toBeNull();
  });
});
