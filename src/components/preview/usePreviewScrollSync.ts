import { useEffect, useRef, useState, useCallback, type RefObject } from 'react';

/**
 * Two-way scroll synchronisation for the preview pane:
 * - applies an incoming `scrollFraction` to the container, and
 * - reports the user's own scrolling back through `onScrollChange`.
 *
 * A guard ref suppresses the scroll events produced by our own programmatic
 * scroll so the editor↔preview sync does not feed back on itself.
 *
 * The container is tracked in STATE (not just via the passed RefObject) so the
 * effects rebind when the scroll-container DOM node is REPLACED. Marp mode makes
 * Preview return a different tree, unmounting the scroll container and mounting a
 * brand-new node on return. A RefObject's identity is stable, so depending on the
 * ref alone never re-runs the effects — the scroll listener would stay bound to
 * the detached old node and preview→editor sync would silently die after one Marp
 * round-trip (even back on a normal Markdown tab). Returning a callback ref that
 * drives node state fixes this: every remount re-attaches the listener.
 *
 * Attach the returned callback ref to the scroll container; the passed
 * `scrollContainerRef` is kept in sync for sibling hooks that read `.current`.
 */
export function usePreviewScrollSync(
  scrollContainerRef: RefObject<HTMLDivElement | null>,
  scrollFraction: number | undefined,
  onScrollChange: ((fraction: number) => void) | undefined,
): (node: HTMLDivElement | null) => void {
  const isProgrammaticScrollRef = useRef(false);
  const [container, setContainer] = useState<HTMLDivElement | null>(null);

  // Callback ref: keep the shared RefObject (used by sibling hooks) in sync AND
  // drive the node state that the effects below depend on, so a remounted
  // container rebinds the listeners.
  const setContainerRef = useCallback(
    (node: HTMLDivElement | null) => {
      scrollContainerRef.current = node;
      setContainer(node);
    },
    [scrollContainerRef],
  );

  // Sync scroll from editor
  useEffect(() => {
    if (scrollFraction === undefined || !container) return;
    const maxScroll = container.scrollHeight - container.clientHeight;
    if (maxScroll <= 0) return;
    const targetScroll = scrollFraction * maxScroll;
    if (Math.abs(container.scrollTop - targetScroll) < 1) return;
    isProgrammaticScrollRef.current = true;
    container.scrollTop = targetScroll;
    requestAnimationFrame(() => {
      isProgrammaticScrollRef.current = false;
    });
  }, [scrollFraction, container]);

  // Report scroll position back to parent
  useEffect(() => {
    if (!onScrollChange || !container) return;
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
  }, [onScrollChange, container]);

  return setContainerRef;
}
