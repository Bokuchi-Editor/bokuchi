import { useState, useEffect, useCallback, useRef } from 'react';
import { updaterApi, UpdateInfo, DownloadProgress } from '../api/updaterApi';
import { storeApi } from '../api/storeApi';
import { Update } from '@tauri-apps/plugin-updater';
import { UpdateDialogPhase } from '../components/UpdateDialog';

interface UseUpdateCheckerParams {
  isInitialized: boolean;
  isSettingsLoaded: boolean;
  setSnackbar: (snackbar: { open: boolean; message: string; severity: 'success' | 'error' | 'warning' }) => void;
  t: (key: string) => string;
}

const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours between actual server checks
const TICK_INTERVAL_MS = 2 * 60 * 60 * 1000;   // 2 hours between local timestamp evaluations

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
  const updateDialogOpenRef = useRef(false);

  useEffect(() => {
    updateDialogOpenRef.current = updateDialogOpen;
  }, [updateDialogOpen]);

  const performUpdateCheck = useCallback(async (force: boolean) => {
    // Skip if a notification dialog is already open to avoid duplicate prompts
    if (updateDialogOpenRef.current) return;

    if (!force) {
      const lastCheckAt = await storeApi.loadLastUpdateCheckAt();
      if (lastCheckAt !== null && Date.now() - lastCheckAt < CHECK_INTERVAL_MS) {
        return;
      }
    }

    try {
      const { info, update } = await updaterApi.checkForUpdate();
      // Update timestamp only on successful server response
      await storeApi.saveLastUpdateCheckAt(Date.now());

      if (info.available && update && !updateDialogOpenRef.current) {
        setUpdateInfo(info);
        pendingUpdateRef.current = update;
        setUpdateDialogPhase('notify');
        setUpdateDialogOpen(true);
      }
    } catch (error) {
      console.warn('Update check failed:', error);
    }
  }, []);

  // Auto-check for updates after initialization, then schedule periodic ticks
  useEffect(() => {
    if (!isInitialized || !isSettingsLoaded) return;

    void performUpdateCheck(true);

    const intervalId = window.setInterval(() => {
      void performUpdateCheck(false);
    }, TICK_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isInitialized, isSettingsLoaded, performUpdateCheck]);

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
