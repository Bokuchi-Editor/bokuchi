import { describe, it, expect, vi } from 'vitest';
import type { editor } from 'monaco-editor';
import {
  isCursorInTableRow,
  handleTableTab,
  handleTableEnter,
  formatTableInEditor,
} from '../tableEditorActions';
import { makeEmptyRow } from '../tableFormatter';

// A minimal Monaco editor stub backed by a single string. executeEdits applies
// the (single-op) edit by offset so the backing content round-trips, letting us
// assert both the resulting text and where the selection/caret was moved. The
// pure table logic comes from the real tableFormatter helpers, so these tests
// exercise the adapter together with the production parsing.
function posToOffset(text: string, lineNumber: number, column: number): number {
  const lines = text.split('\n');
  let offset = 0;
  for (let i = 0; i < lineNumber - 1; i++) offset += lines[i].length + 1;
  return offset + (column - 1);
}

interface Sel {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
}

function makeEditor(initial: string[], pos: { lineNumber: number; column: number }, selectionEmpty = true) {
  let text = initial.join('\n');
  let position = { ...pos };
  const setSelection = vi.fn((sel: Sel) => {
    position = { lineNumber: sel.endLineNumber, column: sel.endColumn };
  });
  const setPosition = vi.fn((p: { lineNumber: number; column: number }) => {
    position = { ...p };
  });
  const executeEdits = vi.fn((_src: string, edits: Array<{ range: Sel; text: string }>) => {
    const op = edits[0];
    const start = posToOffset(text, op.range.startLineNumber, op.range.startColumn);
    const end = posToOffset(text, op.range.endLineNumber, op.range.endColumn);
    text = text.slice(0, start) + op.text + text.slice(end);
    return true;
  });

  const model = {
    getLinesContent: () => text.split('\n'),
    getLineContent: (n: number) => text.split('\n')[n - 1] ?? '',
    getLineMaxColumn: (n: number) => (text.split('\n')[n - 1] ?? '').length + 1,
  };

  const ed = {
    getModel: () => model,
    getPosition: () => position,
    getSelection: () => ({ isEmpty: () => selectionEmpty }),
    setSelection,
    setPosition,
    executeEdits,
    revealRangeInCenterIfOutsideViewport: vi.fn(),
    focus: vi.fn(),
  } as unknown as editor.IStandaloneCodeEditor;

  return {
    ed,
    setSelection,
    setPosition,
    executeEdits,
    get text() {
      return text;
    },
    get lines() {
      return text.split('\n');
    },
  };
}

const TABLE = [
  '| A | B | C |',
  '| --- | --- | --- |',
  '| 1 | 2 | 3 |',
  '| 4 | 5 | 6 |',
];

// 1-based content columns for the cells of a `| x | y | z |` row.
const COL = { c0: 3, c1: 7, c2: 11 };

function selectedText(line: string, sel: Sel): string {
  return line.slice(sel.startColumn - 1, sel.endColumn - 1);
}

describe('tableEditorActions', () => {
  describe('isCursorInTableRow', () => {
    it('T-TE-01: true on a content row', () => {
      const { ed } = makeEditor(TABLE, { lineNumber: 3, column: COL.c0 });
      expect(isCursorInTableRow(ed)).toBe(true);
    });

    it('T-TE-02: false on the separator row', () => {
      const { ed } = makeEditor(TABLE, { lineNumber: 2, column: 3 });
      expect(isCursorInTableRow(ed)).toBe(false);
    });

    it('T-TE-03: false outside any table', () => {
      const { ed } = makeEditor([...TABLE, '', 'plain text'], { lineNumber: 6, column: 2 });
      expect(isCursorInTableRow(ed)).toBe(false);
    });
  });

  describe('handleTableTab (forward)', () => {
    it('T-TE-04: advances to the next cell in the same row', () => {
      const { ed, setSelection } = makeEditor(TABLE, { lineNumber: 3, column: COL.c0 });
      expect(handleTableTab(ed, false)).toBe(true);
      const sel = setSelection.mock.calls[0][0];
      expect(sel.startLineNumber).toBe(3);
      expect(selectedText(TABLE[2], sel)).toBe('2');
    });

    it('T-TE-05: wraps from the last cell to the next row, skipping the separator', () => {
      // Last cell of the header row -> first cell of the first body row (row 3).
      const { ed, setSelection } = makeEditor(TABLE, { lineNumber: 1, column: COL.c2 });
      expect(handleTableTab(ed, false)).toBe(true);
      const sel = setSelection.mock.calls[0][0];
      expect(sel.startLineNumber).toBe(3);
      expect(selectedText(TABLE[2], sel)).toBe('1');
    });

    it('T-TE-06: appends a new row when tabbing past the last cell of the last row', () => {
      const h = makeEditor(TABLE, { lineNumber: 4, column: COL.c2 });
      expect(handleTableTab(h.ed, false)).toBe(true);
      expect(h.executeEdits).toHaveBeenCalled();
      expect(h.lines).toHaveLength(5);
      expect(h.lines[4]).toBe(makeEmptyRow(3));
      // Caret lands in the first cell of the new row.
      const sel = h.setSelection.mock.calls[0][0];
      expect(sel.startLineNumber).toBe(5);
    });
  });

  describe('handleTableTab (reverse)', () => {
    it('T-TE-07: moves to the previous cell in the same row', () => {
      const { ed, setSelection } = makeEditor(TABLE, { lineNumber: 3, column: COL.c1 });
      expect(handleTableTab(ed, true)).toBe(true);
      const sel = setSelection.mock.calls[0][0];
      expect(selectedText(TABLE[2], sel)).toBe('1');
    });

    it('T-TE-08: wraps to the previous row last cell, skipping the separator', () => {
      // First cell of row 3 -> last cell of the header row (skipping separator row 2).
      const { ed, setSelection } = makeEditor(TABLE, { lineNumber: 3, column: COL.c0 });
      expect(handleTableTab(ed, true)).toBe(true);
      const sel = setSelection.mock.calls[0][0];
      expect(sel.startLineNumber).toBe(1);
      expect(selectedText(TABLE[0], sel)).toBe('C');
    });

    it('T-TE-09: stays put at the very first header cell (consumes the key)', () => {
      const { ed, setSelection, executeEdits } = makeEditor(TABLE, { lineNumber: 1, column: COL.c0 });
      expect(handleTableTab(ed, true)).toBe(true);
      expect(setSelection).not.toHaveBeenCalled();
      expect(executeEdits).not.toHaveBeenCalled();
    });
  });

  describe('handleTableEnter', () => {
    it('T-TE-10: inserts an empty row below a non-empty row and moves into it', () => {
      const h = makeEditor(TABLE, { lineNumber: 3, column: COL.c0 });
      expect(handleTableEnter(h.ed)).toBe(true);
      expect(h.lines).toHaveLength(5);
      expect(h.lines[3]).toBe(makeEmptyRow(3));
      const sel = h.setSelection.mock.calls[0][0];
      expect(sel.startLineNumber).toBe(4);
    });

    it('T-TE-11: clears an already-empty table row (exits the table)', () => {
      const withEmpty = [...TABLE, makeEmptyRow(3)];
      const h = makeEditor(withEmpty, { lineNumber: 5, column: 2 });
      expect(handleTableEnter(h.ed)).toBe(true);
      expect(h.lines[4]).toBe('');
      expect(h.setPosition).toHaveBeenCalledWith({ lineNumber: 5, column: 1 });
    });

    it('T-TE-12: defers to default Enter when there is an active selection', () => {
      const h = makeEditor(TABLE, { lineNumber: 3, column: COL.c0 }, /* selectionEmpty */ false);
      expect(handleTableEnter(h.ed)).toBe(false);
      expect(h.executeEdits).not.toHaveBeenCalled();
    });

    it('T-TE-13: defers on the separator row', () => {
      const h = makeEditor(TABLE, { lineNumber: 2, column: 3 });
      expect(handleTableEnter(h.ed)).toBe(false);
      expect(h.executeEdits).not.toHaveBeenCalled();
    });
  });

  describe('formatTableInEditor', () => {
    it('T-TE-14: returns false for a null editor', () => {
      expect(formatTableInEditor(null)).toBe(false);
    });

    it('T-TE-15: pretty-prints the table block at the cursor', () => {
      const messy = [
        '|A|B|',
        '|-|-|',
        '|1|2|',
      ];
      const h = makeEditor(messy, { lineNumber: 1, column: 2 });
      expect(formatTableInEditor(h.ed)).toBe(true);
      expect(h.executeEdits).toHaveBeenCalled();
      // Columns are padded out; content is preserved.
      expect(h.text).toContain('| A ');
      expect(h.text).toContain('| 1 ');
      expect(h.text).toContain('---');
    });

    it('T-TE-16: returns false when the cursor is not in a table', () => {
      const h = makeEditor(['just a paragraph'], { lineNumber: 1, column: 2 });
      expect(formatTableInEditor(h.ed)).toBe(false);
      expect(h.executeEdits).not.toHaveBeenCalled();
    });
  });
});
