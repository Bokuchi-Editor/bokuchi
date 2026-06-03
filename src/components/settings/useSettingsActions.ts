import React from 'react';
import { useTranslation } from 'react-i18next';
import type { AppSettings } from '../../types/settings';
import { storeApi } from '../../api/storeApi';
import { desktopApi } from '../../api/desktopApi';
import type { SettingChangeHandler } from './SettingControls';

/** How long a notification stays visible before auto-dismissing (ms). */
export const SNACKBAR_AUTO_HIDE_DURATION_MS = 6000;

export type SnackbarSeverity = 'success' | 'error';

export interface SnackbarState {
  open: boolean;
  message: string;
  severity: SnackbarSeverity;
}

export interface SettingsActions {
  snackbar: SnackbarState;
  closeSnackbar: () => void;
  notify: (message: string, severity: SnackbarSeverity) => void;
  handleSettingChange: SettingChangeHandler;
  handleExportSettings: () => Promise<void>;
  handleImportSettings: () => Promise<void>;
  /** Resolves to true when the reset succeeded, so the caller can close the confirm dialog. */
  handleResetSettings: () => Promise<boolean>;
}

/**
 * Owns the snackbar state and the asynchronous settings IO handlers
 * (export / import / reset). Keeps the side-effecting logic out of the
 * presentational tab components.
 */
export const useSettingsActions = (
  settings: AppSettings,
  onSettingsChange: (settings: AppSettings) => void,
): SettingsActions => {
  const { t } = useTranslation();
  const [snackbar, setSnackbar] = React.useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'success',
  });

  const closeSnackbar = () => setSnackbar((prev) => ({ ...prev, open: false }));
  const notify = (message: string, severity: SnackbarSeverity) =>
    setSnackbar({ open: true, message, severity });

  const handleSettingChange: SettingChangeHandler = (category, key, value) => {
    onSettingsChange({
      ...settings,
      [category]: {
        ...settings[category],
        [key]: value,
      },
    });
  };

  const handleExportSettings = async () => {
    try {
      const settingsJson = await storeApi.exportAppSettings();
      const result = await desktopApi.exportSettingsFile(settingsJson);

      if (result.success) {
        notify(t('settings.advanced.exportSuccess'), 'success');
      } else {
        if (result.error === 'Export cancelled by user') {
          // Don't show notification if user cancelled
          return;
        }
        notify(result.error || t('settings.advanced.exportError'), 'error');
      }
    } catch (error) {
      console.error('Failed to export settings:', error);
      notify(t('settings.advanced.exportError'), 'error');
    }
  };

  const handleImportSettings = async () => {
    try {
      const result = await desktopApi.importSettingsFile();

      if (result.error) {
        if (result.error === 'No file selected') {
          // Don't show notification if user cancelled
          return;
        }
        notify(result.error, 'error');
        return;
      }

      await storeApi.importAppSettings(result.content);

      // Reload settings
      const newSettings = await storeApi.loadAppSettings();
      onSettingsChange(newSettings);

      notify(t('settings.advanced.importSuccess'), 'success');
    } catch (error) {
      console.error('Failed to import settings:', error);
      notify(t('settings.advanced.importError'), 'error');
    }
  };

  const handleResetSettings = async (): Promise<boolean> => {
    try {
      await storeApi.resetAppSettings();
      const defaultSettings = await storeApi.loadAppSettings();
      onSettingsChange(defaultSettings);
      notify(t('settings.advanced.resetSuccess'), 'success');
      return true;
    } catch (error) {
      console.error('Failed to reset settings:', error);
      notify(t('settings.advanced.resetError'), 'error');
      return false;
    }
  };

  return {
    snackbar,
    closeSnackbar,
    notify,
    handleSettingChange,
    handleExportSettings,
    handleImportSettings,
    handleResetSettings,
  };
};
