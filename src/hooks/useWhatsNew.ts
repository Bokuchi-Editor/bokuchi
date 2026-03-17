import { useState, useEffect } from 'react';
import { storeApi } from '../api/storeApi';
import { whatsNewContent } from '../whatsNew';

export const useWhatsNew = (isInitialized: boolean, isSettingsLoaded: boolean) => {
  const [whatsNewOpen, setWhatsNewOpen] = useState(false);

  // Check on startup if we should show the What's New modal
  useEffect(() => {
    if (!isInitialized || !isSettingsLoaded) return;

    const checkVersion = async () => {
      const lastSeenVersion = await storeApi.loadLastSeenVersion();
      if (lastSeenVersion !== whatsNewContent.version) {
        setWhatsNewOpen(true);
      }
    };

    checkVersion();
  }, [isInitialized, isSettingsLoaded]);

  const handleWhatsNewClose = async () => {
    setWhatsNewOpen(false);
    await storeApi.saveLastSeenVersion(whatsNewContent.version);
  };

  const handleWhatsNewOpen = () => {
    setWhatsNewOpen(true);
  };

  return {
    whatsNewOpen,
    handleWhatsNewOpen,
    handleWhatsNewClose,
  };
};
