/**
 * Monaco-bound table editing actions (format / Enter / Tab navigation).
 *
 * The pure decision logic lives in `tableFormatter.ts`; this layer only adapts
 * it to a live editor instance (reading lines, applying `executeEdits`, moving
 * the selection). Each handler returns `true` when it handled the key so the
 * caller knows the default behavior was replaced.
 */
import type { editor } from 'monaco-editor';
import {
  findTableBlock,
  isTableSeparatorLine,
  isRowEmpty,
  makeEmptyRow,
  getColumnCount,
  getCellCount,
  getCellIndexAtColumn,
  getCellContentRange,
  formatTableAtLine,
} from './tableFormatter';

type IEditor = editor.IStandaloneCodeEditor;

/** Whether the cursor sits on an editable table row (not the separator). */
export function isCursorInTableRow(ed: IEditor): boolean {
  const model = ed.getModel();
  const pos = ed.getPosition();
  if (!model || !pos) return false;
  const block = findTableBlock(model.getLinesContent(), pos.lineNumber);
  if (!block) return false;
  return !isTableSeparatorLine(model.getLineContent(pos.lineNumber));
}

/** Move the selection onto a cell's trimmed content (caret if empty). */
function selectCell(ed: IEditor, lineNumber: number, lineContent: string, cellIndex: number): void {
  const range = getCellContentRange(lineContent, cellIndex);
  if (!range) return;
  const selection = {
    startLineNumber: lineNumber,
    startColumn: range.startColumn,
    endLineNumber: lineNumber,
    endColumn: range.endColumn,
  };
  ed.setSelection(selection);
  ed.revealRangeInCenterIfOutsideViewport(selection);
}

/** #5 — pretty-print the table block containing the cursor. */
export function formatTableInEditor(ed: IEditor | null): boolean {
  if (!ed) return false;
  const model = ed.getModel();
  const pos = ed.getPosition();
  if (!model || !pos) return false;

  const result = formatTableAtLine(model.getLinesContent(), pos.lineNumber);
  if (!result) return false;

  ed.executeEdits('format-table', [
    {
      range: {
        startLineNumber: result.start,
        startColumn: 1,
        endLineNumber: result.end,
        endColumn: model.getLineMaxColumn(result.end),
      },
      text: result.text,
      forceMoveMarkers: true,
    },
  ]);
  ed.focus();
  return true;
}

/**
 * #6 — Enter inside a table. On a non-empty row, insert a fresh empty row below
 * and jump into its first cell. On an already-empty row, clear it to a blank
 * line (exit the table). Returns false to defer to default Enter.
 */
export function handleTableEnter(ed: IEditor): boolean {
  const model = ed.getModel();
  const pos = ed.getPosition();
  if (!model || !pos) return false;

  const selection = ed.getSelection();
  if (selection && !selection.isEmpty()) return false; // let default handle a selection

  const lines = model.getLinesContent();
  const block = findTableBlock(lines, pos.lineNumber);
  if (!block) return false;

  const lineContent = model.getLineContent(pos.lineNumber);
  if (isTableSeparatorLine(lineContent)) return false;

  if (isRowEmpty(lineContent)) {
    // Exit: turn the empty table row into a blank line.
    ed.executeEdits('table-enter-exit', [
      {
        range: {
          startLineNumber: pos.lineNumber,
          startColumn: 1,
          endLineNumber: pos.lineNumber,
          endColumn: model.getLineMaxColumn(pos.lineNumber),
        },
        text: '',
        forceMoveMarkers: true,
      },
    ]);
    ed.setPosition({ lineNumber: pos.lineNumber, column: 1 });
    return true;
  }

  const colCount = getColumnCount(lines.slice(block.start - 1, block.end));
  const newRow = makeEmptyRow(colCount);
  const eol = model.getLineMaxColumn(pos.lineNumber);

  ed.executeEdits('table-enter-newrow', [
    {
      range: {
        startLineNumber: pos.lineNumber,
        startColumn: eol,
        endLineNumber: pos.lineNumber,
        endColumn: eol,
      },
      text: '\n' + newRow,
      forceMoveMarkers: true,
    },
  ]);
  selectCell(ed, pos.lineNumber + 1, newRow, 0);
  return true;
}

/**
 * #7 — Tab / Shift+Tab between cells. Wraps to the next/previous row (skipping
 * the separator) and creates a new row when tabbing past the last cell.
 */
export function handleTableTab(ed: IEditor, reverse: boolean): boolean {
  const model = ed.getModel();
  const pos = ed.getPosition();
  if (!model || !pos) return false;

  const lines = model.getLinesContent();
  const block = findTableBlock(lines, pos.lineNumber);
  if (!block) return false;

  const lineContent = model.getLineContent(pos.lineNumber);
  if (isTableSeparatorLine(lineContent)) return false;

  const cellCount = getCellCount(lineContent);
  if (cellCount === 0) return false;
  const cur = getCellIndexAtColumn(lineContent, pos.column);

  if (!reverse) {
    if (cur < cellCount - 1) {
      selectCell(ed, pos.lineNumber, lineContent, cur + 1);
      return true;
    }
    // Last cell -> first cell of the next row, skipping the separator.
    let nextLine = pos.lineNumber + 1;
    if (nextLine <= block.end && isTableSeparatorLine(model.getLineContent(nextLine))) {
      nextLine++;
    }
    if (nextLine <= block.end) {
      selectCell(ed, nextLine, model.getLineContent(nextLine), 0);
      return true;
    }
    // Past the last row -> append a new row.
    const colCount = getColumnCount(lines.slice(block.start - 1, block.end));
    const newRow = makeEmptyRow(colCount);
    const eol = model.getLineMaxColumn(pos.lineNumber);
    ed.executeEdits('table-tab-newrow', [
      {
        range: {
          startLineNumber: pos.lineNumber,
          startColumn: eol,
          endLineNumber: pos.lineNumber,
          endColumn: eol,
        },
        text: '\n' + newRow,
        forceMoveMarkers: true,
      },
    ]);
    selectCell(ed, pos.lineNumber + 1, newRow, 0);
    return true;
  }

  // reverse (Shift+Tab)
  if (cur > 0) {
    selectCell(ed, pos.lineNumber, lineContent, cur - 1);
    return true;
  }
  // First cell -> last cell of the previous row, skipping the separator.
  let prevLine = pos.lineNumber - 1;
  if (prevLine >= block.start && isTableSeparatorLine(model.getLineContent(prevLine))) {
    prevLine--;
  }
  if (prevLine >= block.start) {
    const prevContent = model.getLineContent(prevLine);
    selectCell(ed, prevLine, prevContent, getCellCount(prevContent) - 1);
    return true;
  }
  // Already at the first cell of the header: stay put but consume the key.
  return true;
}
