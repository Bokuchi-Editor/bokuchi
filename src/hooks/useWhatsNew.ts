import { useState, useEffect } from 'react';
import { storeApi } from '../api/storeApi';
import { whatsNewContent } from '../whatsNew';

export const useWhatsNew = (
  isInitialized: boolean,
  isSettingsLoaded: boolean,
  // When true, suppress auto-opening (e.g. while a milestone greeting is still
  // pending). Once it flips to false, this effect re-runs and opens What's New.
  blockAutoOpen = false,
) => {
  const [whatsNewOpen, setWhatsNewOpen] = useState(false);

  // Check on startup if we should show the What's New modal
  useEffect(() => {
    if (!isInitialized || !isSettingsLoaded || blockAutoOpen) return;

    const checkVersion = async () => {
      const lastSeenVersion = await storeApi.loadLastSeenVersion();
      if (lastSeenVersion !== whatsNewContent.version) {
        setWhatsNewOpen(true);
      }
    };

    checkVersion();
  }, [isInitialized, isSettingsLoaded, blockAutoOpen]);

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
