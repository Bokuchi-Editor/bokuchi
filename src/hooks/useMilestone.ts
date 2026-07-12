import { useState, useEffect } from 'react';
import { storeApi } from '../api/storeApi';
import { milestoneContent } from '../milestone';

/**
 * Shows the one-time milestone / thank-you dialog on first launch of a
 * milestone release.
 *
 * `milestonePending` stays true from startup until the dialog is dismissed
 * (or until we confirm this milestone was already seen). Callers pass it to
 * `useWhatsNew` so the What's New dialog waits behind the milestone greeting
 * and only auto-opens once the greeting has been closed.
 */
export const useMilestone = (isInitialized: boolean, isSettingsLoaded: boolean) => {
  const [milestoneOpen, setMilestoneOpen] = useState(false);
  // Assume pending until the startup check proves otherwise, so What's New
  // never races ahead of the greeting.
  const [milestonePending, setMilestonePending] = useState(true);

  // Check on startup whether this milestone still needs to be shown.
  useEffect(() => {
    if (!isInitialized || !isSettingsLoaded) return;

    const check = async () => {
      const seen = await storeApi.loadSeenMilestones();
      if (seen.includes(milestoneContent.id)) {
        setMilestonePending(false);
      } else {
        setMilestoneOpen(true);
      }
    };

    check();
  }, [isInitialized, isSettingsLoaded]);

  const handleMilestoneClose = async () => {
    setMilestoneOpen(false);
    setMilestonePending(false);
    const seen = await storeApi.loadSeenMilestones();
    if (!seen.includes(milestoneContent.id)) {
      await storeApi.saveSeenMilestones([...seen, milestoneContent.id]);
    }
  };

  return {
    milestoneOpen,
    milestonePending,
    handleMilestoneClose,
  };
};
