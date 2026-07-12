import { countWords } from './wordCount';

/** Cursor and word/character counts shown in the status bar. */
export interface EditorStatus {
  line: number;
  column: number;
  totalCharacters: number;
  selectedCharacters: number;
  totalWords: number;
  selectedWords: number;
}

/**
 * Compute the status-bar figures from the full document text, the selected text
 * (empty string when nothing is selected), and the 1-based cursor position.
 */
export function computeEditorStatus(
  fullText: string,
  selectedText: string,
  position: { lineNumber: number; column: number },
): EditorStatus {
  return {
    line: position.lineNumber,
    column: position.column,
    totalCharacters: fullText.length,
    selectedCharacters: selectedText.length,
    totalWords: countWords(fullText),
    selectedWords: countWords(selectedText),
  };
}
