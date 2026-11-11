import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';

interface UsePreviewDetailsStateParams {
  previewRef: RefObject<HTMLDivElement | null>;
  htmlContent: string;
}

/**
 * Preserves `<details>` open/closed state across dangerouslySetInnerHTML swaps.
 *
 * Every edit re-renders the whole preview subtree (Preview.tsx), which wipes
 * the native open/closed state of any `<details>` the reader had toggled —
 * that state lives only on the live DOM node, never in the HTML string. Each
 * `<details>` is tagged with a stable document-order index by
 * tagDetailsElements (previewHtmlProcessing.ts); this hook tracks which
 * indexes are open via event delegation on the persistent preview container
 * (same technique as usePreviewCheckboxToggle), then reapplies `.open` to the
 * matching elements right after each swap, before the browser paints.
 */
export function usePreviewDetailsState({ previewRef, htmlContent }: UsePreviewDetailsStateParams): void {
  const openIndexesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const container = previewRef.current;
    if (!container) return;

    // The `toggle` event does not bubble, but a capture-phase listener still
    // observes it on the way down from this container to the <details> target.
    const handleToggle = (e: Event) => {
      const target = e.target;
      if (!(target instanceof HTMLDetailsElement)) return;
      const index = target.getAttribute('data-bk-details-index');
      if (index === null) return;
      if (target.open) {
        openIndexesRef.current.add(index);
      } else {
        openIndexesRef.current.delete(index);
      }
    };

    container.addEventListener('toggle', handleToggle, true);
    return () => container.removeEventListener('toggle', handleToggle, true);
  }, [previewRef]);

  useLayoutEffect(() => {
    const container = previewRef.current;
    if (!container || openIndexesRef.current.size === 0) return;

    const detailsEls = container.querySelectorAll<HTMLDetailsElement>('details[data-bk-details-index]');
    for (const el of Array.from(detailsEls)) {
      const index = el.getAttribute('data-bk-details-index');
      if (index !== null && openIndexesRef.current.has(index)) {
        el.open = true;
      }
    }
  }, [previewRef, htmlContent]);
}
