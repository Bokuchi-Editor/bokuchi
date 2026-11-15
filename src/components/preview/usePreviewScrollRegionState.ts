import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';

interface UsePreviewScrollRegionStateParams {
  previewRef: RefObject<HTMLDivElement | null>;
  htmlContent: string;
}

/**
 * Preserves the scroll offset of independently-scrollable content regions —
 * a `<pre>` code block, or a Mermaid/PlantUML diagram wrapper — across
 * dangerouslySetInnerHTML swaps. Every edit re-renders the whole preview
 * subtree (Preview.tsx), which resets nested scroll offsets back to 0 since
 * that state lives only on the live DOM node, never in the HTML string.
 *
 * Each region is tagged with a stable document-order index by
 * tagScrollableRegions (previewHtmlProcessing.ts); this hook tracks each
 * index's last scroll offset via event delegation on the persistent preview
 * container (same technique as usePreviewCheckboxToggle), then reapplies it
 * right after each swap, before the browser paints.
 */
export function usePreviewScrollRegionState({ previewRef, htmlContent }: UsePreviewScrollRegionStateParams): void {
  const offsetsRef = useRef<Map<string, { left: number; top: number }>>(new Map());

  useEffect(() => {
    const container = previewRef.current;
    if (!container) return;

    // `scroll` does not bubble, but a capture-phase listener still observes
    // it on the way down from this container to the scrolled target.
    const handleScroll = (e: Event) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      const index = target.getAttribute('data-bk-scroll-index');
      if (index === null) return;
      offsetsRef.current.set(index, { left: target.scrollLeft, top: target.scrollTop });
    };

    container.addEventListener('scroll', handleScroll, true);
    return () => container.removeEventListener('scroll', handleScroll, true);
  }, [previewRef]);

  useLayoutEffect(() => {
    const container = previewRef.current;
    if (!container || offsetsRef.current.size === 0) return;

    const regions = container.querySelectorAll<HTMLElement>('[data-bk-scroll-index]');
    for (const el of Array.from(regions)) {
      const index = el.getAttribute('data-bk-scroll-index');
      const offset = index === null ? undefined : offsetsRef.current.get(index);
      if (offset) {
        el.scrollLeft = offset.left;
        el.scrollTop = offset.top;
      }
    }
  }, [previewRef, htmlContent]);
}
