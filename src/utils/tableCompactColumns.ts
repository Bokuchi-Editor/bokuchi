import type { Token, Tokens } from 'marked';

/*
 * Compact table columns (#575).
 *
 * In auto-wrap mode a long-text column drives every other column down toward
 * its minimum width. Short, fixed-length content (`#322`, `P2`, `小`, `Core /
 * Bug`) then wraps at every space, which is unreadable. The table renderer
 * estimates each column's content width from the Markdown tokens and tags the
 * short ones; the auto-wrap CSS pins those to their one-line width. Kept apart
 * from the renderer so the stylesheet builder can share the class name
 * without pulling in highlight.js.
 */

/**
 * Class put on every cell of a "compact" table column (#575). The auto-wrap
 * table CSS turns it into `white-space: nowrap; width: 1%` so short columns
 * (issue numbers, priorities, 2-4 character labels) keep their one-line width
 * instead of being squeezed to one character per line by a long-text column.
 */
export const COMPACT_COLUMN_CLASS = 'table-col-compact';

/**
 * A column whose widest cell is at most this many half-width units is compact.
 * 16 half-width = 8 CJK characters, enough for `Tooling / Build` or `工数目安`.
 */
export const COMPACT_COLUMN_MAX_WIDTH = 16;

/**
 * Upper bound on the summed width of compact columns in one table. Compact
 * cells never wrap, so without a cap a table made of many short columns could
 * be forced wider than the pane in auto-wrap mode.
 */
export const COMPACT_COLUMNS_TOTAL_MAX_WIDTH = 60;

const WIDE_CHAR_RE =
  /[\u1100-\u115F\u2E80-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\uFE30-\uFE4F\uFF00-\uFF60\uFFE0-\uFFE6]/u;

/**
 * Approximate rendered width of `text` in half-width units: East Asian wide /
 * fullwidth characters and astral-plane code points (emoji) count 2, everything
 * else 1. Deliberately coarse — it only has to decide whether a column is
 * "short", not lay it out.
 */
export function displayWidth(text: string): number {
  let width = 0;
  for (const ch of text) {
    width += ch.codePointAt(0)! > 0xffff || WIDE_CHAR_RE.test(ch) ? 2 : 1;
  }
  return width;
}

/**
 * Width of a table cell's content: the widest line, where `<br>` / hard breaks
 * start a new line. Images have no text width we can estimate, so a cell with
 * one is treated as unbounded (its column is never compact).
 */
function cellContentWidth(tokens: Token[]): number {
  let line = 0;
  let widest = 0;
  const walk = (list: Token[]): boolean => {
    for (const tok of list) {
      switch (tok.type) {
        case 'image':
          return false;
        case 'br':
          widest = Math.max(widest, line);
          line = 0;
          break;
        case 'html':
          if (/^<br\s*\/?>$/i.test(tok.raw.trim())) {
            widest = Math.max(widest, line);
            line = 0;
          } else {
            line += displayWidth(tok.raw);
          }
          break;
        default: {
          const children = (tok as { tokens?: Token[] }).tokens;
          if (children && children.length > 0 && tok.type !== 'codespan') {
            if (!walk(children)) return false;
          } else {
            line += displayWidth((tok as { text?: string }).text ?? tok.raw);
          }
        }
      }
    }
    return true;
  };
  if (!walk(tokens)) return Number.POSITIVE_INFINITY;
  return Math.max(widest, line);
}

/**
 * Pick the columns to tag with COMPACT_COLUMN_CLASS. A column is compact when
 * every cell (header included) fits in COMPACT_COLUMN_MAX_WIDTH. Nothing is
 * tagged unless some other column is wider than that: a table made only of
 * short columns already lays out fine, and nowrap would only risk overflow.
 * Narrowest columns win when the total cap is hit.
 */
export function selectCompactColumns(token: Tokens.Table): Set<number> {
  const widths = token.header.map((cell) => cellContentWidth(cell.tokens));
  token.rows.forEach((row) => {
    row.forEach((cell, col) => {
      widths[col] = Math.max(widths[col] ?? 0, cellContentWidth(cell.tokens));
    });
  });

  const compact = new Set<number>();
  if (!widths.some((w) => w > COMPACT_COLUMN_MAX_WIDTH)) return compact;

  const candidates = widths
    .map((width, col) => ({ width, col }))
    .filter(({ width }) => width <= COMPACT_COLUMN_MAX_WIDTH)
    .sort((a, b) => a.width - b.width);
  let total = 0;
  for (const { width, col } of candidates) {
    if (total + width > COMPACT_COLUMNS_TOTAL_MAX_WIDTH) break;
    total += width;
    compact.add(col);
  }
  return compact;
}
