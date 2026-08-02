import { useEffect, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';

/** How long the button shows the "copied" check-mark feedback. */
const COPIED_FEEDBACK_MS = 2000;

/**
 * Drives the copy buttons injected by `injectCodeCopyButtons`: localizes their
 * tooltip/aria-label and copies the adjacent code block's text on click, with
 * a transient check-mark feedback state (`.copied` class, styled in
 * previewStyles). Uses event delegation on the persistent preview container
 * (same pattern as {@link usePreviewCheckboxToggle}) so the listener survives
 * dangerouslySetInnerHTML swaps; see {@link usePreviewLinkClicks} for why it
 * depends on `isMarp`.
 *
 * Copying goes through the Tauri clipboard plugin (native on all three OS
 * WebViews — navigator.clipboard is unreliable on WebKitGTK/Linux), falling
 * back to the browser API outside a Tauri context.
 */
export function usePreviewCodeCopy(
  previewRef: RefObject<HTMLDivElement | null>,
  isMarp: boolean,
  htmlContent: string,
): void {
  const { t } = useTranslation();

  // Buttons are injected as static HTML with an English aria-label; localize
  // them after every render and on language change.
  useEffect(() => {
    const container = previewRef.current;
    if (!container) return;
    const label = t('preview.copyCode');
    container.querySelectorAll('.code-copy-button').forEach((btn) => {
      btn.setAttribute('aria-label', label);
      btn.setAttribute('title', label);
    });
  }, [previewRef, isMarp, htmlContent, t]);

  useEffect(() => {
    const container = previewRef.current;
    if (!container) return;

    const feedbackTimers = new Map<HTMLButtonElement, number>();

    const copyCode = async (button: HTMLButtonElement) => {
      const code = button.closest('.code-block-wrapper')?.querySelector('pre code')?.textContent;
      if (code == null) return;

      try {
        const { writeText } = await import('@tauri-apps/plugin-clipboard-manager');
        await writeText(code);
      } catch {
        try {
          await navigator.clipboard.writeText(code);
        } catch (err) {
          console.warn('Failed to copy code block:', err);
          return;
        }
      }

      button.classList.add('copied');
      button.setAttribute('title', t('preview.codeCopied'));
      const pending = feedbackTimers.get(button);
      if (pending !== undefined) window.clearTimeout(pending);
      feedbackTimers.set(
        button,
        window.setTimeout(() => {
          button.classList.remove('copied');
          button.setAttribute('title', t('preview.copyCode'));
          feedbackTimers.delete(button);
        }, COPIED_FEEDBACK_MS),
      );
    };

    const handleClick = (e: Event) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      const button = target.closest('.code-copy-button');
      if (!(button instanceof HTMLButtonElement) || !container.contains(button)) return;
      void copyCode(button);
    };

    container.addEventListener('click', handleClick);
    return () => {
      container.removeEventListener('click', handleClick);
      for (const id of feedbackTimers.values()) window.clearTimeout(id);
    };
  }, [previewRef, isMarp, t]);
}
