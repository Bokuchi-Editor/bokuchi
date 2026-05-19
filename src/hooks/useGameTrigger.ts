import { useEffect, useRef } from 'react';

/**
 * Watches for a typed character sequence (e.g. "play") on the document and
 * fires `onActivate` when the full sequence is entered consecutively.
 *
 * - Only single printable keys without Cmd/Ctrl/Alt modifiers count.
 * - Case-insensitive.
 * - Disabled when `enabled` is false (listener detached).
 */
export const useGameTrigger = (
  sequence: string,
  onActivate: () => void,
  enabled: boolean = true,
) => {
  const indexRef = useRef(0);
  const onActivateRef = useRef(onActivate);
  onActivateRef.current = onActivate;

  useEffect(() => {
    if (!enabled) {
      indexRef.current = 0;
      return;
    }

    const lower = sequence.toLowerCase();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key.length !== 1) return;

      const key = e.key.toLowerCase();
      const expected = lower[indexRef.current];

      if (key === expected) {
        indexRef.current++;
        if (indexRef.current === lower.length) {
          indexRef.current = 0;
          onActivateRef.current();
        }
      } else {
        // Reset; allow the typed key to start a new attempt.
        indexRef.current = key === lower[0] ? 1 : 0;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [sequence, enabled]);
};
