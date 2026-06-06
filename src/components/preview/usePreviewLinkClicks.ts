import { useEffect, type RefObject } from 'react';
import { openUrl } from '@tauri-apps/plugin-opener';

/**
 * Intercepts link clicks inside the preview via capture-phase event delegation
 * on the container. External links (http/https/mailto) open in the OS browser;
 * in-page anchors (`#…`) scroll smoothly into view.
 *
 * Using delegation avoids the gap between DOM replacement and listener attachment,
 * and capturing ensures we intercept clicks on child elements (e.g. <img> inside <a>)
 * before the default navigation can occur.
 *
 * Depends on `isMarp` because the `<div ref={previewRef}>` is conditionally
 * rendered (the Marp branch returns <MarpPreview/> early). If a Marp tab is
 * active on first mount, previewRef.current is null when the effect runs;
 * toggling to a non-Marp tab later mounts the div, and we need the effect
 * to re-run so the listener actually attaches.
 */
export function usePreviewLinkClicks(
  previewRef: RefObject<HTMLDivElement | null>,
  isMarp: boolean,
): void {
  useEffect(() => {
    const container = previewRef.current;
    if (!container) return;

    const handler = (e: Event) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');
      if (!link || !container.contains(link)) return;

      e.preventDefault();
      e.stopPropagation();

      const href = link.getAttribute('href');
      if (href) {
        if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:')) {
          openUrl(href).catch(err => {
            console.error('Failed to open URL:', href, err);
          });
        } else if (href.startsWith('#')) {
          const anchorTarget = document.querySelector(href);
          if (anchorTarget) {
            anchorTarget.scrollIntoView({ behavior: 'smooth' });
          }
        }
      }
    };

    container.addEventListener('click', handler, true);
    return () => container.removeEventListener('click', handler, true);
  }, [previewRef, isMarp]);
}
