import { useState, useEffect } from 'react';

/**
 * Drives the visibility of the 臨 (Rin) focus-mode exit button.
 *
 * While Rin is active:
 * - the button starts visible,
 * - moving the mouse shows it instantly,
 * - typing (any non-Escape keydown) hides it, which the caller renders as a
 *   gradual ~3s fade via a CSS opacity transition,
 * - Escape exits Rin (handled in capture phase + stopPropagation so Monaco
 *   does not swallow the key).
 *
 * @param rinActive whether Rin mode is currently active
 * @param onExit stable callback that exits Rin (e.g. `exitRin` from useAppState)
 */
export function useRinExitButton(
  rinActive: boolean,
  onExit: () => void
): { exitVisible: boolean } {
  const [exitVisible, setExitVisible] = useState(false);

  useEffect(() => {
    if (!rinActive) {
      setExitVisible(false);
      return;
    }

    // Visible immediately on entering Rin so the way out is discoverable.
    setExitVisible(true);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onExit();
        return;
      }
      // Typing → begin the gradual fade-out (CSS transition handles the 3s).
      setExitVisible(false);
    };
    const handleMouseMove = () => setExitVisible(true);

    // Capture phase so the editor (Monaco) does not consume Escape first.
    document.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [rinActive, onExit]);

  return { exitVisible };
}
