import { describe, it, expect, vi } from 'vitest';
import type { editor } from 'monaco-editor';
import {
  isCursorInListItem,
  handleListEnter,
  handleListIndent,
} from '../listEditorActions';

// A minimal Monaco editor stub backed by a single string, mirroring the stub in
// tableEditorActions.test.ts. executeEdits applies the (single-op) edit by
// offset so the backing content round-trips, letting us assert both the
// resulting text and where the caret was moved. The pure list logic comes from
// the real listFormatter helpers.
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

function makeEditor(
  initial: string[],
  pos: { lineNumber: number; column: number },
  opts: { selectionEmpty?: boolean; selection?: (Sel & { empty?: boolean }); tabSize?: number } = {},
) {
  const { selectionEmpty = true, selection, tabSize = 2 } = opts;
  let text = initial.join('\n');
  let position = { ...pos };
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
    getOptions: () => ({ tabSize }),
  };

  const ed = {
    getModel: () => model,
    getPosition: () => position,
    getSelection: () =>
      selection
        ? { ...selection, isEmpty: () => selection.empty ?? false }
        : {
            isEmpty: () => selectionEmpty,
            startLineNumber: pos.lineNumber,
            endLineNumber: pos.lineNumber,
          },
    setPosition,
    executeEdits,
    revealPositionInCenterIfOutsideViewport: vi.fn(),
  } as unknown as editor.IStandaloneCodeEditor;

  return {
    ed,
    setPosition,
    executeEdits,
    get text() {
      return text;
    },
    get lines() {
      return text.split('\n');
    },
    get position() {
      return position;
    },
  };
}

describe('listEditorActions', () => {
  describe('isCursorInListItem', () => {
    it('T-LE-01: true on a list line, false otherwise', () => {
      expect(isCursorInListItem(makeEditor(['- a'], { lineNumber: 1, column: 4 }).ed)).toBe(true);
      expect(isCursorInListItem(makeEditor(['plain'], { lineNumber: 1, column: 2 }).ed)).toBe(false);
    });
  });

  describe('handleListEnter', () => {
    it('T-LE-02: continues a bullet list with a new marker', () => {
      const h = makeEditor(['- first'], { lineNumber: 1, column: 8 }); // caret at EOL
      expect(handleListEnter(h.ed)).toBe(true);
      expect(h.lines).toEqual(['- first', '- ']);
      expect(h.position).toEqual({ lineNumber: 2, column: 3 });
    });

    it('T-LE-03: increments an ordered list', () => {
      const h = makeEditor(['1. one'], { lineNumber: 1, column: 7 });
      handleListEnter(h.ed);
      expect(h.lines).toEqual(['1. one', '2. ']);
    });

    it('T-LE-04: continues a task list with a fresh unchecked box', () => {
      const h = makeEditor(['- [x] done'], { lineNumber: 1, column: 11 });
      handleListEnter(h.ed);
      expect(h.lines).toEqual(['- [x] done', '- [ ] ']);
    });

    it('T-LE-05: ends the list on an empty item', () => {
      const h = makeEditor(['- item', '- '], { lineNumber: 2, column: 3 });
      expect(handleListEnter(h.ed)).toBe(true);
      expect(h.lines).toEqual(['- item', '']);
      expect(h.position).toEqual({ lineNumber: 2, column: 1 });
    });

    it('T-LE-06: preserves indentation when continuing', () => {
      const h = makeEditor(['    - nested'], { lineNumber: 1, column: 13 });
      handleListEnter(h.ed);
      expect(h.lines).toEqual(['    - nested', '    - ']);
    });

    it('T-LE-07: splits content at the caret', () => {
      const h = makeEditor(['- abcdef'], { lineNumber: 1, column: 6 }); // between "abc" and "def"
      handleListEnter(h.ed);
      expect(h.lines).toEqual(['- abc', '- def']);
    });

    it('T-LE-08: defers (returns false) on a non-list line', () => {
      const h = makeEditor(['plain'], { lineNumber: 1, column: 3 });
      expect(handleListEnter(h.ed)).toBe(false);
      expect(h.executeEdits).not.toHaveBeenCalled();
    });

    it('T-LE-09: defers on a non-empty selection', () => {
      const h = makeEditor(['- a'], { lineNumber: 1, column: 4 }, { selectionEmpty: false });
      expect(handleListEnter(h.ed)).toBe(false);
    });

    // Regression: continuing from inside/before the marker duplicated it
    // ("- abc" at column 1 became "- - abc"). Left of the content start the
    // handler must defer to Monaco's plain newline (line pushed down).
    it('T-LE-15: defers at column 1 of a list line', () => {
      const h = makeEditor(['- abc'], { lineNumber: 1, column: 1 });
      expect(handleListEnter(h.ed)).toBe(false);
      expect(h.executeEdits).not.toHaveBeenCalled();
    });

    it('T-LE-16: defers with the caret inside the marker', () => {
      // Column 2 is between "-" and the space, still left of the content.
      const h = makeEditor(['- abc'], { lineNumber: 1, column: 2 });
      expect(handleListEnter(h.ed)).toBe(false);
      // Checkbox items: content starts after "[ ] ", so inside the box defers.
      const c = makeEditor(['- [ ] task'], { lineNumber: 1, column: 5 });
      expect(handleListEnter(c.ed)).toBe(false);
      expect(c.executeEdits).not.toHaveBeenCalled();
    });

    it('T-LE-17: defers with the caret inside the indentation', () => {
      const h = makeEditor(['    - nested'], { lineNumber: 1, column: 3 });
      expect(handleListEnter(h.ed)).toBe(false);
      expect(h.executeEdits).not.toHaveBeenCalled();
    });

    it('T-LE-17b: still continues with the caret exactly at the content start', () => {
      const h = makeEditor(['- abc'], { lineNumber: 1, column: 3 }); // on "a"
      expect(handleListEnter(h.ed)).toBe(true);
      expect(h.lines).toEqual(['- ', '- abc']);
    });
  });

  describe('handleListIndent', () => {
    it('T-LE-10: indents a list item by one tab stop', () => {
      const h = makeEditor(['- a'], { lineNumber: 1, column: 3 }, { tabSize: 2 });
      expect(handleListIndent(h.ed, false)).toBe(true);
      expect(h.lines).toEqual(['  - a']);
      expect(h.position).toEqual({ lineNumber: 1, column: 5 });
    });

    it('T-LE-11: outdents a list item by one tab stop', () => {
      const h = makeEditor(['    - a'], { lineNumber: 1, column: 7 }, { tabSize: 2 });
      expect(handleListIndent(h.ed, true)).toBe(true);
      expect(h.lines).toEqual(['  - a']);
    });

    it('T-LE-12: outdent at column 0 consumes the key without editing', () => {
      const h = makeEditor(['- a'], { lineNumber: 1, column: 3 });
      expect(handleListIndent(h.ed, true)).toBe(true);
      expect(h.executeEdits).not.toHaveBeenCalled();
    });

    it('T-LE-13: defers on a non-list line', () => {
      const h = makeEditor(['plain'], { lineNumber: 1, column: 2 });
      expect(handleListIndent(h.ed, false)).toBe(false);
    });

    it('T-LE-14: defers on a multi-line selection', () => {
      const sel: Sel = { startLineNumber: 1, startColumn: 1, endLineNumber: 2, endColumn: 2 };
      const h = makeEditor(['- a', '- b'], { lineNumber: 1, column: 3 }, { selection: sel });
      expect(handleListIndent(h.ed, false)).toBe(false);
    });

    // Tab-character indentation: outdent expands tabs to spaces (one tab =
    // tabSize spaces) before removing a single tab stop.
    it('T-LE-18: outdent removes a single leading tab entirely', () => {
      const h = makeEditor(['\t- a'], { lineNumber: 1, column: 4 }, { tabSize: 2 });
      expect(handleListIndent(h.ed, true)).toBe(true);
      expect(h.lines).toEqual(['- a']);
    });

    it('T-LE-18b: outdent converts remaining tabs to spaces', () => {
      // Two tabs expand to 4 spaces; removing one tab stop leaves 2 spaces.
      const h = makeEditor(['\t\t- a'], { lineNumber: 1, column: 5 }, { tabSize: 2 });
      expect(handleListIndent(h.ed, true)).toBe(true);
      expect(h.lines).toEqual(['  - a']);
    });
  });
});
