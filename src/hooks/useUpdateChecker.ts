import { useState, useEffect, useCallback, useRef } from 'react';
import { updaterApi, UpdateInfo, DownloadProgress } from '../api/updaterApi';
import { Update } from '@tauri-apps/plugin-updater';
import { UpdateDialogPhase } from '../components/UpdateDialog';

interface UseUpdateCheckerParams {
  isInitialized: boolean;
  isSettingsLoaded: boolean;
  setSnackbar: (snackbar: { open: boolean; message: string; severity: 'success' | 'error' | 'warning' }) => void;
  t: (key: string) => string;
}

export const useUpdateChecker = ({
  isInitialized,
  isSettingsLoaded,
  setSnackbar,
  t,
}: UseUpdateCheckerParams) => {
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [updateDialogPhase, setUpdateDialogPhase] = useState<UpdateDialogPhase>('notify');
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [updateDownloadProgress, setUpdateDownloadProgress] = useState<DownloadProgress | null>(null);
  const pendingUpdateRef = useRef<Update | null>(null);

  // Auto-check for updates after initialization
  useEffect(() => {
    if (!isInitialized || !isSettingsLoaded) return;

    const checkUpdate = async () => {
      try {
        const { info, update } = await updaterApi.checkForUpdate();
        if (info.available && update) {
          setUpdateInfo(info);
          pendingUpdateRef.current = update;
          setUpdateDialogPhase('notify');
          setUpdateDialogOpen(true);
        }
      } catch (error) {
        console.warn('Update check failed:', error);
      }
    };

    checkUpdate();
  }, [isInitialized, isSettingsLoaded]);

  const handleCheckForUpdate = useCallback(async () => {
    if (!pendingUpdateRef.current) return;

    setUpdateDialogPhase('downloading');
    setUpdateDownloadProgress(null);

    try {
      await updaterApi.downloadAndInstall(
        pendingUpdateRef.current,
        (progress) => {
          setUpdateDownloadProgress(progress);
        },
      );
    } catch (error) {
      console.error('Update failed:', error);
      setUpdateDialogOpen(false);
      setSnackbar({ open: true, message: t('dialogs.update.checkFailed'), severity: 'error' });
    }
  }, [t, setSnackbar]);

  const handleDismissUpdate = useCallback(() => {
    setUpdateDialogOpen(false);
    pendingUpdateRef.current = null;
  }, []);

  return {
    updateDialogOpen,
    updateDialogPhase,
    updateInfo,
    updateDownloadProgress,
    handleCheckForUpdate,
    handleDismissUpdate,
  };
};
