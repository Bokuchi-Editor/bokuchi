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

  // Find slide break positions (--- on its own line, after frontmatter)
  const slideStarts: number[] = [contentStart];
  for (let i = contentStart; i < totalLines; i++) {
    if (lines[i]?.trim() === FRONTMATTER_DELIMITER) {
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
