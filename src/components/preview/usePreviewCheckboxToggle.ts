import { useEffect, type RefObject, type MutableRefObject } from 'react';
import { findTaskLineIndices, setTaskLineChecked } from '../../utils/taskListLines';

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
 * On change it flips the matching `- [ ]` / `- [x]` source line, located by
 * the checkbox's document-order index among the task items marked's lexer
 * finds in the source (findTaskLineIndices). Both sides therefore agree on
 * what counts as a task — nested items, `+`/ordered bullets, blockquotes,
 * malformed lines and tasks inside code fences included.
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

      const checkboxIndex = parseInt(target.getAttribute('data-checkbox-index') || '0', 10);
      const content = contentRef.current;
      const lineIndex = findTaskLineIndices(content)[checkboxIndex];
      if (lineIndex === undefined || lineIndex < 0) return;

      const lines = content.split(/\r?\n/);
      const updated = setTaskLineChecked(lines[lineIndex], isChecked);
      if (updated === null) return;
      lines[lineIndex] = updated;
      currentOnContentChange(lines.join('\n'));
    };

    container.addEventListener('change', handleCheckboxChange);
    return () => container.removeEventListener('change', handleCheckboxChange);
  }, [previewRef, isMarp, contentRef, onContentChangeRef]);
}
