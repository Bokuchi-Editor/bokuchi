import { useCallback, useEffect, useRef, useState, type RefObject, type MutableRefObject } from 'react';
import {
  getCellText,
  applyCellEdit,
  getTableDimensions,
  nextCell,
  getParsedTable,
  applyTableReplace,
  type NavDir,
  type ParsedTable,
} from '../../utils/tableFormatter';

/** Delay before hiding the "edit table" affordance after the cursor leaves (ms). */
const HOVER_HIDE_DELAY_MS = 200;

/** Overlay state positioning the inline cell editor over a preview cell. */
export interface CellEditingState {
  ti: number;
  row: number;
  col: number;
  top: number;
  left: number;
  width: number;
  height: number;
  value: string;
}

interface UseTablePreviewEditingParams {
  previewRef: RefObject<HTMLDivElement | null>;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  contentRef: MutableRefObject<string>;
  onContentChangeRef: MutableRefObject<((newContent: string) => void) | undefined>;
  /** Re-render trigger: after a committed edit re-renders the table, open the next cell. */
  htmlContent: string;
  isMarp: boolean;
}

interface UseTablePreviewEditingResult {
  editing: CellEditingState | null;
  tableHover: { ti: number; top: number; left: number } | null;
  editTable: { ti: number; table: ParsedTable } | null;
  cancelHoverHide: () => void;
  scheduleHoverHide: () => void;
  openTableEditor: (ti: number) => void;
  handleCellCommit: (value: string, dir: NavDir | null) => void;
  handleCellCancel: () => void;
  handleTableApply: (newTable: ParsedTable) => void;
  closeTableEditor: () => void;
}

/**
 * Encapsulates in-preview table editing: double-click inline cell editing with
 * Tab/Enter navigation (#1/#2), the hover "edit table" affordance, and the
 * spreadsheet edit modal (#3/#9). All DOM coordinate maths and scroll-jump
 * guards live here so the Preview component only renders the resulting state.
 */
export function useTablePreviewEditing({
  previewRef,
  scrollContainerRef,
  contentRef,
  onContentChangeRef,
  htmlContent,
  isMarp,
}: UseTablePreviewEditingParams): UseTablePreviewEditingResult {
  // Inline table-cell editing (#1/#2). `editing` positions the overlay input;
  // `pendingFocusCellRef` carries the next cell to open after a re-render.
  const [editing, setEditing] = useState<CellEditingState | null>(null);
  const pendingFocusCellRef = useRef<{ ti: number; row: number; col: number } | null>(null);
  // Spreadsheet editor (#3/#9): a hover affordance per table, and the modal.
  const [tableHover, setTableHover] = useState<{ ti: number; top: number; left: number } | null>(null);
  const hoverHideTimerRef = useRef<number | null>(null);
  const [editTable, setEditTable] = useState<{ ti: number; table: ParsedTable } | null>(null);

  // --- Inline table-cell editing (#1) and cell navigation (#2) ---

  const editingRef = useRef(editing);
  editingRef.current = editing;

  // Open the overlay editor over a given preview cell, seeded with the raw
  // (unescaped) source cell text.
  const openEditorForCell = useCallback((cellEl: HTMLElement) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const ti = Number(cellEl.getAttribute('data-bk-table'));
    const row = Number(cellEl.getAttribute('data-bk-row'));
    const col = Number(cellEl.getAttribute('data-bk-col'));
    if (Number.isNaN(ti) || Number.isNaN(row) || Number.isNaN(col)) return;
    const value = getCellText(contentRef.current, ti, row, col) ?? '';
    const cRect = container.getBoundingClientRect();
    const r = cellEl.getBoundingClientRect();
    setEditing({
      ti,
      row,
      col,
      top: r.top - cRect.top + container.scrollTop,
      left: r.left - cRect.left + container.scrollLeft,
      width: r.width,
      height: r.height,
      value,
    });
  }, [scrollContainerRef, contentRef]);

  // Open the cell recorded in pendingFocusCellRef (after a re-render).
  const focusPendingCell = useCallback(() => {
    const pending = pendingFocusCellRef.current;
    if (!pending) return;
    pendingFocusCellRef.current = null;
    const cell = previewRef.current?.querySelector<HTMLElement>(
      `[data-bk-table="${pending.ti}"][data-bk-row="${pending.row}"][data-bk-col="${pending.col}"]`,
    );
    if (cell) openEditorForCell(cell);
  }, [openEditorForCell, previewRef]);

  // Closing the overlay shifts focus back to the body; some engines scroll the
  // container as a result. Snapshot the scroll position and restore it next
  // frame so the preview never jumps when an edit ends.
  const preserveScrollAcrossClose = useCallback(() => {
    const c = scrollContainerRef.current;
    if (!c) return;
    const st = c.scrollTop;
    const sl = c.scrollLeft;
    const restore = () => {
      const c2 = scrollContainerRef.current;
      if (!c2) return;
      if (Math.abs(c2.scrollTop - st) > 1 || Math.abs(c2.scrollLeft - sl) > 1) {
        c2.scrollTop = st;
        c2.scrollLeft = sl;
      }
    };
    // Re-assert over a couple of frames: the blur-driven "scroll caret into
    // view" can run asynchronously after a single-frame restore.
    restore();
    requestAnimationFrame(() => {
      restore();
      requestAnimationFrame(restore);
    });
  }, [scrollContainerRef]);

  const handleCellCommit = useCallback((value: string, dir: NavDir | null) => {
    const cur = editingRef.current;
    if (!cur) return;
    const { ti, row, col } = cur;
    const baseContent = contentRef.current;
    // Only touch the source when the trimmed cell text actually changed. Pure
    // navigation (Tab/Enter without edits) must not rewrite the source — that
    // would change whitespace without changing the rendered HTML and stall the
    // re-render-driven navigation below.
    const original = getCellText(baseContent, ti, row, col) ?? '';
    const trimmed = value.trim();
    const updated = trimmed === original ? null : applyCellEdit(baseContent, ti, row, col, trimmed);
    const changed = updated !== null && updated !== baseContent;
    const effectiveContent = updated ?? baseContent;

    let target: { row: number; col: number } | null = null;
    if (dir) {
      const dims = getTableDimensions(effectiveContent, ti);
      if (dims) target = nextCell(row, col, dims.rows, dims.cols, dir);
    }

    if (changed) onContentChangeRef.current?.(updated!);

    if (target) {
      // Navigate to the adjacent cell. Keep the overlay MOUNTED (don't null it
      // out) so the input never re-focuses — only its position/value change,
      // which avoids the focus-driven scroll jump.
      pendingFocusCellRef.current = { ti, row: target.row, col: target.col };
      // No content change → no re-render to consume the pending focus, move now.
      if (!changed) requestAnimationFrame(() => focusPendingCell());
    } else {
      // Editing ends — guard against a focus-shift scroll jump, then close.
      preserveScrollAcrossClose();
      setEditing(null);
    }
  }, [focusPendingCell, preserveScrollAcrossClose, contentRef, onContentChangeRef]);

  const handleCellCancel = useCallback(() => {
    pendingFocusCellRef.current = null;
    preserveScrollAcrossClose();
    setEditing(null);
  }, [preserveScrollAcrossClose]);

  // --- Spreadsheet editor affordance (#3) ---

  const cancelHoverHide = useCallback(() => {
    if (hoverHideTimerRef.current !== null) {
      clearTimeout(hoverHideTimerRef.current);
      hoverHideTimerRef.current = null;
    }
  }, []);

  const scheduleHoverHide = useCallback(() => {
    cancelHoverHide();
    hoverHideTimerRef.current = window.setTimeout(() => setTableHover(null), HOVER_HIDE_DELAY_MS);
  }, [cancelHoverHide]);

  // Show an "edit table" button at the top-right of the table under the cursor.
  useEffect(() => {
    const container = previewRef.current;
    const scroller = scrollContainerRef.current;
    if (!container || !scroller) return;
    const onOver = (e: Event) => {
      if (!onContentChangeRef.current) return;
      const target = e.target as HTMLElement;
      const cell = target.closest('[data-bk-table]');
      const tableEl = cell?.closest('table');
      if (cell && tableEl && container.contains(cell)) {
        const ti = Number(cell.getAttribute('data-bk-table'));
        const cRect = scroller.getBoundingClientRect();
        const tRect = tableEl.getBoundingClientRect();
        const top = tRect.top - cRect.top + scroller.scrollTop + 2;
        const left = tRect.right - cRect.left + scroller.scrollLeft - 34;
        cancelHoverHide();
        // Bail out of a re-render while hovering within the same table.
        setTableHover((prev) =>
          prev && prev.ti === ti && Math.abs(prev.top - top) < 1 && Math.abs(prev.left - left) < 1
            ? prev
            : { ti, top, left },
        );
      } else {
        scheduleHoverHide();
      }
    };
    const onLeave = () => scheduleHoverHide();
    container.addEventListener('mouseover', onOver);
    scroller.addEventListener('mouseleave', onLeave);
    return () => {
      container.removeEventListener('mouseover', onOver);
      scroller.removeEventListener('mouseleave', onLeave);
    };
  }, [isMarp, cancelHoverHide, scheduleHoverHide, previewRef, scrollContainerRef, onContentChangeRef]);

  const editTableRef = useRef(editTable);
  editTableRef.current = editTable;

  const openTableEditor = useCallback((ti: number) => {
    const tbl = getParsedTable(contentRef.current, ti);
    if (tbl) setEditTable({ ti, table: tbl });
    setTableHover(null);
  }, [contentRef]);

  const handleTableApply = useCallback((newTable: ParsedTable) => {
    const cur = editTableRef.current;
    if (cur) {
      const updated = applyTableReplace(contentRef.current, cur.ti, newTable);
      if (updated !== null && updated !== contentRef.current) {
        onContentChangeRef.current?.(updated);
      }
    }
    setEditTable(null);
  }, [contentRef, onContentChangeRef]);

  const closeTableEditor = useCallback(() => setEditTable(null), []);

  // Double-click a table cell to edit it in place.
  useEffect(() => {
    const container = previewRef.current;
    if (!container) return;
    const handler = (e: Event) => {
      if (!onContentChangeRef.current) return;
      const target = e.target as HTMLElement;
      const cell = target.closest<HTMLElement>('[data-bk-table]');
      if (!cell || !container.contains(cell)) return;
      e.preventDefault();
      openEditorForCell(cell);
    };
    container.addEventListener('dblclick', handler);
    return () => container.removeEventListener('dblclick', handler);
  }, [isMarp, openEditorForCell, previewRef, onContentChangeRef]);

  // After a re-render caused by a committed edit, open the next cell (#2).
  useEffect(() => {
    if (pendingFocusCellRef.current) {
      requestAnimationFrame(() => focusPendingCell());
    }
  }, [htmlContent, focusPendingCell]);

  return {
    editing,
    tableHover,
    editTable,
    cancelHoverHide,
    scheduleHoverHide,
    openTableEditor,
    handleCellCommit,
    handleCellCancel,
    handleTableApply,
    closeTableEditor,
  };
}
