import { useEffect, useRef } from 'react';
import { Tab } from '../types/tab';
import { AppSettings } from '../types/settings';

interface UseAutoSaveParams {
  activeTab: Tab | null;
  appSettings: AppSettings;
  isSettingsLoaded: boolean;
  isInitialized: boolean;
  saveTab: (tabId: string) => Promise<boolean>;
  showSaveStatus: (message: string) => void;
  t: (key: string) => string;
}

export const useAutoSave = ({
  activeTab,
  appSettings,
  isSettingsLoaded,
  isInitialized,
  saveTab,
  showSaveStatus,
  t,
}: UseAutoSaveParams) => {
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isSettingsLoaded || !isInitialized || !appSettings.advanced.autoSave) return;
    if (!activeTab || !activeTab.isModified || activeTab.isNew || !activeTab.filePath) return;

    // Clear previous timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Debounce: save after 3 seconds of inactivity
    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        const success = await saveTab(activeTab.id);
        if (success) {
          showSaveStatus(t('statusBar.saved'));
        }
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }, 3000);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [activeTab?.content, activeTab?.id, activeTab?.isModified, activeTab?.isNew, activeTab?.filePath, appSettings.advanced.autoSave, isSettingsLoaded, isInitialized, saveTab, t, showSaveStatus]);
};
