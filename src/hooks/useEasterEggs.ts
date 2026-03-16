import { useState, useEffect, useCallback } from 'react';
import { storeApi } from '../api/storeApi';
import { useKonamiCode } from './useKonamiCode';
import { ThemeName } from '../themes';

export const useEasterEggs = (
  isInitialized: boolean,
  handleThemeChange: (theme: ThemeName) => void,
) => {
  const [as400Unlocked, setAs400Unlocked] = useState(false);
  const [showUnlockAnimation, setShowUnlockAnimation] = useState(false);
  const [isLateNight, setIsLateNight] = useState(false);

  // Load persisted flags
  useEffect(() => {
    if (!isInitialized) return;
    const loadFlags = async () => {
      const flags = await storeApi.loadEasterEggFlags();
      if (flags.as400Unlocked) {
        setAs400Unlocked(true);
      }
    };
    loadFlags();
  }, [isInitialized]);

  // Check late night (2:00-4:00 AM)
  useEffect(() => {
    const hour = new Date().getHours();
    setIsLateNight(hour >= 2 && hour < 4);
  }, []);

  // Konami code handler
  const handleKonamiActivate = useCallback(() => {
    if (as400Unlocked) return; // Already unlocked

    setAs400Unlocked(true);
    setShowUnlockAnimation(true);

    // Persist the unlock
    storeApi.loadEasterEggFlags().then(flags => {
      storeApi.saveEasterEggFlags({ ...flags, as400Unlocked: true });
    });

    // Switch to AS400 theme
    handleThemeChange('as400');

    // Hide animation after 2.5 seconds
    setTimeout(() => {
      setShowUnlockAnimation(false);
    }, 2500);
  }, [as400Unlocked, handleThemeChange]);

  useKonamiCode(handleKonamiActivate);

  return {
    as400Unlocked,
    showUnlockAnimation,
    isLateNight,
  };
};
