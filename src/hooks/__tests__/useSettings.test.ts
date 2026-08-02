import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { ThemeName } from '../../themes';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { changeLanguage: vi.fn() },
  }),
}));

vi.mock('../../themes', () => ({
  getThemeByName: vi.fn().mockReturnValue({ palette: { mode: 'light' } }),
  applyThemeToDocument: vi.fn(),
  registerCustomThemes: vi.fn(),
}));

vi.mock('../../api/storeApi', () => ({
  storeApi: {
    loadAppSettings: vi.fn().mockResolvedValue({
      editor: { fontSize: 14, showLineNumbers: true, tabSize: 2, wordWrap: true, minimap: false },
      appearance: { theme: 'dark', showLineNumbers: true },
      interface: { language: 'ja', tabLayout: 'vertical', tabSidebarPinned: true, zoomLevel: 1.0, outlineDisplayMode: 'persistent', folderTreeDisplayMode: 'off', folderTreeFileFilter: 'markdown' },
      advanced: { autoSave: true, showWhitespace: false, tableConversion: 'confirm' },
      recentFiles: { maxRecentFiles: 20, showPreview: true, previewLength: 100 },
      globalVariables: { author: 'Test' },
    }),
    saveLanguage: vi.fn().mockResolvedValue(undefined),
    saveTheme: vi.fn().mockResolvedValue(undefined),
    saveGlobalVariables: vi.fn().mockResolvedValue(undefined),
    saveTabLayout: vi.fn().mockResolvedValue(undefined),
    saveTabSidebarPinned: vi.fn().mockResolvedValue(undefined),
    saveViewMode: vi.fn().mockResolvedValue(undefined),
    loadViewMode: vi.fn().mockResolvedValue('split'),
    saveAppSettings: vi.fn().mockResolvedValue(undefined),
    saveCustomThemes: vi.fn().mockResolvedValue(undefined),
    loadCustomThemes: vi.fn().mockResolvedValue([]),
  },
}));

import { useSettings } from '../useSettings';
import { storeApi } from '../../api/storeApi';
import { applyThemeToDocument, registerCustomThemes } from '../../themes';
import { asMock } from '../../test-utils';

describe('useSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const defaultParams = () => ({
    isInitialized: true,
    currentZoom: 1.0,
    zoomIn: asMock<() => void>(vi.fn()),
    zoomOut: asMock<() => void>(vi.fn()),
    viewMode: 'split' as const,
    setViewMode: asMock<(mode: 'split' | 'editor' | 'preview') => void>(vi.fn()),
  });

  // T-SETT-01: initial default state
  it('T-SETT-01: starts with default settings', () => {
    const { result } = renderHook(() => useSettings({ ...defaultParams(), isInitialized: false }));
    expect(result.current.theme).toBe('default');
    expect(result.current.language).toBe('en');
    expect(result.current.isSettingsLoaded).toBe(false);
  });

  // T-SETT-02: loads settings when initialized
  it('T-SETT-02: loads settings on initialization', async () => {
    const { result } = renderHook(() => useSettings(defaultParams()));

    await waitFor(() => {
      expect(result.current.isSettingsLoaded).toBe(true);
    });

    expect(result.current.theme).toBe('dark');
    expect(result.current.language).toBe('ja');
    expect(result.current.tabLayout).toBe('vertical');
    expect(result.current.globalVariables).toEqual({ author: 'Test' });
  });

  // T-SETT-03: does not load when not initialized
  it('T-SETT-03: does not load settings when not initialized', () => {
    renderHook(() => useSettings({ ...defaultParams(), isInitialized: false }));
    expect(storeApi.loadAppSettings).not.toHaveBeenCalled();
  });

  // T-SETT-04: handleThemeChange updates theme
  it('T-SETT-04: handleThemeChange updates theme and applies to document', async () => {
    const { result } = renderHook(() => useSettings(defaultParams()));

    await waitFor(() => {
      expect(result.current.isSettingsLoaded).toBe(true);
    });

    act(() => {
      result.current.handleThemeChange('darcula' as ThemeName);
    });

    expect(result.current.theme).toBe('darcula');
    expect(applyThemeToDocument).toHaveBeenCalledWith('darcula');
  });

  // T-SETT-05: handleLanguageChange updates language
  it('T-SETT-05: handleLanguageChange updates language', async () => {
    const { result } = renderHook(() => useSettings(defaultParams()));

    await waitFor(() => {
      expect(result.current.isSettingsLoaded).toBe(true);
    });

    act(() => {
      result.current.handleLanguageChange('en');
    });

    expect(result.current.language).toBe('en');
  });

  // T-SETT-06: handleAppSettingsChange persists settings.
  // Note (Issue #225): handleAppSettingsChange must only update local state and
  // persist to the store — panel visibility (outline/folder tree) is controlled
  // solely by user actions, never as a side effect of a settings change.
  it('T-SETT-06: handleAppSettingsChange saves to store', async () => {
    const { result } = renderHook(() => useSettings(defaultParams()));

    await waitFor(() => {
      expect(result.current.isSettingsLoaded).toBe(true);
    });

    const newSettings = {
      ...result.current.appSettings,
      interface: { ...result.current.appSettings.interface, language: 'fr' },
    };

    await act(async () => {
      await result.current.handleAppSettingsChange(newSettings);
    });

    expect(storeApi.saveAppSettings).toHaveBeenCalledWith(newSettings);
  });

  // T-SETT-08: restores the persisted view mode on initialization so the app
  // reopens in whatever mode it was closed in (not always 'split').
  it('T-SETT-08: restores persisted view mode on initialization', async () => {
    vi.mocked(storeApi.loadViewMode).mockResolvedValueOnce('preview');
    const setViewMode = asMock<(mode: 'split' | 'editor' | 'preview') => void>(vi.fn());

    const { result } = renderHook(() => useSettings({ ...defaultParams(), setViewMode }));

    await waitFor(() => {
      expect(result.current.isSettingsLoaded).toBe(true);
    });

    expect(storeApi.loadViewMode).toHaveBeenCalled();
    expect(setViewMode).toHaveBeenCalledWith('preview');
  });

  // --- Custom themes ---------------------------------------------------------

  const sampleCustomTheme = () => ({
    id: 'custom:abc-123',
    name: 'My Theme',
    baseTheme: 'dawn',
    mode: 'light' as const,
    colors: {
      backgroundDefault: '#faf6f4',
      backgroundPaper: '#f4edea',
      textPrimary: '#39312d',
      textSecondary: '#796b64',
      primaryMain: '#785e4f',
      secondaryMain: '#977e71',
      divider: '#e6dad2',
    },
  });

  // T-SETT-09: a saved custom theme id whose definition is gone must not brick
  // the UI — the app falls back to the Default theme.
  it('T-SETT-09: falls back to default when saved custom theme is missing', async () => {
    vi.mocked(storeApi.loadAppSettings).mockResolvedValueOnce({
      ...(await storeApi.loadAppSettings()),
      appearance: { theme: 'custom:gone', showLineNumbers: true },
    });
    vi.mocked(storeApi.loadCustomThemes).mockResolvedValueOnce([]);

    const { result } = renderHook(() => useSettings(defaultParams()));

    await waitFor(() => {
      expect(result.current.isSettingsLoaded).toBe(true);
    });

    expect(result.current.theme).toBe('default');
    expect(result.current.appSettings.appearance.theme).toBe('default');
    expect(applyThemeToDocument).toHaveBeenCalledWith('default');
  });

  // T-SETT-10: a saved custom theme that exists is restored as-is
  it('T-SETT-10: restores a saved custom theme when its definition exists', async () => {
    const custom = sampleCustomTheme();
    vi.mocked(storeApi.loadAppSettings).mockResolvedValueOnce({
      ...(await storeApi.loadAppSettings()),
      appearance: { theme: custom.id, showLineNumbers: true },
    });
    vi.mocked(storeApi.loadCustomThemes).mockResolvedValueOnce([custom]);

    const { result } = renderHook(() => useSettings(defaultParams()));

    await waitFor(() => {
      expect(result.current.isSettingsLoaded).toBe(true);
    });

    expect(result.current.theme).toBe(custom.id);
    expect(result.current.customThemes).toEqual([custom]);
    expect(registerCustomThemes).toHaveBeenCalledWith([custom]);
    expect(applyThemeToDocument).toHaveBeenCalledWith(custom.id);
  });

  // T-SETT-11: editing the applied custom theme re-applies it to the document
  // (live recolor) and persists after the debounce.
  it('T-SETT-11: handleCustomThemesChange re-applies edited active theme and saves', async () => {
    vi.useFakeTimers();
    try {
      const custom = sampleCustomTheme();
      vi.mocked(storeApi.loadAppSettings).mockResolvedValueOnce({
        ...(await storeApi.loadAppSettings()),
        appearance: { theme: custom.id, showLineNumbers: true },
      });
      vi.mocked(storeApi.loadCustomThemes).mockResolvedValueOnce([custom]);

      const { result } = renderHook(() => useSettings(defaultParams()));
      await vi.waitFor(() => {
        expect(result.current.isSettingsLoaded).toBe(true);
      });

      const edited = { ...custom, colors: { ...custom.colors, primaryMain: '#ff0000' } };
      vi.mocked(applyThemeToDocument).mockClear();
      act(() => {
        result.current.handleCustomThemesChange([edited]);
      });

      expect(registerCustomThemes).toHaveBeenCalledWith([edited]);
      expect(applyThemeToDocument).toHaveBeenCalledWith(custom.id);
      // Persistence is debounced — nothing saved yet, then one save after the delay
      expect(storeApi.saveCustomThemes).not.toHaveBeenCalled();
      act(() => {
        vi.advanceTimersByTime(600);
      });
      expect(storeApi.saveCustomThemes).toHaveBeenCalledWith([edited]);
    } finally {
      vi.useRealTimers();
    }
  });

  // T-SETT-12: deleting the applied custom theme falls back to Default
  it('T-SETT-12: deleting the active custom theme falls back to default', async () => {
    const custom = sampleCustomTheme();
    vi.mocked(storeApi.loadAppSettings).mockResolvedValueOnce({
      ...(await storeApi.loadAppSettings()),
      appearance: { theme: custom.id, showLineNumbers: true },
    });
    vi.mocked(storeApi.loadCustomThemes).mockResolvedValueOnce([custom]);

    const { result } = renderHook(() => useSettings(defaultParams()));
    await waitFor(() => {
      expect(result.current.isSettingsLoaded).toBe(true);
    });

    act(() => {
      result.current.handleCustomThemesChange([]);
    });

    expect(result.current.theme).toBe('default');
    expect(applyThemeToDocument).toHaveBeenCalledWith('default');
  });

  // T-SETT-13: a failing settings load must not leave the app stuck waiting.
  // Everything downstream (save effects, initial render gating) is keyed on
  // isSettingsLoaded, so it has to flip to true even when loadAppSettings
  // rejects (corrupt store, first launch on a broken disk, ...).
  it('T-SETT-13: isSettingsLoaded becomes true even when loadAppSettings rejects', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      vi.mocked(storeApi.loadAppSettings).mockRejectedValueOnce(new Error('store corrupted'));

      const { result } = renderHook(() => useSettings(defaultParams()));

      await waitFor(() => {
        expect(result.current.isSettingsLoaded).toBe(true);
      });

      // Defaults remain in place instead of half-applied settings
      expect(result.current.theme).toBe('default');
      expect(result.current.language).toBe('en');
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  // T-SETT-14: the in-app pin button (toggleTabSidebarPinned) must keep
  // appSettings in sync and persist, so the Settings dialog shows the same
  // value and the choice survives a restart.
  it('T-SETT-14: toggleTabSidebarPinned syncs appSettings and persists', async () => {
    const { result } = renderHook(() => useSettings(defaultParams()));

    await waitFor(() => {
      expect(result.current.isSettingsLoaded).toBe(true);
    });

    // Loaded settings have tabSidebarPinned: true
    expect(result.current.tabSidebarPinned).toBe(true);
    vi.mocked(storeApi.saveAppSettings).mockClear();

    act(() => {
      result.current.toggleTabSidebarPinned();
    });

    expect(result.current.tabSidebarPinned).toBe(false);
    expect(result.current.appSettings.interface.tabSidebarPinned).toBe(false);
    expect(storeApi.saveAppSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        interface: expect.objectContaining({ tabSidebarPinned: false }),
      })
    );

    // Toggling back restores both states
    act(() => {
      result.current.toggleTabSidebarPinned();
    });
    expect(result.current.tabSidebarPinned).toBe(true);
    expect(result.current.appSettings.interface.tabSidebarPinned).toBe(true);
  });

  // T-SETT-15: a persisted sidebar width is restored on load; an out-of-range
  // value (corrupt store, older bounds) is clamped instead of rendering a
  // broken sidebar. A missing value falls back to the default (280).
  it('T-SETT-15: restores and clamps persisted tab sidebar width', async () => {
    const loaded = await storeApi.loadAppSettings();
    vi.mocked(storeApi.loadAppSettings).mockResolvedValueOnce({
      ...loaded,
      interface: { ...loaded.interface, tabSidebarWidth: 9999 },
    });
    const { result } = renderHook(() => useSettings(defaultParams()));
    await waitFor(() => {
      expect(result.current.isSettingsLoaded).toBe(true);
    });
    // 9999 is clamped to the max (480)
    expect(result.current.tabSidebarWidth).toBe(480);

    // Default mock has no tabSidebarWidth → falls back to the default width
    const { result: result2 } = renderHook(() => useSettings(defaultParams()));
    await waitFor(() => {
      expect(result2.current.isSettingsLoaded).toBe(true);
    });
    expect(result2.current.tabSidebarWidth).toBe(280);
  });

  // T-SETT-16: a width change (edge drag) persists into appSettings after the
  // debounce so the value survives a restart and export/import.
  it('T-SETT-16: setTabSidebarWidth persists into appSettings (debounced)', async () => {
    const { result } = renderHook(() => useSettings(defaultParams()));
    await waitFor(() => {
      expect(result.current.isSettingsLoaded).toBe(true);
    });
    vi.mocked(storeApi.saveAppSettings).mockClear();

    act(() => {
      result.current.setTabSidebarWidth(400);
    });
    expect(result.current.tabSidebarWidth).toBe(400);
    // Not saved synchronously (debounced)
    expect(storeApi.saveAppSettings).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(storeApi.saveAppSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          interface: expect.objectContaining({ tabSidebarWidth: 400 }),
        })
      );
    });
    expect(result.current.appSettings.interface.tabSidebarWidth).toBe(400);
  });
});
