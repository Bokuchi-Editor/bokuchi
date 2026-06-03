import { useEffect, type RefObject, type MutableRefObject } from 'react';

interface UsePreviewCheckboxToggleParams {
  previewRef: RefObject<HTMLDivElement | null>;
  isMarp: boolean;
  contentRef: MutableRefObject<string>;
  onContentChangeRef: MutableRefObject<((newContent: string) => void) | undefined>;
}

/**
 * Toggles task-list checkboxes via event delegation on the preview container.
 * The container persists across dangerouslySetInnerHTML updates, so a single
 * listener reliably catches events from dynamically replaced children.
 *
 * On change it flips the matching `- [ ]` / `- [x]` source line — located by
 * the checkbox's index among *valid* task lines (malformed task lines are not
 * rendered as checkboxes by GFM and so must be skipped here too).
 *
 * See {@link usePreviewLinkClicks} for why this depends on `isMarp`.
 */
export function usePreviewCheckboxToggle({
  previewRef,
  isMarp,
  contentRef,
  onContentChangeRef,
}: UsePreviewCheckboxToggleParams): void {
  useEffect(() => {
    const container = previewRef.current;
    if (!container) return;

    const handleCheckboxChange = (e: Event) => {
      const target = e.target;
      if (!(target instanceof HTMLInputElement) || !target.classList.contains('markdown-checkbox')) return;

      e.stopPropagation();
      const isChecked = target.checked;

      const checkboxItem = target.closest('.checkbox-item');
      if (checkboxItem) {
        checkboxItem.classList.toggle('checked', isChecked);
      }

      const currentOnContentChange = onContentChangeRef.current;
      if (!currentOnContentChange) return;

      const checkboxIndex = parseInt(target.getAttribute('data-checkbox-index') || '0');
      const lines = contentRef.current.split(/\r?\n/);
      let currentIndex = 0;

      for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(/^(\s*)([-*]\s+)\[([ x])\]\s+(.*)$/);
        if (match) {
          if (currentIndex === checkboxIndex) {
            const [, indent, listMarker, , rest] = match;
            lines[i] = `${indent}${listMarker}[${isChecked ? 'x' : ' '}] ${rest}`;
            currentOnContentChange(lines.join('\n'));
            return;
          }
          currentIndex++;
        }
      }
    };

    container.addEventListener('change', handleCheckboxChange);
    return () => container.removeEventListener('change', handleCheckboxChange);
  }, [previewRef, isMarp, contentRef, onContentChangeRef]);
}
