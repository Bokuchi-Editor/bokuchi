import React from 'react';
import { Snackbar, Alert } from '@mui/material';
import Settings from './Settings';
import HelpDialog from './Help';
import FileChangeDialog from './FileChangeDialog';
import SaveBeforeCloseDialog from './SaveBeforeCloseDialog';
import UpdateDialog, { UpdateDialogPhase } from './UpdateDialog';
import WhatsNewDialog from './WhatsNewDialog';
import { AppSettings } from '../types/settings';
import { SettingsFocusTarget } from '../types/settingsFocus';
import { UpdateInfo, DownloadProgress } from '../api/updaterApi';

export interface AppDialogsProps {
  // Snackbar state
  snackbar: {
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning';
  };
  isAtLimit: boolean;
  currentZoom: number;
  ZOOM_CONFIG: {
    maxZoom: number;
    minZoom: number;
  };

  // Settings dialog state
  settingsOpen: boolean;
  settingsFocusTarget?: SettingsFocusTarget | null;
  settings: AppSettings;

  // Help dialog state
  helpOpen: boolean;

  // File change dialog state
  fileChangeDialog: {
    open: boolean;
    fileName: string;
    onReload: () => void;
    onCancel: () => void;
  };

  // Save before close dialog state
  saveBeforeCloseDialog: {
    open: boolean;
    fileName: string;
    tabId: string | null;
  };

  // What's New dialog state
  whatsNewOpen: boolean;
  onWhatsNewClose: () => void;

  // Update dialog state
  updateDialogOpen: boolean;
  updateDialogPhase: UpdateDialogPhase;
  updateInfo: UpdateInfo | null;
  updateDownloadProgress: DownloadProgress | null;

  // Handlers
  onCloseSnackbar: () => void;
  onSettingsClose: () => void;
  onSettingsChange: (settings: AppSettings) => void;
  onHelpClose: () => void;
  onSaveBeforeClose: () => void;
  onDontSaveBeforeClose: () => void;
  onCancelBeforeClose: () => void;
  onUpdate: () => void;
  onDismissUpdate: () => void;

  // Easter eggs
  as400Unlocked?: boolean;

  // Translation
  t: (key: string, options?: Record<string, string | number>) => string;
}

const AppDialogs: React.FC<AppDialogsProps> = ({
  snackbar,
  isAtLimit,
  currentZoom,
  ZOOM_CONFIG,
  settingsOpen,
  settingsFocusTarget,
  settings,
  helpOpen,
  fileChangeDialog,
  saveBeforeCloseDialog,
  whatsNewOpen,
  onWhatsNewClose,
  updateDialogOpen,
  updateDialogPhase,
  updateInfo,
  updateDownloadProgress,
  onCloseSnackbar,
  onSettingsClose,
  onSettingsChange,
  onHelpClose,
  onSaveBeforeClose,
  onDontSaveBeforeClose,
  onCancelBeforeClose,
  onUpdate,
  onDismissUpdate,
  as400Unlocked,
  t,
}) => {
  return (
    <>
      {/* Main notification */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={onCloseSnackbar}
      >
        <Alert onClose={onCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Zoom limit warning */}
      <Snackbar
        open={isAtLimit}
        autoHideDuration={2000}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="warning" sx={{ width: '100%' }}>
          {currentZoom >= ZOOM_CONFIG.maxZoom
            ? t('zoom.maxLimitReached', { maxZoom: ZOOM_CONFIG.maxZoom * 100 })
            : t('zoom.minLimitReached', { minZoom: ZOOM_CONFIG.minZoom * 100 })
          }
        </Alert>
      </Snackbar>

      {/* Settings dialog */}
      <Settings
        open={settingsOpen}
        onClose={onSettingsClose}
        settings={settings}
        onSettingsChange={onSettingsChange}
        as400Unlocked={as400Unlocked}
        focusTarget={settingsFocusTarget ?? null}
      />

      {/* Help dialog */}
      <HelpDialog
        open={helpOpen}
        onClose={onHelpClose}
      />

      {/* File change dialog */}
      <FileChangeDialog
        open={fileChangeDialog.open}
        fileName={fileChangeDialog.fileName}
        onReload={fileChangeDialog.onReload}
        onCancel={fileChangeDialog.onCancel}
      />

      {/* Save before close dialog */}
      <SaveBeforeCloseDialog
        open={saveBeforeCloseDialog.open}
        fileName={saveBeforeCloseDialog.fileName}
        onSave={onSaveBeforeClose}
        onDontSave={onDontSaveBeforeClose}
        onCancel={onCancelBeforeClose}
      />

      {/* What's New dialog */}
      <WhatsNewDialog
        open={whatsNewOpen}
        onClose={onWhatsNewClose}
      />

      {/* Update dialog */}
      <UpdateDialog
        open={updateDialogOpen}
        phase={updateDialogPhase}
        updateInfo={updateInfo}
        downloadProgress={updateDownloadProgress}
        onUpdate={onUpdate}
        onDismiss={onDismissUpdate}
      />
    </>
  );
};

export default AppDialogs;