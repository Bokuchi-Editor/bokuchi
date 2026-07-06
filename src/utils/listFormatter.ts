/**
 * Pure, Monaco-free helpers for parsing and continuing Markdown list items
 * (bullet lists, ordered lists and GitHub-style task lists).
 *
 * The Markdown source text is always the single source of truth; these helpers
 * only inspect a single line and describe what an Enter / Tab key press should
 * produce. The editor layer (`listEditorActions.ts`) applies the result via
 * `executeEdits`. Kept side-effect free so it can be unit-tested in isolation,
 * mirroring `tableFormatter.ts`.
 */

export interface ListItemInfo {
  /** Leading whitespace of the line (indentation). */
  indent: string;
  /** True for `1.` / `1)` style ordered items, false for `-` / `*` / `+`. */
  ordered: boolean;
  /** Bullet character for unordered items (`-`, `*` or `+`). */
  bullet?: string;
  /** Parsed number for ordered items. */
  orderedNumber?: number;
  /** Delimiter following the number for ordered items (`.` or `)`). */
  orderedDelim?: '.' | ')';
  /** Whitespace between the marker and the content (or checkbox). */
  spacing: string;
  /** True when the item carries a `[ ]` / `[x]` task-list checkbox. */
  checkbox: boolean;
  /** True when the checkbox is checked (`[x]` / `[X]`). */
  checkboxChecked: boolean;
  /** The item text after the marker (and checkbox, if any). */
  content: string;
}

// A single space is used when reconstructing the gap between marker and content
// so continuation lines stay tidy regardless of the original spacing.
const CONTINUATION_SPACING = ' ';

const UNORDERED_RE = /^(\s*)([-*+])(\s+)(\[([ xX])\]\s+)?(.*)$/;
const ORDERED_RE = /^(\s*)(\d{1,9})([.)])(\s+)(\[([ xX])\]\s+)?(.*)$/;

/**
 * Parse a single source line into a {@link ListItemInfo}, or return null when
 * the line is not a list item. A bare marker with no trailing content (e.g.
 * `- ` or `1. `) still parses — it is reported as an empty item.
 */
export function parseListItem(line: string): ListItemInfo | null {
  const ordered = ORDERED_RE.exec(line);
  if (ordered) {
    const [, indent, num, delim, spacing, checkboxRaw, checkboxState, content] = ordered;
    return {
      indent,
      ordered: true,
      orderedNumber: parseInt(num, 10),
      orderedDelim: delim as '.' | ')',
      spacing,
      checkbox: !!checkboxRaw,
      checkboxChecked: checkboxState === 'x' || checkboxState === 'X',
      content,
    };
  }

  const unordered = UNORDERED_RE.exec(line);
  if (unordered) {
    const [, indent, bullet, spacing, checkboxRaw, checkboxState, content] = unordered;
    return {
      indent,
      ordered: false,
      bullet,
      spacing,
      checkbox: !!checkboxRaw,
      checkboxChecked: checkboxState === 'x' || checkboxState === 'X',
      content,
    };
  }

  return null;
}

/** Whether the line is a Markdown list item. */
export function isListItem(line: string): boolean {
  return parseListItem(line) !== null;
}

/**
 * Whether the item has no content after its marker (e.g. `- `, `1.`,
 * `- [ ] `). Pressing Enter on such an item should end the list rather than
 * insert another empty bullet.
 */
export function isListItemEmpty(info: ListItemInfo): boolean {
  return info.content.trim() === '';
}

/**
 * Build the marker prefix (indent + marker + spacing + optional empty checkbox)
 * for the line that follows `info` when Enter continues the list. Ordered items
 * increment their number; task-list items start a fresh unchecked checkbox.
 */
export function buildContinuationPrefix(info: ListItemInfo): string {
  const marker = info.ordered
    ? `${(info.orderedNumber ?? 0) + 1}${info.orderedDelim ?? '.'}`
    : (info.bullet ?? '-');
  const checkbox = info.checkbox ? `[ ]${CONTINUATION_SPACING}` : '';
  return `${info.indent}${marker}${CONTINUATION_SPACING}${checkbox}`;
}
