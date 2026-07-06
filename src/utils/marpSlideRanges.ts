/**
 * Helpers for mapping editor line positions to Marp slide boundaries.
 * Extracted from MarpPreview to keep the rendering component lean and
 * make the pure computation unit-testable.
 */

export interface SlideLineRange {
  startLine: number;
  endLine: number;
}

export interface SlidePosition {
  slideIndex: number;
  subFraction: number;
}

const FRONTMATTER_DELIMITER = '---';

// CommonMark fenced code blocks: an opening fence is 3+ backticks or tildes
// with up to 3 spaces of indentation (4+ would be an indented code block).
// A backtick fence's info string must not contain a backtick; tilde fences
// allow anything. The trailing `\r?` keeps CRLF sources working (lines are
// split on '\n' only).
const FENCE_OPEN_RE = /^ {0,3}(`{3,}|~{3,})(.*)$/;
const FENCE_CLOSE_RE = /^ {0,3}(`{3,}|~{3,})[ \t]*\r?$/;

interface FenceState {
  marker: '`' | '~';
  length: number;
}

function parseFenceOpen(line: string): FenceState | null {
  const m = FENCE_OPEN_RE.exec(line);
  if (!m) return null;
  const marker = m[1][0] as '`' | '~';
  // Info strings of backtick fences cannot contain backticks (CommonMark) —
  // that would be an inline code span, not a fence.
  if (marker === '`' && m[2].includes('`')) return null;
  return { marker, length: m[1].length };
}

function isFenceClose(line: string, fence: FenceState): boolean {
  const m = FENCE_CLOSE_RE.exec(line);
  return m !== null && m[1][0] === fence.marker && m[1].length >= fence.length;
}

/**
 * Compute the line ranges for each Marp slide from the source content.
 * Returns an array of { startLine, endLine } (0-based, inclusive).
 * The frontmatter block (first --- ... ---) is treated as part of slide 0.
 */
export function computeSlideLineRanges(content: string): SlideLineRange[] {
  const lines = content.split('\n');
  const totalLines = lines.length;

  // Find frontmatter end (second ---)
  let contentStart = 0;
  if (lines[0]?.trim() === FRONTMATTER_DELIMITER) {
    for (let i = 1; i < totalLines; i++) {
      if (lines[i]?.trim() === FRONTMATTER_DELIMITER) {
        contentStart = i + 1;
        break;
      }
    }
  }

  // Find slide break positions (--- on its own line, after frontmatter).
  // `---` inside a fenced code block is literal text, not a ruler — Marp does
  // not split there, so counting it would shift every later slide index and
  // make the editor<->preview scroll sync drift. An unclosed fence runs to the
  // end of the document (CommonMark), suppressing all remaining breaks.
  const slideStarts: number[] = [contentStart];
  let fence: FenceState | null = null;
  for (let i = contentStart; i < totalLines; i++) {
    const line = lines[i] ?? '';
    if (fence) {
      if (isFenceClose(line, fence)) fence = null;
      continue;
    }
    fence = parseFenceOpen(line);
    if (fence) continue;
    if (line.trim() === FRONTMATTER_DELIMITER) {
      slideStarts.push(i + 1);
    }
  }

  const ranges: SlideLineRange[] = [];
  for (let i = 0; i < slideStarts.length; i++) {
    const start = slideStarts[i];
    const end = i + 1 < slideStarts.length ? slideStarts[i + 1] - 2 : totalLines - 1;
    ranges.push({ startLine: start, endLine: Math.max(start, end) });
  }
  return ranges;
}

/**
 * Convert an editor scroll fraction (0..1) into a slide index and a
 * sub-fraction indicating how far through that slide the scroll is.
 * scrollFraction maps linearly to source lines; we find which slide
 * that line falls in and how far through that slide we are.
 */
export function scrollFractionToSlidePosition(
  fraction: number,
  totalLines: number,
  ranges: SlideLineRange[],
): SlidePosition {
  const currentLine = fraction * (totalLines - 1);

  for (let i = ranges.length - 1; i >= 0; i--) {
    if (currentLine >= ranges[i].startLine) {
      const range = ranges[i];
      const rangeSize = range.endLine - range.startLine;
      const sub = rangeSize > 0 ? (currentLine - range.startLine) / rangeSize : 0;
      return { slideIndex: i, subFraction: Math.min(1, Math.max(0, sub)) };
    }
  }
  return { slideIndex: 0, subFraction: 0 };
}

/**
 * Inverse of {@link scrollFractionToSlidePosition}: convert a slide index and a
 * sub-fraction (how far through that slide) back into an editor scroll fraction
 * (0..1) in source-line terms. Used for preview→editor sync in Marp continuous
 * mode, where the user scrolls the slide iframe and we map the visible slide
 * position back onto the source document.
 */
export function slidePositionToScrollFraction(
  slideIndex: number,
  subFraction: number,
  totalLines: number,
  ranges: SlideLineRange[],
): number {
  if (ranges.length === 0 || totalLines <= 1) return 0;
  const idx = Math.min(Math.max(0, slideIndex), ranges.length - 1);
  const range = ranges[idx];
  const rangeSize = range.endLine - range.startLine;
  const sub = Math.min(1, Math.max(0, subFraction));
  const line = range.startLine + sub * rangeSize;
  return Math.min(1, Math.max(0, line / (totalLines - 1)));
}
