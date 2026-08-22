/**
 * Shared CommonMark fenced-code-block tracking, used by every line-scanning
 * feature that must ignore code-block content (outline heading extraction,
 * Marp slide-range computation). Keeping one implementation stops the fence
 * semantics from drifting between features — a naive "toggle on ```" scanner
 * let `~~~` close a backtick fence, which put fake headings in the outline.
 *
 * An opening fence is 3+ backticks or tildes with up to 3 spaces of
 * indentation (4+ would be an indented code block). A backtick fence's info
 * string must not contain a backtick (that would be an inline code span);
 * tilde fences allow anything. A closing fence must use the same marker and
 * be at least as long as the opener. The trailing `\r?` keeps CRLF sources
 * working when lines are split on '\n' only.
 */

export interface FenceState {
  marker: '`' | '~';
  length: number;
}

const FENCE_OPEN_RE = /^ {0,3}(`{3,}|~{3,})(.*)$/;
const FENCE_CLOSE_RE = /^ {0,3}(`{3,}|~{3,})[ \t]*\r?$/;

export function parseFenceOpen(line: string): FenceState | null {
  const m = FENCE_OPEN_RE.exec(line);
  if (!m) return null;
  const marker = m[1][0] as '`' | '~';
  // Info strings of backtick fences cannot contain backticks (CommonMark) —
  // that would be an inline code span, not a fence.
  if (marker === '`' && m[2].includes('`')) return null;
  return { marker, length: m[1].length };
}

export function isFenceClose(line: string, fence: FenceState): boolean {
  const m = FENCE_CLOSE_RE.exec(line);
  return m !== null && m[1][0] === fence.marker && m[1].length >= fence.length;
}
