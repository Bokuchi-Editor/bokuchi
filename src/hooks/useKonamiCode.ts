import { useEffect, useRef } from 'react';

const KONAMI_SEQUENCE = [
  'ArrowUp', 'ArrowUp',
  'ArrowDown', 'ArrowDown',
  'ArrowLeft', 'ArrowRight',
  'ArrowLeft', 'ArrowRight',
  'b', 'a',
];

export const useKonamiCode = (onActivate: () => void) => {
  const sequenceRef = useRef<string[]>([]);
  const onActivateRef = useRef(onActivate);
  onActivateRef.current = onActivate;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key;
      const nextIndex = sequenceRef.current.length;

      if (key === KONAMI_SEQUENCE[nextIndex]) {
        sequenceRef.current = [...sequenceRef.current, key];

        if (sequenceRef.current.length === KONAMI_SEQUENCE.length) {
          sequenceRef.current = [];
          onActivateRef.current();
        }
      } else {
        // Reset but check if the pressed key matches the start of the sequence
        sequenceRef.current = key === KONAMI_SEQUENCE[0] ? [key] : [];
      }
    };

    // Use capture phase to intercept events before Monaco Editor consumes them
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, []);
};
