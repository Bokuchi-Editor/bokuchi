import { HeadingItem } from '../types/outline';
import { FenceState, parseFenceOpen, isFenceClose } from './markdownFences';

/**
 * Extract ATX headings from Markdown content, ignoring code blocks.
 * Fence tracking follows CommonMark via the shared markdownFences helpers:
 * a closing fence must match the opener's marker character and length, so a
 * `~~~` line inside a backtick block stays literal text instead of ending the
 * block (the previous single-toggle scanner got this wrong and leaked code
 * lines into the outline).
 */
export function extractHeadings(content: string): HeadingItem[] {
  const lines = content.split(/\r?\n/);
  const headings: HeadingItem[] = [];
  let fence: FenceState | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (fence) {
      if (isFenceClose(line, fence)) fence = null;
      continue;
    }
    const opened = parseFenceOpen(line);
    if (opened) {
      fence = opened;
      continue;
    }

    // Match ATX headings: # to ######
    const match = line.trimStart().match(/^(#{1,6})\s+(.+?)(?:\s+#+\s*)?$/);
    if (match) {
      headings.push({
        level: match[1].length,
        text: match[2].trim(),
        lineNumber: i + 1, // 1-based
      });
    }
  }

  return headings;
}
