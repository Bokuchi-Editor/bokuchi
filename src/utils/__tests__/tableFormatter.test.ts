import { describe, it, expect } from 'vitest';
import {
  displayWidth,
  splitCells,
  escapeCell,
  isTableSeparatorLine,
  isPipeRow,
  findTableBlock,
  parseTableBlock,
  serializeTable,
  getCellCount,
  getCellIndexAtColumn,
  getCellContentRange,
  isRowEmpty,
  makeEmptyRow,
  getColumnCount,
  insertRow,
  deleteRow,
  moveRow,
  insertColumn,
  deleteColumn,
  moveColumn,
  formatTableAtLine,
} from '../tableFormatter';

describe('tableFormatter', () => {
  describe('displayWidth', () => {
    // T-TF-01: ascii counts as 1 per char
    it('T-TF-01: counts ascii as width 1', () => {
      expect(displayWidth('abc')).toBe(3);
    });

    // T-TF-02: CJK counts as 2 per char
    it('T-TF-02: counts CJK as width 2', () => {
      expect(displayWidth('あ')).toBe(2);
      expect(displayWidth('日本語')).toBe(6);
      expect(displayWidth('a日')).toBe(3);
    });
  });

  describe('splitCells', () => {
    // T-TF-03: splits and trims outer pipes
    it('T-TF-03: splits a row into trimmed cells', () => {
      expect(splitCells('| a | b | c |')).toEqual(['a', 'b', 'c']);
    });

    // T-TF-04: keeps escaped pipes inside cells
    it('T-TF-04: does not split on escaped pipes', () => {
      expect(splitCells('| a\\|b | c |')).toEqual(['a\\|b', 'c']);
    });
  });

  describe('escapeCell', () => {
    // T-TF-05: escapes pipes and flattens newlines
    it('T-TF-05: escapes pipes and removes newlines', () => {
      expect(escapeCell('a|b')).toBe('a\\|b');
      expect(escapeCell('a\nb')).toBe('a b');
    });
  });

  describe('isTableSeparatorLine / isPipeRow', () => {
    // T-TF-06: recognizes separator rows with alignment markers
    it('T-TF-06: detects separator lines', () => {
      expect(isTableSeparatorLine('| --- | :--: | ---: |')).toBe(true);
      expect(isTableSeparatorLine('| :-- | -- |')).toBe(true);
      expect(isTableSeparatorLine('| a | b |')).toBe(false);
    });

    // T-TF-07: pipe-row heuristic
    it('T-TF-07: detects pipe rows', () => {
      expect(isPipeRow('| a | b |')).toBe(true);
      expect(isPipeRow('plain text')).toBe(false);
      expect(isPipeRow('   ')).toBe(false);
    });
  });

  describe('findTableBlock', () => {
    const lines = [
      'intro',
      '| a | b |',
      '| --- | --- |',
      '| 1 | 2 |',
      '| 3 | 4 |',
      '',
      'after',
    ];

    // T-TF-08: finds the block from any row inside it (1-based, inclusive)
    it('T-TF-08: finds block from a body row', () => {
      expect(findTableBlock(lines, 4)).toEqual({ start: 2, end: 5 });
    });

    // T-TF-09: finds block from the header row
    it('T-TF-09: finds block from the header row', () => {
      expect(findTableBlock(lines, 2)).toEqual({ start: 2, end: 5 });
    });

    // T-TF-10: returns null outside a table
    it('T-TF-10: returns null when not in a table', () => {
      expect(findTableBlock(lines, 1)).toBeNull();
      expect(findTableBlock(lines, 7)).toBeNull();
    });

    // T-TF-11: null when there is no separator row
    it('T-TF-11: returns null for pipe rows without a separator', () => {
      const noSep = ['| a | b |', '| c | d |'];
      expect(findTableBlock(noSep, 1)).toBeNull();
    });
  });

  describe('parse + serialize', () => {
    // T-TF-12: round-trips and pads columns
    it('T-TF-12: parses and serializes with padded columns', () => {
      const block = ['| Name | Age |', '| --- | --- |', '| Alice | 30 |'];
      const table = parseTableBlock(block);
      expect(table.header).toEqual(['Name', 'Age']);
      expect(table.rows).toEqual([['Alice', '30']]);

      const out = serializeTable(table);
      expect(out).toBe(
        ['| Name  | Age |', '| ----- | --- |', '| Alice | 30  |'].join('\n'),
      );
    });

    // T-TF-13: preserves alignment markers
    it('T-TF-13: preserves alignment in the separator', () => {
      const block = ['| a | b | c |', '| :--- | :--: | ---: |', '| 1 | 2 | 3 |'];
      const out = serializeTable(parseTableBlock(block));
      const sep = out.split('\n')[1];
      // Columns are 1 char wide but padded to the 3-char minimum.
      expect(sep).toBe('| :-- | :-: | --: |');
    });

    // T-TF-14: pads ragged rows to the header column count
    it('T-TF-14: normalizes ragged rows', () => {
      const block = ['| a | b | c |', '| --- | --- | --- |', '| 1 |'];
      const table = parseTableBlock(block);
      expect(table.rows[0]).toEqual(['1', '', '']);
    });

    // T-TF-15: serialize is idempotent
    it('T-TF-15: serialize(parse(serialize(x))) === serialize(x)', () => {
      const block = ['| Name | 値 |', '| --- | ---: |', '| Alice | 30 |', '| 太郎 | 7 |'];
      const once = serializeTable(parseTableBlock(block));
      const twice = serializeTable(parseTableBlock(once.split('\n')));
      expect(twice).toBe(once);
    });

    // T-TF-16: aligns CJK content by display width
    it('T-TF-16: aligns columns containing CJK characters', () => {
      const block = ['| 名前 | x |', '| --- | --- |', '| 太郎 | 1 |', '| A | 2 |'];
      const out = serializeTable(parseTableBlock(block));
      const [h, , r1, r2] = out.split('\n');
      // First column width is 4 (名前 / 太郎 = width 4); "A" padded to 4 cols.
      // Second column padded to the 3-char minimum.
      expect(h).toBe('| 名前 | x   |');
      expect(r1).toBe('| 太郎 | 1   |');
      expect(r2).toBe('| A    | 2   |');
    });
  });

  describe('cell geometry', () => {
    const line = '| abc | de |';

    // T-TF-17: counts cells
    it('T-TF-17: counts cells in a row', () => {
      expect(getCellCount(line)).toBe(2);
      expect(getCellCount('no pipes')).toBe(0);
    });

    // T-TF-18: maps a column to a cell index
    it('T-TF-18: resolves the cell index at a column', () => {
      // "| abc | de |": 'a' is at column 3, 'd' at column 9
      expect(getCellIndexAtColumn(line, 3)).toBe(0);
      expect(getCellIndexAtColumn(line, 9)).toBe(1);
    });

    // T-TF-19: returns the trimmed content span of a cell
    it('T-TF-19: returns the content range of a cell', () => {
      // 'abc' occupies columns 3..6 (start inclusive, end exclusive => 3 and 6)
      expect(getCellContentRange(line, 0)).toEqual({ startColumn: 3, endColumn: 6 });
    });

    // T-TF-20: empty cell yields a caret (start === end)
    it('T-TF-20: returns a caret position for an empty cell', () => {
      const r = getCellContentRange('|  | x |', 0);
      expect(r).not.toBeNull();
      expect(r!.startColumn).toBe(r!.endColumn);
    });
  });

  describe('row helpers', () => {
    // T-TF-21: detects empty rows
    it('T-TF-21: detects empty rows', () => {
      expect(isRowEmpty('|  |  |')).toBe(true);
      expect(isRowEmpty('| a |  |')).toBe(false);
    });

    // T-TF-22: builds an empty row with the given column count
    it('T-TF-22: makes an empty row', () => {
      expect(makeEmptyRow(3)).toBe('| | | |');
      expect(getCellCount(makeEmptyRow(3))).toBe(3);
    });

    // T-TF-23: column count from block lines
    it('T-TF-23: reads column count from a block', () => {
      expect(getColumnCount(['| a | b | c |', '| --- | --- | --- |'])).toBe(3);
    });
  });

  describe('structural operations', () => {
    const table = parseTableBlock([
      '| a | b |',
      '| --- | --- |',
      '| 1 | 2 |',
      '| 3 | 4 |',
    ]);

    // T-TF-24: insertRow
    it('T-TF-24: inserts a blank body row', () => {
      const t = insertRow(table, 1);
      expect(t.rows).toEqual([['1', '2'], ['', ''], ['3', '4']]);
    });

    // T-TF-25: deleteRow
    it('T-TF-25: deletes a body row', () => {
      expect(deleteRow(table, 0).rows).toEqual([['3', '4']]);
    });

    // T-TF-26: moveRow
    it('T-TF-26: moves a body row', () => {
      expect(moveRow(table, 0, 1).rows).toEqual([['3', '4'], ['1', '2']]);
    });

    // T-TF-27: insertColumn
    it('T-TF-27: inserts a blank column', () => {
      const t = insertColumn(table, 1);
      expect(t.header).toEqual(['a', '', 'b']);
      expect(t.alignments).toEqual(['none', 'none', 'none']);
      expect(t.rows[0]).toEqual(['1', '', '2']);
    });

    // T-TF-28: deleteColumn
    it('T-TF-28: deletes a column', () => {
      const t = deleteColumn(table, 0);
      expect(t.header).toEqual(['b']);
      expect(t.rows).toEqual([['2'], ['4']]);
    });

    // T-TF-29: deleteColumn keeps at least one column
    it('T-TF-29: refuses to delete the last column', () => {
      const single = parseTableBlock(['| a |', '| --- |', '| 1 |']);
      expect(deleteColumn(single, 0).header).toEqual(['a']);
    });

    // T-TF-30: moveColumn
    it('T-TF-30: moves a column', () => {
      const t = moveColumn(table, 0, 1);
      expect(t.header).toEqual(['b', 'a']);
      expect(t.rows[0]).toEqual(['2', '1']);
    });
  });

  describe('formatTableAtLine', () => {
    const lines = ['# title', '', '| a | bb |', '| --- | --- |', '| 1 | 2 |', ''];

    // T-TF-31: formats the block at the cursor line
    it('T-TF-31: returns the block range and formatted text', () => {
      const result = formatTableAtLine(lines, 5);
      expect(result).not.toBeNull();
      expect(result!.start).toBe(3);
      expect(result!.end).toBe(5);
      expect(result!.text).toBe(
        ['| a   | bb  |', '| --- | --- |', '| 1   | 2   |'].join('\n'),
      );
    });

    // T-TF-32: null when the cursor is not in a table
    it('T-TF-32: returns null outside a table', () => {
      expect(formatTableAtLine(lines, 1)).toBeNull();
    });
  });
});
