import type { Tab } from '../types/tab';

/** A single match located inside the active editor, with Monaco 1-based range. */
export interface MatchInfo {
  range: {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
  };
  text: string;
  lineContent: string;
}

/** A single match located in one of the open tabs (cross-tab search). */
export interface CrossTabMatchInfo {
  tabId: string;
  tabTitle: string;
  lineNumber: number;
  column: number;
  text: string;
  lineContent: string;
}

/** Toggleable search modifiers shared by single-editor and cross-tab search. */
export interface SearchOptions {
  caseSensitive: boolean;
  wholeWord: boolean;
  regex: boolean;
}

/** Characters of context rendered before a match in the result list. */
export const SNIPPET_CONTEXT_BEFORE = 30;
/** Characters of context rendered after a match in the result list. */
export const SNIPPET_CONTEXT_AFTER = 40;

/**
 * Build the search RegExp for the given query and options.
 * Returns null when the query is empty or the pattern is an invalid regex,
 * so callers can uniformly treat "no usable pattern" as "no matches".
 */
export function buildSearchRegex(searchText: string, options: SearchOptions): RegExp | null {
  if (!searchText) return null;
  const flags = options.caseSensitive ? 'g' : 'gi';
  try {
    if (options.regex) {
      return new RegExp(searchText, flags);
    }
    const escaped = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = options.wholeWord ? `\\b${escaped}\\b` : escaped;
    return new RegExp(pattern, flags);
  } catch {
    return null;
  }
}

/** A raw match: byte offset into the source text plus the matched substring. */
export interface RawMatch {
  index: number;
  text: string;
}

/**
 * Iterate all non-empty matches of a global regex in the text.
 * Skips zero-length matches (advancing lastIndex) to avoid infinite loops.
 * Resets lastIndex up front so the regex can be reused across calls.
 */
export function iterateMatches(text: string, regex: RegExp): RawMatch[] {
  const result: RawMatch[] = [];
  regex.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match[0].length === 0) {
      regex.lastIndex++;
      continue;
    }
    result.push({ index: match.index, text: match[0] });
  }
  return result;
}

/**
 * Find matches across all tabs, deriving the 1-based line and column from the
 * string offset of each match.
 */
export function searchAcrossTabs(tabs: Tab[], regex: RegExp): CrossTabMatchInfo[] {
  const allMatches: CrossTabMatchInfo[] = [];
  for (const tab of tabs) {
    const lines = tab.content.split(/\r?\n/);
    for (const { index, text } of iterateMatches(tab.content, regex)) {
      const beforeMatch = tab.content.substring(0, index);
      const lineNumber = beforeMatch.split(/\r?\n/).length;
      const lastNewline = beforeMatch.lastIndexOf('\n');
      const column = index - lastNewline;
      allMatches.push({
        tabId: tab.id,
        tabTitle: tab.title,
        lineNumber,
        column,
        text,
        lineContent: lines[lineNumber - 1] || '',
      });
    }
  }
  return allMatches;
}

/**
 * Pick the first match at or after the cursor, falling back to the last match
 * when the cursor is past every match. Returns -1 when there are no matches
 * and 0 when the cursor position is unknown.
 */
export function pickNearestMatchIndex(
  matches: MatchInfo[],
  cursor: { lineNumber: number; column: number } | null,
): number {
  if (matches.length === 0) return -1;
  if (!cursor) return 0;
  let bestIndex = 0;
  for (let i = 0; i < matches.length; i++) {
    const r = matches[i].range;
    if (
      r.startLineNumber > cursor.lineNumber ||
      (r.startLineNumber === cursor.lineNumber && r.startColumn >= cursor.column)
    ) {
      return i;
    }
    bestIndex = i;
  }
  return bestIndex;
}

/** The three text segments used to render a match with its context. */
export interface SnippetParts {
  before: string;
  matched: string;
  after: string;
}

/**
 * Split a line into before/matched/after segments around a match, using the
 * shared context widths. `zeroBasedColumn` is the 0-based start of the match.
 */
export function snippetParts(
  lineContent: string,
  zeroBasedColumn: number,
  matchLength: number,
): SnippetParts {
  const col = zeroBasedColumn;
  return {
    before: lineContent.substring(Math.max(0, col - SNIPPET_CONTEXT_BEFORE), col),
    matched: lineContent.substring(col, col + matchLength),
    after: lineContent.substring(col + matchLength, col + matchLength + SNIPPET_CONTEXT_AFTER),
  };
}
