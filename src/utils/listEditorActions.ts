/**
 * Monaco-bound smart-list editing actions (Enter continuation / Tab indent).
 *
 * The pure decision logic lives in `listFormatter.ts`; this layer only adapts
 * it to a live editor instance (reading the current line, applying
 * `executeEdits`, moving the cursor). Each handler returns `true` when it
 * handled the key so the caller knows the default behavior was replaced,
 * mirroring `tableEditorActions.ts`.
 */
import type { editor } from 'monaco-editor';
import {
  parseListItem,
  isListItemEmpty,
  buildContinuationPrefix,
} from './listFormatter';

type IEditor = editor.IStandaloneCodeEditor;

/** Whether the cursor sits on a Markdown list item line. */
export function isCursorInListItem(ed: IEditor): boolean {
  const model = ed.getModel();
  const pos = ed.getPosition();
  if (!model || !pos) return false;
  return parseListItem(model.getLineContent(pos.lineNumber)) !== null;
}

/**
 * Enter on a list item. On a non-empty item, start a new item below with the
 * continued marker (ordered numbers increment; task items get a fresh `[ ]`).
 * On an already-empty item, remove the marker so the list ends. Returns false
 * to defer to the default newline (active selection, or not a list item).
 */
export function handleListEnter(ed: IEditor): boolean {
  const model = ed.getModel();
  const pos = ed.getPosition();
  if (!model || !pos) return false;

  const selection = ed.getSelection();
  if (selection && !selection.isEmpty()) return false; // let default handle a selection

  const line = model.getLineContent(pos.lineNumber);
  const info = parseListItem(line);
  if (!info) return false;

  if (isListItemEmpty(info)) {
    // End the list: clear the bare marker to a blank line.
    ed.executeEdits('list-enter-exit', [
      {
        range: {
          startLineNumber: pos.lineNumber,
          startColumn: 1,
          endLineNumber: pos.lineNumber,
          endColumn: model.getLineMaxColumn(pos.lineNumber),
        },
        text: '',
        forceMoveMarkers: true,
      },
    ]);
    ed.setPosition({ lineNumber: pos.lineNumber, column: 1 });
    return true;
  }

  // Defer when the caret sits left of the item's content (inside the
  // indentation, the marker or the checkbox). Splitting there would prepend a
  // second marker to the pushed-down text (e.g. "- abc" -> "- - abc"); Monaco's
  // default plain newline is the right behavior instead.
  const contentStartColumn = line.length - info.content.length + 1;
  if (pos.column < contentStartColumn) return false;

  // Continue the list: split at the cursor and prefix the new line with the
  // continued marker. Text after the cursor moves down after the prefix.
  const prefix = buildContinuationPrefix(info);
  ed.executeEdits('list-enter-continue', [
    {
      range: {
        startLineNumber: pos.lineNumber,
        startColumn: pos.column,
        endLineNumber: pos.lineNumber,
        endColumn: pos.column,
      },
      text: '\n' + prefix,
      forceMoveMarkers: true,
    },
  ]);
  ed.setPosition({ lineNumber: pos.lineNumber + 1, column: prefix.length + 1 });
  ed.revealPositionInCenterIfOutsideViewport({ lineNumber: pos.lineNumber + 1, column: prefix.length + 1 });
  return true;
}

/**
 * Tab / Shift+Tab on a list item indents or outdents the whole line by one tab
 * stop. Ordered-list numbers are left as-is (cross-line renumbering is out of
 * scope). Returns false to defer to the default indent behavior when the cursor
 * is not on a list item or there is a multi-line selection.
 */
export function handleListIndent(ed: IEditor, outdent: boolean): boolean {
  const model = ed.getModel();
  const pos = ed.getPosition();
  if (!model || !pos) return false;

  const selection = ed.getSelection();
  // Defer multi-line selections to Monaco's block indent.
  if (selection && !selection.isEmpty() && selection.startLineNumber !== selection.endLineNumber) {
    return false;
  }

  const line = model.getLineContent(pos.lineNumber);
  const info = parseListItem(line);
  if (!info) return false;

  const tabSize = model.getOptions().tabSize || 2;
  const unit = ' '.repeat(tabSize);

  if (outdent) {
    // Remove up to one tab stop of leading whitespace.
    const leading = line.match(/^[ \t]*/)?.[0] ?? '';
    if (leading.length === 0) return true; // already at column 0, consume the key
    const expanded = leading.replace(/\t/g, unit);
    const trimmed = expanded.slice(Math.min(tabSize, expanded.length));
    const removed = leading.length - trimmed.length;
    ed.executeEdits('list-outdent', [
      {
        range: {
          startLineNumber: pos.lineNumber,
          startColumn: 1,
          endLineNumber: pos.lineNumber,
          endColumn: leading.length + 1,
        },
        text: trimmed,
        forceMoveMarkers: true,
      },
    ]);
    ed.setPosition({ lineNumber: pos.lineNumber, column: Math.max(1, pos.column - removed) });
    return true;
  }

  // Indent: add one tab stop of spaces at the start of the line.
  ed.executeEdits('list-indent', [
    {
      range: {
        startLineNumber: pos.lineNumber,
        startColumn: 1,
        endLineNumber: pos.lineNumber,
        endColumn: 1,
      },
      text: unit,
      forceMoveMarkers: true,
    },
  ]);
  ed.setPosition({ lineNumber: pos.lineNumber, column: pos.column + unit.length });
  return true;
}
