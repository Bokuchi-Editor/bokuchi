import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ThemeName, getThemeByName, applyThemeToDocument } from '../themes';
import { storeApi } from '../api/storeApi';
import { AppSettings, DEFAULT_APP_SETTINGS } from '../types/settings';
import { ZOOM_CONFIG } from '../constants/zoom';

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

  const [theme, setTheme] = useState<ThemeName>('default');
  const [language, setLanguage] = useState('en');
  const [tabLayout, setTabLayout] = useState<'horizontal' | 'vertical'>('horizontal');
  const [tabSidebarPinned, setTabSidebarPinned] = useState(true);
  const [globalVariables, setGlobalVariables] = useState<Record<string, string>>({});
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);

  const currentTheme = getThemeByName(theme);

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
        setAppSettings(settings);

        setLanguage(settings.interface.language);
        i18n.changeLanguage(settings.interface.language);

        setTheme(settings.appearance.theme as ThemeName);
        applyThemeToDocument(settings.appearance.theme as ThemeName);

        setGlobalVariables(settings.globalVariables);
        setTabLayout(settings.interface.tabLayout);
        setTabSidebarPinned(settings.interface.tabSidebarPinned);

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

  const handleThemeChange = (newTheme: ThemeName) => {
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

  const handleAppSettingsChange = useCallback(async (newSettings: AppSettings) => {
    setAppSettings(newSettings);

    setLanguage(newSettings.interface.language);
    i18n.changeLanguage(newSettings.interface.language);

    setTheme(newSettings.appearance.theme as ThemeName);
    applyThemeToDocument(newSettings.appearance.theme as ThemeName);

    setGlobalVariables(newSettings.globalVariables);
    setTabLayout(newSettings.interface.tabLayout);
    setTabSidebarPinned(newSettings.interface.tabSidebarPinned);

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
    globalVariables,
    setGlobalVariables,
    appSettings,
    setAppSettings,
    isSettingsLoaded,
    currentTheme,
    handleLanguageChange,
    handleThemeChange,
    handleAppSettingsChange,
  };
};
