import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ThemeId, getThemeByName, applyThemeToDocument, registerCustomThemes } from '../themes';
import { CustomTheme, isCustomThemeId } from '../themes/customTheme';
import { storeApi } from '../api/storeApi';
import { AppSettings, DEFAULT_APP_SETTINGS } from '../types/settings';
import { ZOOM_CONFIG } from '../constants/zoom';
import { clampSidebarWidth } from '../constants/layout';

/**
 * Debounce for persisting custom themes: dragging a color picker fires a
 * state update per tick, and each store save writes the whole JSON to disk.
 * The registry/UI update instantly; only the disk write is deferred.
 */
const CUSTOM_THEME_SAVE_DEBOUNCE_MS = 500;

/**
 * Debounce for persisting the sidebar width: an edge drag fires a state
 * update per mousemove; only the settled value is written to disk.
 */
const SIDEBAR_WIDTH_SAVE_DEBOUNCE_MS = 500;

interface UseSettingsParams {
  isInitialized: boolean;
  currentZoom: number;
  zoomIn: () => void;
  zoomOut: () => void;
  viewMode: 'split' | 'editor' | 'preview';
  setViewMode: (mode: 'split' | 'editor' | 'preview') => void;
}

export const useSettings = ({
  isInitialized,
  currentZoom,
  zoomIn,
  zoomOut,
  viewMode,
  setViewMode,
}: UseSettingsParams) => {
  const { i18n } = useTranslation();

  const [theme, setTheme] = useState<ThemeId>('default');
  const [language, setLanguage] = useState('en');
  const [tabLayout, setTabLayout] = useState<'horizontal' | 'vertical'>('horizontal');
  const [tabSidebarPinned, setTabSidebarPinned] = useState(true);
  const [tabSidebarWidth, setTabSidebarWidth] = useState(DEFAULT_APP_SETTINGS.interface.tabSidebarWidth);
  const [globalVariables, setGlobalVariables] = useState<Record<string, string>>({});
  const [customThemes, setCustomThemes] = useState<CustomTheme[]>([]);
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);
  const customThemeSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Resolve through the customThemes state (not only the module registry) so
  // that editing an applied custom theme — same id, new colors — recomputes
  // the MUI theme and re-renders the app.
  const currentTheme = useMemo(() => {
    const custom = customThemes.find((c) => c.id === theme);
    return getThemeByName(custom ? custom.id : theme);
  }, [theme, customThemes]);

  // Update settings when zoom level changes
  useEffect(() => {
    if (isSettingsLoaded && appSettings.interface.zoomLevel !== currentZoom) {
      const updatedSettings = {
        ...appSettings,
        interface: {
          ...appSettings.interface,
          zoomLevel: currentZoom,
        },
      };
      setAppSettings(updatedSettings);
    }
  }, [currentZoom, isSettingsLoaded, appSettings]);

  // Initial settings load (runs once)
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await storeApi.loadAppSettings();

        setLanguage(settings.interface.language);
        i18n.changeLanguage(settings.interface.language);

        // Custom themes must be registered before the saved theme is resolved.
        // If the saved theme is a custom id whose definition is gone (corrupt
        // store, partial import), fall back to Default instead of rendering
        // with a missing palette.
        const loadedCustomThemes = await storeApi.loadCustomThemes();
        registerCustomThemes(loadedCustomThemes);
        setCustomThemes(loadedCustomThemes);

        let themeToApply = settings.appearance.theme;
        if (isCustomThemeId(themeToApply) && !loadedCustomThemes.some((c) => c.id === themeToApply)) {
          themeToApply = 'default';
        }
        setAppSettings({
          ...settings,
          appearance: { ...settings.appearance, theme: themeToApply },
        });
        setTheme(themeToApply);
        applyThemeToDocument(themeToApply);

        setGlobalVariables(settings.globalVariables);
        setTabLayout(settings.interface.tabLayout);
        setTabSidebarPinned(settings.interface.tabSidebarPinned);
        setTabSidebarWidth(clampSidebarWidth(settings.interface.tabSidebarWidth));

        // Restore the view mode used at the previous session's exit. Defaults to
        // 'split' on first launch (see storeApi.loadViewMode). Must run before
        // setIsSettingsLoaded so the save effect doesn't fire on the stale 'split'.
        const savedViewMode = await storeApi.loadViewMode();
        setViewMode(savedViewMode);

        setIsSettingsLoaded(true);
      } catch (error) {
        console.error('Failed to load settings:', error);
        setIsSettingsLoaded(true);
      }
    };

    if (isInitialized) {
      loadSettings();
    }
  }, [isInitialized]);

  // Save language setting
  useEffect(() => {
    if (!isSettingsLoaded) return;
    const saveLanguage = async () => {
      try {
        await storeApi.saveLanguage(language);
      } catch (error) {
        console.error('Failed to save language:', error);
      }
    };
    saveLanguage();
  }, [language, isSettingsLoaded]);

  // Save theme setting
  useEffect(() => {
    if (!isSettingsLoaded) return;
    const saveTheme = async () => {
      try {
        await storeApi.saveTheme(theme);
      } catch (error) {
        console.error('Failed to save theme:', error);
      }
    };
    saveTheme();
  }, [theme, isSettingsLoaded]);

  // Save global variables
  useEffect(() => {
    if (!isSettingsLoaded) return;
    const saveGlobalVariables = async () => {
      try {
        await storeApi.saveGlobalVariables(globalVariables);
      } catch (error) {
        console.error('Failed to save global variables:', error);
      }
    };
    if (Object.keys(globalVariables).length > 0) {
      saveGlobalVariables();
    }
  }, [globalVariables, isSettingsLoaded]);

  // Save tab layout setting
  useEffect(() => {
    if (!isSettingsLoaded) return;
    const saveTabLayout = async () => {
      try {
        await storeApi.saveTabLayout(tabLayout);
      } catch (error) {
        console.error('Failed to save tab layout:', error);
      }
    };
    saveTabLayout();
  }, [tabLayout, isSettingsLoaded]);

  // Save tab sidebar pinned setting
  useEffect(() => {
    if (!isSettingsLoaded) return;
    storeApi.saveTabSidebarPinned(tabSidebarPinned).catch((error) =>
      console.error('Failed to save tab sidebar pinned:', error)
    );
  }, [tabSidebarPinned, isSettingsLoaded]);

  // Save tab sidebar width (debounced: dragging updates the state per mousemove).
  // Persisted inside appSettings so the value survives restarts and export/import.
  useEffect(() => {
    if (!isSettingsLoaded) return;
    const timer = setTimeout(() => {
      setAppSettings((s) => {
        if (s.interface.tabSidebarWidth === tabSidebarWidth) return s;
        const merged: AppSettings = {
          ...s,
          interface: { ...s.interface, tabSidebarWidth },
        };
        storeApi.saveAppSettings(merged).catch((err) =>
          console.error('Failed to save tab sidebar width:', err)
        );
        return merged;
      });
    }, SIDEBAR_WIDTH_SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [tabSidebarWidth, isSettingsLoaded]);

  // Save view mode setting
  useEffect(() => {
    if (!isSettingsLoaded) return;
    const saveViewMode = async () => {
      try {
        await storeApi.saveViewMode(viewMode);
      } catch (error) {
        console.error('Failed to save view mode:', error);
      }
    };
    saveViewMode();
  }, [viewMode, isSettingsLoaded]);

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    i18n.changeLanguage(newLanguage);
  };

  const handleThemeChange = (newTheme: ThemeId) => {
    setTheme(newTheme);
    applyThemeToDocument(newTheme);
    setAppSettings((prev) => {
      const next: AppSettings = {
        ...prev,
        appearance: { ...prev.appearance, theme: newTheme },
      };
      storeApi.saveAppSettings(next).catch((err) =>
        console.error('Failed to save theme to app settings:', err)
      );
      return next;
    });
  };

  /**
   * Replace the custom theme list (create / edit / delete). Registers the new
   * list synchronously so the theme resolvers see it before the next render,
   * re-applies the document variables when the active theme was edited, and
   * persists with a debounce (color-picker drags fire many updates).
   * When the active custom theme was deleted, falls back to Default.
   */
  const handleCustomThemesChange = useCallback((nextCustomThemes: CustomTheme[]) => {
    registerCustomThemes(nextCustomThemes);
    setCustomThemes(nextCustomThemes);

    if (isCustomThemeId(theme)) {
      if (nextCustomThemes.some((c) => c.id === theme)) {
        applyThemeToDocument(theme);
      } else {
        handleThemeChange('default');
      }
    }

    if (customThemeSaveTimer.current !== null) {
      clearTimeout(customThemeSaveTimer.current);
    }
    customThemeSaveTimer.current = setTimeout(() => {
      customThemeSaveTimer.current = null;
      storeApi.saveCustomThemes(nextCustomThemes).catch((err) =>
        console.error('Failed to save custom themes:', err)
      );
    }, CUSTOM_THEME_SAVE_DEBOUNCE_MS);
  }, [theme]);

  const handleAppSettingsChange = useCallback(async (newSettings: AppSettings) => {
    setAppSettings(newSettings);

    setLanguage(newSettings.interface.language);
    i18n.changeLanguage(newSettings.interface.language);

    setTheme(newSettings.appearance.theme);
    applyThemeToDocument(newSettings.appearance.theme);

    setGlobalVariables(newSettings.globalVariables);
    setTabLayout(newSettings.interface.tabLayout);
    setTabSidebarPinned(newSettings.interface.tabSidebarPinned);
    setTabSidebarWidth(clampSidebarWidth(newSettings.interface.tabSidebarWidth));

    // If zoom level changed, also update useZoom state
    if (newSettings.interface.zoomLevel !== currentZoom) {
      const zoomDiff = newSettings.interface.zoomLevel - currentZoom;
      if (zoomDiff > 0) {
        for (let i = 0; i < Math.abs(zoomDiff) / ZOOM_CONFIG.zoomStep; i++) {
          zoomIn();
        }
      } else if (zoomDiff < 0) {
        for (let i = 0; i < Math.abs(zoomDiff) / ZOOM_CONFIG.zoomStep; i++) {
          zoomOut();
        }
      }
    }

    await storeApi.saveAppSettings(newSettings);
  }, [i18n, currentZoom, zoomIn, zoomOut]);

  // Toggle the vertical-tab sidebar pinned/hover state, keeping appSettings in sync
  // so the Settings dialog and the in-app pin button agree.
  const toggleTabSidebarPinned = useCallback(() => {
    setTabSidebarPinned((prev) => {
      const next = !prev;
      setAppSettings((s) => {
        const merged: AppSettings = {
          ...s,
          interface: { ...s.interface, tabSidebarPinned: next },
        };
        storeApi.saveAppSettings(merged).catch((err) =>
          console.error('Failed to save tab sidebar pinned to app settings:', err)
        );
        return merged;
      });
      return next;
    });
  }, []);

  return {
    theme,
    language,
    tabLayout,
    setTabLayout,
    tabSidebarPinned,
    setTabSidebarPinned,
    toggleTabSidebarPinned,
    tabSidebarWidth,
    setTabSidebarWidth,
    globalVariables,
    setGlobalVariables,
    customThemes,
    handleCustomThemesChange,
    appSettings,
    setAppSettings,
    isSettingsLoaded,
    currentTheme,
    handleLanguageChange,
    handleThemeChange,
    handleAppSettingsChange,
  };
};
