import { describe, it, expect } from 'vitest';
import { computeEditingContext } from '../editingContext';

const TABLE = ['| a | b |', '| --- | --- |', '| 1 | 2 |'];

describe('computeEditingContext', () => {
  it('marks a plain paragraph as neither table row nor list item', () => {
    expect(computeEditingContext(['just some text'], 1)).toEqual({
      inTableRow: false,
      inListItem: false,
    });
  });

  it('detects a list item line', () => {
    expect(computeEditingContext(['- item'], 1)).toEqual({
      inTableRow: false,
      inListItem: true,
    });
  });

  it('detects an ordered list item line', () => {
    expect(computeEditingContext(['1. first'], 1)).toEqual({
      inTableRow: false,
      inListItem: true,
    });
  });

  it('treats a table header/body row as a table row', () => {
    expect(computeEditingContext(TABLE, 1)).toEqual({ inTableRow: true, inListItem: false });
    expect(computeEditingContext(TABLE, 3)).toEqual({ inTableRow: true, inListItem: false });
  });

  it('does not treat the table separator line as an editable row', () => {
    expect(computeEditingContext(TABLE, 2)).toEqual({ inTableRow: false, inListItem: false });
  });

  it('returns all-false for an out-of-range line', () => {
    expect(computeEditingContext(['x'], 99)).toEqual({ inTableRow: false, inListItem: false });
  });
});
