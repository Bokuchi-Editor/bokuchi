/**
 * Map the preview's task-list checkboxes back to their source lines.
 *
 * The preview tags every rendered checkbox with its document-order index
 * (see transformCheckboxes). To toggle the right line we need the same
 * ordering on the source side: the n-th checkbox ↔ the n-th list item that
 * marked treats as a task. Rather than re-implementing GFM's task rules with
 * a hand-written regex (which has drifted from marked more than once —
 * nested items, `+`/ordered bullets, `[X]`, tasks inside code fences), the
 * list items are taken from marked's own lexer, so "what is a task" is by
 * definition what the preview renders as a checkbox.
 */

import { marked, type Token, type Tokens } from 'marked';

/**
 * A GFM task line as marked sees it: optional blockquote/indent prefix, a
 * bullet (`-`, `*`, `+`, `1.`, `1)`), whitespace, `[ ]`/`[x]`/`[X]` and a
 * following space (marked's `listIsTask` is `/^\[[ xX]\] /`).
 */
const TASK_LINE_RE = /^([ \t>]*(?:[-*+]|\d{1,9}[.)])[ \t]+)\[([ xX])\](?= )/;

const stripPrefix = (line: string) => line.replace(/^[ \t>]*/, '').trimEnd();

/**
 * First source lines (bullet + checkbox + text) of every task item, in
 * document order. Nested items and items inside blockquotes have their
 * indentation / `>` markers stripped from `raw`, which is why callers compare
 * with the prefix removed.
 */
function collectTaskItemFirstLines(markdown: string): string[] {
  const firstLines: string[] = [];

  const visit = (tokens: Token[]) => {
    for (const token of tokens) {
      if (token.type === 'list') {
        for (const item of (token as Tokens.List).items) {
          if (item.task) firstLines.push(item.raw.split('\n')[0]);
          visit(item.tokens ?? []);
        }
        continue;
      }
      const t = token as Tokens.Generic;
      if (Array.isArray(t.tokens)) visit(t.tokens);
    }
  };

  visit(marked.lexer(markdown, { gfm: true, breaks: true }));
  return firstLines;
}

/**
 * Return, for each checkbox the preview renders (document order), the index
 * of its source line. An entry is `-1` when a task item could not be mapped
 * back to a line (never expected, but a click must then do nothing rather than
 * toggle the wrong line).
 */
export function findTaskLineIndices(markdown: string): number[] {
  const lines = markdown.split(/\r?\n/);

  let firstLines: string[];
  try {
    firstLines = collectTaskItemFirstLines(markdown);
  } catch {
    // Lexer failure: fall back to a plain line scan (ignores code fences).
    return lines.reduce<number[]>((acc, line, i) => {
      if (TASK_LINE_RE.test(line)) acc.push(i);
      return acc;
    }, []);
  }

  // Locate each item's first line with a cursor that only moves forward, so
  // identical task lines map to their own occurrence.
  const indices: number[] = [];
  let cursor = 0;
  for (const first of firstLines) {
    const wanted = stripPrefix(first);
    let found = -1;
    for (let i = cursor; i < lines.length; i++) {
      if (stripPrefix(lines[i]) === wanted) {
        found = i;
        break;
      }
    }
    indices.push(found);
    if (found !== -1) cursor = found + 1;
  }
  return indices;
}

/**
 * Rewrite a task line's checkbox state, preserving indentation, blockquote
 * markers, the bullet and the text. Returns null when the line is not a task
 * line.
 */
export function setTaskLineChecked(line: string, checked: boolean): string | null {
  if (!TASK_LINE_RE.test(line)) return null;
  return line.replace(TASK_LINE_RE, (_m, prefix: string) => `${prefix}[${checked ? 'x' : ' '}]`);
}
