import React from 'react';
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
}));

vi.mock('../../api/storeApi', () => ({
  storeApi: {
    loadAppSettings: vi.fn().mockResolvedValue({
      editor: { fontSize: 14, showLineNumbers: true, tabSize: 2, wordWrap: true, minimap: false },
      appearance: { theme: 'dark', showLineNumbers: true },
      interface: { language: 'ja', tabLayout: 'vertical', zoomLevel: 1.0, outlineDisplayMode: 'persistent', folderTreeDisplayMode: 'off', folderTreeFileFilter: 'markdown' },
      advanced: { autoSave: true, showWhitespace: false, tableConversion: 'confirm' },
      recentFiles: { maxRecentFiles: 20, showPreview: true, previewLength: 100 },
      globalVariables: { author: 'Test' },
    }),
    saveLanguage: vi.fn().mockResolvedValue(undefined),
    saveTheme: vi.fn().mockResolvedValue(undefined),
    saveGlobalVariables: vi.fn().mockResolvedValue(undefined),
    saveTabLayout: vi.fn().mockResolvedValue(undefined),
    saveViewMode: vi.fn().mockResolvedValue(undefined),
    saveAppSettings: vi.fn().mockResolvedValue(undefined),
  },
}));

import { useSettings } from '../useSettings';
import { storeApi } from '../../api/storeApi';
import { applyThemeToDocument } from '../../themes';
import { asMock } from '../../test-utils';

describe('useSettings', () => {
  let setOutlinePanelOpen: ReturnType<typeof vi.fn>;
  let setFolderTreePanelOpen: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    setOutlinePanelOpen = vi.fn();
    setFolderTreePanelOpen = vi.fn();
    vi.clearAllMocks();
  });

  const defaultParams = () => ({
    isInitialized: true,
    currentZoom: 1.0,
    zoomIn: asMock<() => void>(vi.fn()),
    zoomOut: asMock<() => void>(vi.fn()),
    viewMode: 'split' as const,
    setOutlinePanelOpen: asMock<React.Dispatch<React.SetStateAction<boolean>>>(setOutlinePanelOpen),
    setFolderTreePanelOpen: asMock<React.Dispatch<React.SetStateAction<boolean>>>(setFolderTreePanelOpen),
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

  // T-SETT-06: handleAppSettingsChange persists settings
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

  // T-SETT-07: auto-opens outline panel when mode is persistent
  it('T-SETT-07: auto-opens outline panel for persistent mode', async () => {
    const { result } = renderHook(() => useSettings(defaultParams()));

    await waitFor(() => {
      expect(result.current.isSettingsLoaded).toBe(true);
    });

    const newSettings = {
      ...result.current.appSettings,
      interface: { ...result.current.appSettings.interface, outlineDisplayMode: 'persistent' as const },
    };

    await act(async () => {
      await result.current.handleAppSettingsChange(newSettings);
    });

    expect(setOutlinePanelOpen).toHaveBeenCalledWith(true);
  });
});
