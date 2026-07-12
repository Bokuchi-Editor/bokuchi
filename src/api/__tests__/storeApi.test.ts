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
  it('stores language and persists to disk', async () => {
    await storeApi.saveLanguage('ja');
    expect(mockStore.set).toHaveBeenCalledWith('language', 'ja');
    expect(mockStore.save).toHaveBeenCalled();
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
  it('stores zoom level and persists to disk', async () => {
    await storeApi.saveZoomLevel(1.5);
    expect(mockStore.set).toHaveBeenCalledWith('zoomLevel', 1.5);
    expect(mockStore.save).toHaveBeenCalled();
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
  it('stores theme and persists to disk', async () => {
    await storeApi.saveTheme('dark');
    expect(mockStore.set).toHaveBeenCalledWith('theme', 'dark');
    expect(mockStore.save).toHaveBeenCalled();
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
// saveCustomThemes / loadCustomThemes
//
// loadCustomThemes is the defensive line against a corrupted store: a bad
// value must never crash startup, and corrupt entries must be dropped while
// valid ones survive (validateCustomTheme filtering).
// ---------------------------------------------------------------------------
const validCustomTheme = (id: string, name: string) => ({
  id,
  name,
  baseTheme: 'default',
  mode: 'dark' as const,
  colors: {
    backgroundDefault: '#101018',
    backgroundPaper: '#181820',
    textPrimary: '#e0e0e8',
    textSecondary: '#9090a0',
    primaryMain: '#8888ff',
    secondaryMain: '#666688',
    divider: '#303040',
  },
});

describe('storeApi.saveCustomThemes', () => {
  it('stores custom themes and persists to disk', async () => {
    const themes = [validCustomTheme('custom:a', 'A')];
    await storeApi.saveCustomThemes(themes);
    expect(mockStore.set).toHaveBeenCalledWith('customThemes', themes);
    expect(mockStore.save).toHaveBeenCalled();
  });
});

describe('storeApi.loadCustomThemes', () => {
  it('drops corrupt entries and keeps valid ones', async () => {
    const good1 = validCustomTheme('custom:a', 'Theme A');
    const good2 = validCustomTheme('custom:b', 'Theme B');
    // Corrupt: missing the colors object entirely
    const corrupt = { id: 'custom:c', name: 'Broken', mode: 'dark' };
    mockStore.get.mockResolvedValue([good1, corrupt, good2]);

    const result = await storeApi.loadCustomThemes();
    expect(result.map(t => t.id)).toEqual(['custom:a', 'custom:b']);
  });

  it('returns empty array when stored value is not an array', async () => {
    mockStore.get.mockResolvedValue({ id: 'custom:a' });
    expect(await storeApi.loadCustomThemes()).toEqual([]);
  });

  it('returns empty array on load error', async () => {
    mockStore.get.mockRejectedValue(new Error('fail'));
    expect(await storeApi.loadCustomThemes()).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// saveDarkMode / loadDarkMode
// ---------------------------------------------------------------------------
describe('storeApi.saveDarkMode', () => {
  it('stores dark mode and persists to disk', async () => {
    await storeApi.saveDarkMode(true);
    expect(mockStore.set).toHaveBeenCalledWith('darkMode', true);
    expect(mockStore.save).toHaveBeenCalled();
  });
});

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
describe('storeApi.saveTabLayout', () => {
  it('stores tab layout and persists to disk', async () => {
    await storeApi.saveTabLayout('vertical');
    expect(mockStore.set).toHaveBeenCalledWith('tabLayout', 'vertical');
    expect(mockStore.save).toHaveBeenCalled();
  });
});

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
// saveTabSidebarPinned / loadTabSidebarPinned
// ---------------------------------------------------------------------------
describe('storeApi.saveTabSidebarPinned', () => {
  it('stores the pinned flag and persists to disk', async () => {
    await storeApi.saveTabSidebarPinned(false);
    expect(mockStore.set).toHaveBeenCalledWith('tabSidebarPinned', false);
    expect(mockStore.save).toHaveBeenCalled();
  });
});

describe('storeApi.loadTabSidebarPinned', () => {
  it('returns the stored flag (false is meaningful)', async () => {
    mockStore.get.mockResolvedValue(false);
    expect(await storeApi.loadTabSidebarPinned()).toBe(false);
  });

  it('returns true as default when unset', async () => {
    mockStore.get.mockResolvedValue(undefined);
    expect(await storeApi.loadTabSidebarPinned()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// saveViewMode / loadViewMode
// ---------------------------------------------------------------------------
describe('storeApi.saveViewMode', () => {
  it('stores view mode and persists to disk', async () => {
    await storeApi.saveViewMode('preview');
    expect(mockStore.set).toHaveBeenCalledWith('viewMode', 'preview');
    expect(mockStore.save).toHaveBeenCalled();
  });
});

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
  it('returns state with no tabs (empty state)', () => {
    const state = storeApi.createInitialState();
    expect(state.tabs).toHaveLength(0);
    expect(state.activeTabId).toBeNull();
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
// addRecentFile
// ---------------------------------------------------------------------------
describe('storeApi.addRecentFile', () => {
  it('adds a new file to empty recent files list', async () => {
    // loadRecentFiles returns []
    // loadAppSettings returns defaults
    mockStore.get
      .mockResolvedValueOnce([]) // recentFiles
      .mockResolvedValueOnce(DEFAULT_APP_SETTINGS); // appSettings

    await storeApi.addRecentFile('/a.md', 'a.md', 'content', 100, 1000);
    expect(mockStore.set).toHaveBeenCalledWith('recentFiles', expect.arrayContaining([
      expect.objectContaining({ filePath: '/a.md', fileName: 'a.md', openCount: 1 }),
    ]));
  });

  it('updates existing file instead of duplicating', async () => {
    const existing = [
      { id: 'r1', filePath: '/a.md', fileName: 'a.md', lastOpened: 100, openCount: 1, preview: '' },
    ];
    mockStore.get
      .mockResolvedValueOnce(existing) // recentFiles
      .mockResolvedValueOnce(DEFAULT_APP_SETTINGS); // appSettings

    await storeApi.addRecentFile('/a.md', 'a.md', 'new content');

    const savedFiles = mockStore.set.mock.calls.find((c: unknown[]) => c[0] === 'recentFiles')?.[1] as Array<{ filePath: string; openCount: number }>;
    expect(savedFiles).toHaveLength(1);
    expect(savedFiles[0].openCount).toBe(2);
  });

  it('truncates preview to previewLength setting', async () => {
    const longContent = 'A'.repeat(200);
    mockStore.get
      .mockResolvedValueOnce([]) // recentFiles
      .mockResolvedValueOnce(DEFAULT_APP_SETTINGS); // appSettings (previewLength: 100)

    await storeApi.addRecentFile('/long.md', 'long.md', longContent);

    const savedFiles = mockStore.set.mock.calls.find((c: unknown[]) => c[0] === 'recentFiles')?.[1] as Array<{ preview: string }>;
    expect(savedFiles[0].preview).toHaveLength(DEFAULT_APP_SETTINGS.recentFiles.previewLength);
  });

  it('enforces max recent files limit', async () => {
    const maxFiles = DEFAULT_APP_SETTINGS.recentFiles.maxRecentFiles;
    const existing = Array.from({ length: maxFiles }, (_, i) => ({
      id: `r${i}`,
      filePath: `/file${i}.md`,
      fileName: `file${i}.md`,
      lastOpened: 1000 - i,
      openCount: 1,
      preview: '',
    }));

    mockStore.get
      .mockResolvedValueOnce(existing)
      .mockResolvedValueOnce(DEFAULT_APP_SETTINGS);

    await storeApi.addRecentFile('/new.md', 'new.md', 'content');

    const savedFiles = mockStore.set.mock.calls.find((c: unknown[]) => c[0] === 'recentFiles')?.[1] as Array<{ filePath: string }>;
    expect(savedFiles.length).toBeLessThanOrEqual(maxFiles);
  });

  // Eviction direction: the length check above cannot tell whether the new
  // file or the oldest one was dropped. The list is sorted by lastOpened
  // descending before truncation, so the new file must survive at the head
  // and the least-recently-opened entry must be the one evicted.
  it('evicts the oldest entry, keeping the newly added file', async () => {
    const maxFiles = DEFAULT_APP_SETTINGS.recentFiles.maxRecentFiles;
    const existing = Array.from({ length: maxFiles }, (_, i) => ({
      id: `r${i}`,
      filePath: `/file${i}.md`,
      fileName: `file${i}.md`,
      lastOpened: 1000 - i, // file0 is newest, file(max-1) is oldest
      openCount: 1,
      preview: '',
    }));

    mockStore.get
      .mockResolvedValueOnce(existing)
      .mockResolvedValueOnce(DEFAULT_APP_SETTINGS);

    await storeApi.addRecentFile('/new.md', 'new.md', 'content');

    const savedFiles = mockStore.set.mock.calls.find((c: unknown[]) => c[0] === 'recentFiles')?.[1] as Array<{ filePath: string }>;
    expect(savedFiles).toHaveLength(maxFiles);
    // New file sorts first (Date.now() > all fixture timestamps)
    expect(savedFiles[0].filePath).toBe('/new.md');
    // The oldest existing entry fell off the end
    expect(savedFiles.map(f => f.filePath)).not.toContain(`/file${maxFiles - 1}.md`);
  });
});

// ---------------------------------------------------------------------------
// removeRecentFile
// ---------------------------------------------------------------------------
describe('storeApi.removeRecentFile', () => {
  it('removes specified file from recent files', async () => {
    const files = [
      { id: 'r1', filePath: '/a.md', fileName: 'a.md', lastOpened: 100, openCount: 1 },
      { id: 'r2', filePath: '/b.md', fileName: 'b.md', lastOpened: 200, openCount: 1 },
    ];
    mockStore.get.mockResolvedValueOnce(files);

    await storeApi.removeRecentFile('/a.md');

    const savedFiles = mockStore.set.mock.calls.find((c: unknown[]) => c[0] === 'recentFiles')?.[1] as Array<{ filePath: string }>;
    expect(savedFiles).toHaveLength(1);
    expect(savedFiles[0].filePath).toBe('/b.md');
  });
});

// ---------------------------------------------------------------------------
// loadTypingGameHighScore
// ---------------------------------------------------------------------------
describe('storeApi.loadTypingGameHighScore', () => {
  // Unlike the other load helpers (which use `value || default` and would
  // coerce 0 to the default), this one uses a typeof-number guard, so a
  // stored score of 0 must round-trip as 0.
  it('returns a stored score of 0 as-is (not the default)', async () => {
    mockStore.get.mockResolvedValue(0);
    expect(await storeApi.loadTypingGameHighScore()).toBe(0);
  });

  it('returns 0 when a non-number is stored', async () => {
    mockStore.get.mockResolvedValue('9999');
    expect(await storeApi.loadTypingGameHighScore()).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Folder tree root
// ---------------------------------------------------------------------------
describe('storeApi.saveFolderTreeRoot', () => {
  it('stores root path and persists to disk', async () => {
    await storeApi.saveFolderTreeRoot('/home/user/docs');
    expect(mockStore.set).toHaveBeenCalledWith('folderTreeRoot', '/home/user/docs');
    expect(mockStore.save).toHaveBeenCalled();
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
