import { describe, it, expect } from 'vitest';
import { findTaskLineIndices, setTaskLineChecked } from '../taskListLines';

// findTaskLineIndices must yield exactly the items marked renders as
// checkboxes, in document order — it is the source-side half of the preview's
// checkbox-index ↔ source-line mapping (transformCheckboxes is the other).
describe('findTaskLineIndices', () => {
  // T-TLL-01: the 3-level nested document from the bug report.
  it('T-TLL-01: maps nested task items to their own lines', () => {
    const md = '- [ ] aaaa\n  - [x] bbbbb\n    - [ ] ccccc\n- [ ] AAAAA\n  - [ ] BBBBB\n    - [ ] CCCCC';
    expect(findTaskLineIndices(md)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  // T-TLL-02: non-task lines, malformed task lines and blank lines are skipped.
  it('T-TLL-02: skips plain items, malformed task lines and prose', () => {
    const md = 'intro\n\n- plain\n- [ ]nospace\n- [ ] real\n- [ ]\n- [x] done';
    expect(findTaskLineIndices(md)).toEqual([4, 6]);
  });

  // T-TLL-03: `+` / ordered bullets, `[X]`, and tasks inside blockquotes are
  // tasks for marked and must be counted.
  it('T-TLL-03: counts +, ordered, [X] and blockquoted task items', () => {
    const md = '+ [ ] plus\n\n1. [ ] one\n2. [X] two\n\n> - [ ] quoted\n>   - [x] nested quoted';
    expect(findTaskLineIndices(md)).toEqual([0, 2, 3, 5, 6]);
  });

  // T-TLL-04: task-looking lines inside fenced or indented code are not
  // rendered as checkboxes, so they must not shift the mapping. (The indented
  // block follows a paragraph: right after a list item, 4 spaces would be a
  // nested list instead.)
  it('T-TLL-04: ignores task-like lines inside code blocks', () => {
    const md = '```\n- [ ] fenced\n```\n\n- [ ] real\n\nparagraph\n\n    - [ ] indented code\n\n- [ ] last';
    expect(findTaskLineIndices(md)).toEqual([4, 10]);
  });

  // T-TLL-05: identical task lines map to their own occurrence.
  it('T-TLL-05: maps duplicate task lines in order', () => {
    expect(findTaskLineIndices('- [ ] same\n- [ ] same\n- [ ] same')).toEqual([0, 1, 2]);
  });

  // T-TLL-06: loose items (blank lines between them) and a paragraph inside an
  // item do not break the mapping; CRLF line endings count as single lines.
  it('T-TLL-06: handles loose items, inner paragraphs and CRLF', () => {
    const md = '- [ ] a\r\n\r\n  para\r\n  - [x] b\r\n\r\n- [ ] c';
    expect(findTaskLineIndices(md)).toEqual([0, 3, 5]);
  });

  it('T-TLL-07: returns an empty list when there are no tasks', () => {
    expect(findTaskLineIndices('# title\n\nno tasks here')).toEqual([]);
    expect(findTaskLineIndices('')).toEqual([]);
  });
});

describe('setTaskLineChecked', () => {
  // T-TLL-08: only the checkbox state changes; indent, marker and text stay.
  it('T-TLL-08: flips the state and preserves indent, bullet and text', () => {
    expect(setTaskLineChecked('    - [ ] ccccc', true)).toBe('    - [x] ccccc');
    expect(setTaskLineChecked('  * [x] Child 2', false)).toBe('  * [ ] Child 2');
    expect(setTaskLineChecked('1. [X] two', false)).toBe('1. [ ] two');
    expect(setTaskLineChecked('> - [ ] quoted [ ] not this', true)).toBe('> - [x] quoted [ ] not this');
    expect(setTaskLineChecked('- [ ] ', true)).toBe('- [x] ');
  });

  it('T-TLL-09: returns null for lines that are not task lines', () => {
    expect(setTaskLineChecked('- [ ]nospace', true)).toBeNull();
    expect(setTaskLineChecked('- plain', true)).toBeNull();
    expect(setTaskLineChecked('', true)).toBeNull();
  });
});
