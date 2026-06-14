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
 *   does not swallow the key) — but only when nothing more foreground is open.
 *   If a dialog/modal or the search panel is showing, Escape is left untouched
 *   so that overlay closes first and Rin stays active (#375). Esc is processed
 *   in front-to-back priority order; Rin is the last thing it exits.
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
        // A more foreground overlay should consume Escape first; only exit Rin
        // when nothing is layered on top. MuiModal-root covers every MUI dialog
        // (Settings, Help, Recent files, table editor, …); data-bokuchi-overlay
        // covers the in-editor search panel. Leaving the event untouched lets
        // their own Esc handlers fire and keeps Rin active (#375).
        if (document.querySelector('.MuiModal-root, [data-bokuchi-overlay]')) {
          return;
        }
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
