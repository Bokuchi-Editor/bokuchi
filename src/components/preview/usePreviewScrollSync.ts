import { useEffect, useRef, type RefObject } from 'react';

/**
 * Two-way scroll synchronisation for the preview pane:
 * - applies an incoming `scrollFraction` to the container, and
 * - reports the user's own scrolling back through `onScrollChange`.
 *
 * A guard ref suppresses the scroll events produced by our own programmatic
 * scroll so the editor↔preview sync does not feed back on itself.
 */
export function usePreviewScrollSync(
  scrollContainerRef: RefObject<HTMLDivElement | null>,
  scrollFraction: number | undefined,
  onScrollChange: ((fraction: number) => void) | undefined,
): void {
  const isProgrammaticScrollRef = useRef(false);

  // Sync scroll from editor
  useEffect(() => {
    if (scrollFraction === undefined || !scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const maxScroll = container.scrollHeight - container.clientHeight;
    if (maxScroll <= 0) return;
    const targetScroll = scrollFraction * maxScroll;
    if (Math.abs(container.scrollTop - targetScroll) < 1) return;
    isProgrammaticScrollRef.current = true;
    container.scrollTop = targetScroll;
    requestAnimationFrame(() => {
      isProgrammaticScrollRef.current = false;
    });
  }, [scrollFraction, scrollContainerRef]);

  // Report scroll position back to parent
  useEffect(() => {
    if (!onScrollChange || !scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const handleScroll = () => {
      // Skip events triggered by our own programmatic scroll to avoid feedback loops
      if (isProgrammaticScrollRef.current) return;
      const maxScroll = container.scrollHeight - container.clientHeight;
      if (maxScroll > 0) {
        onScrollChange(container.scrollTop / maxScroll);
      }
    };
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [onScrollChange, scrollContainerRef]);
}
