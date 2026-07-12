import { describe, it, expect } from 'vitest';
import { computeEditorStatus } from '../editorStatus';

describe('computeEditorStatus', () => {
  it('reports cursor position and total counts with no selection', () => {
    expect(computeEditorStatus('hello world', '', { lineNumber: 3, column: 5 })).toEqual({
      line: 3,
      column: 5,
      totalCharacters: 11,
      selectedCharacters: 0,
      totalWords: 2,
      selectedWords: 0,
    });
  });

  it('counts characters and words in the selection', () => {
    const status = computeEditorStatus('one two three', 'two three', { lineNumber: 1, column: 1 });
    expect(status.selectedCharacters).toBe(9);
    expect(status.selectedWords).toBe(2);
    expect(status.totalWords).toBe(3);
  });

  it('counts CJK characters per-character like the status bar does', () => {
    const status = computeEditorStatus('日本語', '', { lineNumber: 1, column: 1 });
    expect(status.totalCharacters).toBe(3);
    expect(status.totalWords).toBe(3);
  });
});
