/**
 * Pure, Monaco-free helpers for parsing, formatting and editing GFM Markdown
 * tables. The Markdown source text is always the single source of truth; these
 * helpers read a table block out of the source and produce new text / cursor
 * targets that the editor layer applies via `executeEdits`.
 *
 * Kept side-effect free (no Monaco imports) so it can be unit-tested in
 * isolation, mirroring `markdownToolbarActions.ts`.
 */

export type Align = 'none' | 'left' | 'center' | 'right';

export interface ParsedTable {
  /** Header cell texts (source form: pipes kept escaped as `\|`). */
  header: string[];
  /** Per-column alignment, normalized to the header column count. */
  alignments: Align[];
  /** Body rows, each normalized to the header column count. */
  rows: string[][];
}

// ---------------------------------------------------------------------------
// Display width (CJK aware)
// ---------------------------------------------------------------------------

/**
 * Whether a code point is rendered as a full / wide glyph in a monospace font.
 * Used so that Japanese (and other CJK) tables align visually, since wide
 * characters occupy two columns. Alignment is only exact in monospace fonts.
 */
function isWideChar(cp: number): boolean {
  return (
    (cp >= 0x1100 && cp <= 0x115f) || // Hangul Jamo
    cp === 0x2329 ||
    cp === 0x232a ||
    (cp >= 0x2e80 && cp <= 0x303e) || // CJK radicals .. Kangxi
    (cp >= 0x3041 && cp <= 0x33ff) || // Hiragana, Katakana, CJK symbols & punct
    (cp >= 0x3400 && cp <= 0x4dbf) || // CJK Ext A
    (cp >= 0x4e00 && cp <= 0x9fff) || // CJK Unified Ideographs
    (cp >= 0xa000 && cp <= 0xa4cf) || // Yi
    (cp >= 0xac00 && cp <= 0xd7a3) || // Hangul Syllables
    (cp >= 0xf900 && cp <= 0xfaff) || // CJK Compatibility Ideographs
    (cp >= 0xfe30 && cp <= 0xfe4f) || // CJK Compatibility Forms
    (cp >= 0xff00 && cp <= 0xff60) || // Fullwidth Forms
    (cp >= 0xffe0 && cp <= 0xffe6) ||
    (cp >= 0x1f300 && cp <= 0x1faff) || // Emoji (treated as wide)
    (cp >= 0x20000 && cp <= 0x3fffd) // CJK Ext B+
  );
}

/** Visual width of a string in monospace columns (wide chars count as 2). */
export function displayWidth(s: string): number {
  let w = 0;
  for (const ch of s) {
    w += isWideChar(ch.codePointAt(0)!) ? 2 : 1;
  }
  return w;
}

// ---------------------------------------------------------------------------
// Row / cell tokenizing
// ---------------------------------------------------------------------------

/**
 * Split a table row into trimmed cell texts. Escaped pipes (`\|`) stay inside
 * the cell; a single leading and trailing pipe are stripped.
 */
export function splitCells(line: string): string[] {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|') && !s.endsWith('\\|')) s = s.slice(0, -1);

  const cells: string[] = [];
  let cur = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '\\' && i + 1 < s.length) {
      cur += ch + s[i + 1];
      i++;
      continue;
    }
    if (ch === '|') {
      cells.push(cur.trim());
      cur = '';
      continue;
    }
    cur += ch;
  }
  cells.push(cur.trim());
  return cells;
}

/** Escape raw pipes for safe insertion into a single table cell. */
export function escapeCell(text: string): string {
  return text.replace(/\r?\n/g, ' ').replace(/\|/g, '\\|');
}

function parseAlign(cell: string): Align {
  const c = cell.trim();
  const left = c.startsWith(':');
  const right = c.endsWith(':');
  if (left && right) return 'center';
  if (right) return 'right';
  if (left) return 'left';
  return 'none';
}

/** A line whose cells are all `:?-+:?` (the header/body delimiter row). */
export function isTableSeparatorLine(line: string): boolean {
  if (!line.includes('-')) return false;
  const cells = splitCells(line);
  if (cells.length === 0) return false;
  return cells.every((c) => /^:?-+:?$/.test(c.trim()));
}

/** A non-empty line that contains at least one pipe (candidate table line). */
export function isPipeRow(line: string): boolean {
  const t = line.trim();
  return t.length > 0 && t.includes('|');
}

// ---------------------------------------------------------------------------
// Block detection & parsing
// ---------------------------------------------------------------------------

/**
 * Given a 1-based cursor line, expand over contiguous pipe rows to find the
 * enclosing table block. Returns 1-based inclusive `{ start, end }` line
 * numbers, or null if the cursor is not inside a valid table (must have a
 * separator on its second line).
 */
export function findTableBlock(
  lines: string[],
  cursorLine: number,
): { start: number; end: number } | null {
  const idx = cursorLine - 1;
  if (idx < 0 || idx >= lines.length) return null;
  if (!isPipeRow(lines[idx])) return null;

  let start = idx;
  while (start - 1 >= 0 && isPipeRow(lines[start - 1])) start--;
  let end = idx;
  while (end + 1 < lines.length && isPipeRow(lines[end + 1])) end++;

  if (end - start < 1) return null; // need header + separator
  if (!isTableSeparatorLine(lines[start + 1])) return null;

  return { start: start + 1, end: end + 1 };
}

function padRowArray(arr: string[], n: number): string[] {
  const out = arr.slice(0, n);
  while (out.length < n) out.push('');
  return out;
}

function padAlign(arr: Align[], n: number): Align[] {
  const out = arr.slice(0, n);
  while (out.length < n) out.push('none');
  return out;
}

function columnCount(t: { header: string[]; alignments: Align[]; rows: string[][] }): number {
  return Math.max(
    t.header.length,
    t.alignments.length,
    ...t.rows.map((r) => r.length),
    1,
  );
}

/** Parse the lines of a table block (header, separator, body...) into a model. */
export function parseTableBlock(blockLines: string[]): ParsedTable {
  const header = splitCells(blockLines[0] ?? '');
  const alignments = splitCells(blockLines[1] ?? '').map(parseAlign);
  const rows = blockLines.slice(2).map(splitCells);
  const n = columnCount({ header, alignments, rows });
  return {
    header: padRowArray(header, n),
    alignments: padAlign(alignments, n),
    rows: rows.map((r) => padRowArray(r, n)),
  };
}

// ---------------------------------------------------------------------------
// Serialization (pretty-printing)
// ---------------------------------------------------------------------------

function padCell(cell: string, width: number, align: Align): string {
  const pad = width - displayWidth(cell);
  if (pad <= 0) return cell;
  if (align === 'right') return ' '.repeat(pad) + cell;
  if (align === 'center') {
    const left = Math.floor(pad / 2);
    return ' '.repeat(left) + cell + ' '.repeat(pad - left);
  }
  return cell + ' '.repeat(pad);
}

function separatorCell(width: number, align: Align): string {
  switch (align) {
    case 'left':
      return ':' + '-'.repeat(width - 1);
    case 'right':
      return '-'.repeat(width - 1) + ':';
    case 'center':
      return ':' + '-'.repeat(width - 2) + ':';
    default:
      return '-'.repeat(width);
  }
}

/**
 * Render a parsed table back to Markdown, padding every column to its widest
 * cell (min 3 for the delimiter) and encoding alignment in the separator row.
 * Idempotent: serialize(parse(serialize(x))) === serialize(x).
 */
export function serializeTable(table: ParsedTable): string {
  const n = columnCount(table);
  const header = padRowArray(table.header, n);
  const alignments = padAlign(table.alignments, n);
  const rows = table.rows.map((r) => padRowArray(r, n));

  const widths: number[] = [];
  for (let c = 0; c < n; c++) {
    let w = displayWidth(header[c]);
    for (const r of rows) w = Math.max(w, displayWidth(r[c]));
    widths.push(Math.max(w, 3));
  }

  const renderRow = (cells: string[]) =>
    '| ' + cells.map((c, i) => padCell(c, widths[i], alignments[i])).join(' | ') + ' |';

  const lines: string[] = [];
  lines.push(renderRow(header));
  lines.push('| ' + widths.map((w, i) => separatorCell(w, alignments[i])).join(' | ') + ' |');
  for (const r of rows) lines.push(renderRow(r));
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Cursor / cell geometry (1-based Monaco columns)
// ---------------------------------------------------------------------------

/** Character indices (0-based) of unescaped pipes in a line. */
function pipeIndices(line: string): number[] {
  const idx: number[] = [];
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '\\') {
      i++;
      continue;
    }
    if (line[i] === '|') idx.push(i);
  }
  return idx;
}

/** Number of cells between the outer pipes of a row (0 if not a pipe row). */
export function getCellCount(line: string): number {
  const pipes = pipeIndices(line);
  return pipes.length >= 2 ? pipes.length - 1 : 0;
}

/**
 * Which cell (0-based) a 1-based Monaco column falls in, clamped to the row's
 * cell range. Returns -1 if the line has no cells.
 */
export function getCellIndexAtColumn(line: string, column: number): number {
  const pipes = pipeIndices(line);
  const cellCount = pipes.length >= 2 ? pipes.length - 1 : 0;
  if (cellCount === 0) return -1;
  const offset = column - 1;
  let before = 0;
  for (const p of pipes) {
    if (p < offset) before++;
    else break;
  }
  const index = before - 1;
  if (index < 0) return 0;
  if (index >= cellCount) return cellCount - 1;
  return index;
}

/**
 * The selectable content span (1-based start/end columns) of a cell. For an
 * empty cell, start === end (a caret position just inside the cell).
 */
export function getCellContentRange(
  line: string,
  cellIndex: number,
): { startColumn: number; endColumn: number } | null {
  const pipes = pipeIndices(line);
  const cellCount = pipes.length >= 2 ? pipes.length - 1 : 0;
  if (cellIndex < 0 || cellIndex >= cellCount) return null;

  const segStart = pipes[cellIndex] + 1;
  const segEnd = pipes[cellIndex + 1]; // exclusive (the next pipe)

  let s = segStart;
  while (s < segEnd && line[s] === ' ') s++;
  let e = segEnd;
  while (e > s && line[e - 1] === ' ') e--;

  if (s >= e) {
    // Empty cell: caret right after the leading pad space.
    const caret = Math.min(segStart + 1, segEnd);
    return { startColumn: caret + 1, endColumn: caret + 1 };
  }
  return { startColumn: s + 1, endColumn: e + 1 };
}

// ---------------------------------------------------------------------------
// Row helpers (for Enter / Tab editing)
// ---------------------------------------------------------------------------

/** True if every cell in the row is blank. */
export function isRowEmpty(line: string): boolean {
  return splitCells(line).every((c) => c.trim() === '');
}

/** A blank table row with `colCount` single-space cells, e.g. `| | | |`. */
export function makeEmptyRow(colCount: number): string {
  const n = Math.max(colCount, 1);
  return '|' + ' |'.repeat(n);
}

/** Column count of a table block from its raw lines (uses header + separator). */
export function getColumnCount(blockLines: string[]): number {
  const header = splitCells(blockLines[0] ?? '');
  const sep = blockLines[1] ? splitCells(blockLines[1]) : [];
  return Math.max(header.length, sep.length, 1);
}

// ---------------------------------------------------------------------------
// Structural operations (used by row/column ops and the spreadsheet editor)
// ---------------------------------------------------------------------------

function clone(table: ParsedTable): ParsedTable {
  return {
    header: [...table.header],
    alignments: [...table.alignments],
    rows: table.rows.map((r) => [...r]),
  };
}

/** Insert a blank body row at `index` (clamped). */
export function insertRow(table: ParsedTable, index: number): ParsedTable {
  const t = clone(table);
  const n = columnCount(t);
  const at = Math.max(0, Math.min(index, t.rows.length));
  t.rows.splice(at, 0, new Array(n).fill(''));
  return t;
}

/** Delete the body row at `index` (no-op if out of range). */
export function deleteRow(table: ParsedTable, index: number): ParsedTable {
  const t = clone(table);
  if (index >= 0 && index < t.rows.length) t.rows.splice(index, 1);
  return t;
}

/** Move the body row at `from` to `to` (both clamped). */
export function moveRow(table: ParsedTable, from: number, to: number): ParsedTable {
  const t = clone(table);
  if (from < 0 || from >= t.rows.length) return t;
  const clampedTo = Math.max(0, Math.min(to, t.rows.length - 1));
  const [row] = t.rows.splice(from, 1);
  t.rows.splice(clampedTo, 0, row);
  return t;
}

/** Insert a blank column at `index` (clamped) across header, separator, rows. */
export function insertColumn(table: ParsedTable, index: number): ParsedTable {
  const t = clone(table);
  const n = columnCount(t);
  const at = Math.max(0, Math.min(index, n));
  t.header.splice(at, 0, '');
  t.alignments.splice(at, 0, 'none');
  t.rows.forEach((r) => r.splice(at, 0, ''));
  return t;
}

/** Delete the column at `index` (no-op if it would leave zero columns). */
export function deleteColumn(table: ParsedTable, index: number): ParsedTable {
  const t = clone(table);
  const n = columnCount(t);
  if (index < 0 || index >= n || n <= 1) return t;
  t.header.splice(index, 1);
  t.alignments.splice(index, 1);
  t.rows.forEach((r) => r.splice(index, 1));
  return t;
}

/** Move the column at `from` to `to` (both clamped). */
export function moveColumn(table: ParsedTable, from: number, to: number): ParsedTable {
  const t = clone(table);
  const n = columnCount(t);
  if (from < 0 || from >= n) return t;
  const clampedTo = Math.max(0, Math.min(to, n - 1));
  const move = <T>(arr: T[]) => {
    const [v] = arr.splice(from, 1);
    arr.splice(clampedTo, 0, v);
  };
  move(t.header);
  move(t.alignments);
  t.rows.forEach((r) => move(r));
  return t;
}

/**
 * Format the table block containing the given 1-based cursor line.
 * Returns the 1-based block range and the formatted Markdown text, or null if
 * the cursor is not inside a table.
 */
export function formatTableAtLine(
  lines: string[],
  cursorLine: number,
): { start: number; end: number; text: string } | null {
  const block = findTableBlock(lines, cursorLine);
  if (!block) return null;
  const blockLines = lines.slice(block.start - 1, block.end);
  const text = serializeTable(parseTableBlock(blockLines));
  return { start: block.start, end: block.end, text };
}
