import { describe, it, expect } from 'vitest';
import {
  buildSearchRegex,
  iterateMatches,
  searchAcrossTabs,
  pickNearestMatchIndex,
  snippetParts,
  SNIPPET_CONTEXT_BEFORE,
  SNIPPET_CONTEXT_AFTER,
  type MatchInfo,
} from '../searchMatches';
import type { Tab } from '../../types/tab';

const makeTab = (id: string, title: string, content: string): Tab =>
  ({ id, title, content } as Tab);

const makeMatch = (startLineNumber: number, startColumn: number): MatchInfo => ({
  range: { startLineNumber, startColumn, endLineNumber: startLineNumber, endColumn: startColumn + 1 },
  text: 'x',
  lineContent: '',
});

describe('buildSearchRegex', () => {
  it('returns null for empty query', () => {
    expect(buildSearchRegex('', { caseSensitive: false, wholeWord: false, regex: false })).toBeNull();
  });

  it('escapes special characters in plain mode', () => {
    const re = buildSearchRegex('a.b', { caseSensitive: true, wholeWord: false, regex: false })!;
    expect(re.test('a.b')).toBe(true);
    expect(re.test('axb')).toBe(false);
  });

  it('wraps with word boundaries when wholeWord is set', () => {
    const re = buildSearchRegex('cat', { caseSensitive: false, wholeWord: true, regex: false })!;
    expect('cat category'.match(re)).toHaveLength(1);
  });

  it('is case-insensitive unless caseSensitive is set', () => {
    expect(buildSearchRegex('AB', { caseSensitive: false, wholeWord: false, regex: false })!.flags).toContain('i');
    expect(buildSearchRegex('AB', { caseSensitive: true, wholeWord: false, regex: false })!.flags).not.toContain('i');
  });

  it('honors raw regex patterns in regex mode', () => {
    const re = buildSearchRegex('a.b', { caseSensitive: true, wholeWord: false, regex: true })!;
    expect(re.test('axb')).toBe(true);
  });

  it('returns null for an invalid regex pattern', () => {
    expect(buildSearchRegex('(', { caseSensitive: false, wholeWord: false, regex: true })).toBeNull();
  });
});

describe('iterateMatches', () => {
  it('finds every non-overlapping match', () => {
    const re = buildSearchRegex('a', { caseSensitive: false, wholeWord: false, regex: false })!;
    expect(iterateMatches('banana', re)).toEqual([
      { index: 1, text: 'a' },
      { index: 3, text: 'a' },
      { index: 5, text: 'a' },
    ]);
  });

  it('skips zero-length matches without looping forever', () => {
    const re = buildSearchRegex('a*', { caseSensitive: false, wholeWord: false, regex: true })!;
    const result = iterateMatches('bab', re);
    expect(result).toEqual([{ index: 1, text: 'a' }]);
  });

  it('resets lastIndex so the regex can be reused', () => {
    const re = buildSearchRegex('a', { caseSensitive: false, wholeWord: false, regex: false })!;
    iterateMatches('aa', re);
    expect(iterateMatches('aa', re)).toHaveLength(2);
  });
});

describe('searchAcrossTabs', () => {
  it('computes 1-based line/column for each tab', () => {
    const re = buildSearchRegex('foo', { caseSensitive: false, wholeWord: false, regex: false })!;
    const tabs = [
      makeTab('t1', 'One', 'foo\nbar foo'),
      makeTab('t2', 'Two', 'nothing here'),
    ];
    const result = searchAcrossTabs(tabs, re);
    expect(result).toEqual([
      { tabId: 't1', tabTitle: 'One', lineNumber: 1, column: 1, text: 'foo', lineContent: 'foo' },
      { tabId: 't1', tabTitle: 'One', lineNumber: 2, column: 5, text: 'foo', lineContent: 'bar foo' },
    ]);
  });

  it('handles CRLF line endings', () => {
    const re = buildSearchRegex('x', { caseSensitive: false, wholeWord: false, regex: false })!;
    const result = searchAcrossTabs([makeTab('t', 'T', 'a\r\nx')], re);
    expect(result[0].lineNumber).toBe(2);
    expect(result[0].lineContent).toBe('x');
  });
});

describe('pickNearestMatchIndex', () => {
  it('returns -1 when there are no matches', () => {
    expect(pickNearestMatchIndex([], { lineNumber: 1, column: 1 })).toBe(-1);
  });

  it('returns 0 when cursor is unknown', () => {
    expect(pickNearestMatchIndex([makeMatch(5, 1)], null)).toBe(0);
  });

  it('returns the first match at or after the cursor', () => {
    const matches = [makeMatch(1, 1), makeMatch(3, 1), makeMatch(5, 1)];
    expect(pickNearestMatchIndex(matches, { lineNumber: 2, column: 1 })).toBe(1);
    expect(pickNearestMatchIndex(matches, { lineNumber: 3, column: 1 })).toBe(1);
  });

  it('falls back to the last match when the cursor is past all matches', () => {
    const matches = [makeMatch(1, 1), makeMatch(3, 1)];
    expect(pickNearestMatchIndex(matches, { lineNumber: 9, column: 1 })).toBe(1);
  });
});

describe('snippetParts', () => {
  it('splits a line into before/matched/after', () => {
    expect(snippetParts('hello world', 6, 5)).toEqual({
      before: 'hello ',
      matched: 'world',
      after: '',
    });
  });

  it('clamps the before-context to the configured width', () => {
    const line = 'a'.repeat(100) + 'MATCH';
    const parts = snippetParts(line, 100, 5);
    expect(parts.before).toHaveLength(SNIPPET_CONTEXT_BEFORE);
    expect(parts.matched).toBe('MATCH');
  });

  it('limits the after-context to the configured width', () => {
    const line = 'MATCH' + 'b'.repeat(100);
    const parts = snippetParts(line, 0, 5);
    expect(parts.after).toHaveLength(SNIPPET_CONTEXT_AFTER);
  });
});
