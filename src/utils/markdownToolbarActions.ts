import type { IRange } from 'monaco-editor';

export interface EditOperation {
  range: IRange;
  text: string;
  forceMoveMarkers: boolean;
}

export interface SelectionRange {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
}

/**
 * Build an edit operation that wraps the selected text (or a placeholder) with before/after strings.
 * Returns the edit and an optional selection to highlight the placeholder.
 */
export function buildWrapEdit(
  selection: SelectionRange,
  selectedText: string,
  before: string,
  after: string,
  placeholder: string,
): { edit: EditOperation; newSelection: SelectionRange | null } {
  const text = selectedText || placeholder;
  const newText = `${before}${text}${after}`;

  const edit: EditOperation = {
    range: selection,
    text: newText,
    forceMoveMarkers: true,
  };

  let newSelection: SelectionRange | null = null;
  if (!selectedText && placeholder) {
    const startLine = selection.startLineNumber;
    const startCol = selection.startColumn + before.length;
    const endCol = startCol + placeholder.length;
    newSelection = {
      startLineNumber: startLine,
      startColumn: startCol,
      endLineNumber: startLine,
      endColumn: endCol,
    };
  }

  return { edit, newSelection };
}

/**
 * Build edit operations that prepend a prefix to each line in the selection range.
 */
export function buildLinePrefixEdits(
  startLine: number,
  endLine: number,
  getLineContent: (line: number) => string,
  prefix: string,
): EditOperation[] {
  const edits: EditOperation[] = [];
  for (let line = startLine; line <= endLine; line++) {
    const lineContent = getLineContent(line);
    edits.push({
      range: {
        startLineNumber: line,
        startColumn: 1,
        endLineNumber: line,
        endColumn: lineContent.length + 1,
      },
      text: `${prefix}${lineContent}`,
      forceMoveMarkers: true,
    });
  }
  return edits;
}

/**
 * Build an edit operation that inserts a block of text, ensuring it starts on its own line.
 */
export function buildBlockInsertEdit(
  lineNumber: number,
  currentLineContent: string,
  blockText: string,
): EditOperation {
  const needsNewlineBefore = currentLineContent.trim().length > 0;
  const insertText = `${needsNewlineBefore ? '\n' : ''}${blockText}\n`;

  return {
    range: {
      startLineNumber: lineNumber,
      startColumn: currentLineContent.length + 1,
      endLineNumber: lineNumber,
      endColumn: currentLineContent.length + 1,
    },
    text: insertText,
    forceMoveMarkers: true,
  };
}

/**
 * Build an edit operation for applying a heading level to a line,
 * removing any existing heading prefix first.
 */
export function buildHeadingEdit(
  lineNumber: number,
  lineContent: string,
  level: number,
): EditOperation {
  const prefix = '#'.repeat(level) + ' ';
  const cleaned = lineContent.replace(/^#{1,6}\s*/, '');
  const newContent = `${prefix}${cleaned}`;

  return {
    range: {
      startLineNumber: lineNumber,
      startColumn: 1,
      endLineNumber: lineNumber,
      endColumn: lineContent.length + 1,
    },
    text: newContent,
    forceMoveMarkers: true,
  };
}
