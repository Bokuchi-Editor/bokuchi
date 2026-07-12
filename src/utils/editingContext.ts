import { findTableBlock, isTableSeparatorLine } from './tableFormatter';
import { parseListItem } from './listFormatter';

/**
 * Whether the cursor line should activate table-row or list-item smart editing.
 * The two are mutually exclusive so Enter/Tab dispatch to a single handler.
 */
export interface EditingContext {
  inTableRow: boolean;
  inListItem: boolean;
}

/**
 * Decide the smart-editing context for a cursor line, given the full document
 * lines and the 1-based cursor line number. A separator line inside a table is
 * not treated as an editable row, and a table row is never a list item.
 */
export function computeEditingContext(lines: string[], lineNumber: number): EditingContext {
  const lineContent = lines[lineNumber - 1] ?? '';
  const block = findTableBlock(lines, lineNumber);
  const inTableRow = !!block && !isTableSeparatorLine(lineContent);
  const inListItem = !inTableRow && parseListItem(lineContent) !== null;
  return { inTableRow, inListItem };
}
