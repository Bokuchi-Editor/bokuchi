import type { editor, IDisposable } from 'monaco-editor';
import type * as MonacoNs from 'monaco-editor';
import { formatTableInEditor, handleTableEnter, handleTableTab } from './tableEditorActions';
import { handleListEnter, handleListIndent } from './listEditorActions';
import { computeEditingContext } from './editingContext';

/** Callbacks the editor invokes to open the search/replace panel. */
export interface SearchShortcutHandlers {
  /** Ctrl/Cmd+F — open search in the current tab. */
  openSearch: () => void;
  /** Ctrl/Cmd+H — open search with the replace row expanded. */
  openReplace: () => void;
  /** Ctrl/Cmd+Shift+F — open search across all tabs. */
  openSearchAllTabs: () => void;
}

/**
 * Register search shortcuts, the Shift+Cmd/Ctrl+V no-op, and the smart
 * table/list editing actions on a freshly mounted editor.
 *
 * The context keys `bokuchiInTableRow` / `bokuchiInListItem` gate the Enter/Tab
 * overrides and are cleared during IME composition so Japanese conversion is
 * never hijacked. Returns the disposables the caller must track so the listeners
 * are torn down on the next mount/unmount.
 */
export function registerEditorActions(
  ed: editor.IStandaloneCodeEditor,
  monaco: typeof MonacoNs,
  handlers: SearchShortcutHandlers,
): IDisposable[] {
  const disposables: IDisposable[] = [];

  // --- Search / replace shortcuts ---
  ed.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF, handlers.openSearch);
  ed.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyH, handlers.openReplace);
  ed.addCommand(
    monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF,
    handlers.openSearchAllTabs,
  );

  // Completely disable the default behavior of Shift + Cmd/Ctrl + V.
  ed.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyV, () => {
    // Do nothing (completely disable default "Paste as Plain Text")
  });
  // Disable with a more powerful method.
  ed.addAction({
    id: 'disable-shift-v',
    label: 'Disable Shift+V',
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyV],
    run: () => {
      // Do nothing
    },
  });

  // --- Markdown table editing (format, Enter, Tab) ---

  // Format the table block at the cursor.
  ed.addAction({
    id: 'format-markdown-table',
    label: 'Format Markdown Table',
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyL],
    run: (editorInstance) => {
      formatTableInEditor(editorInstance as editor.IStandaloneCodeEditor);
    },
  });

  // Context keys gating Enter/Tab overrides. Cleared while an IME composition is
  // active so Japanese conversion (Enter to confirm) and default Tab are never
  // hijacked.
  const inTableRowKey = ed.createContextKey<boolean>('bokuchiInTableRow', false);
  const inListItemKey = ed.createContextKey<boolean>('bokuchiInListItem', false);
  let isComposing = false;

  const clearEditingContext = () => {
    inTableRowKey.set(false);
    inListItemKey.set(false);
  };

  const updateEditingContext = () => {
    if (isComposing) {
      clearEditingContext();
      return;
    }
    const model = ed.getModel();
    const pos = ed.getPosition();
    if (!model || !pos) {
      clearEditingContext();
      return;
    }
    const { inTableRow, inListItem } = computeEditingContext(model.getLinesContent(), pos.lineNumber);
    inTableRowKey.set(inTableRow);
    inListItemKey.set(inListItem);
  };

  disposables.push(
    ed.onDidCompositionStart(() => {
      isComposing = true;
      clearEditingContext();
    }),
  );
  disposables.push(
    ed.onDidCompositionEnd(() => {
      isComposing = false;
      updateEditingContext();
    }),
  );
  disposables.push(ed.onDidChangeCursorPosition(updateEditingContext));
  disposables.push(ed.onDidChangeModelContent(updateEditingContext));
  updateEditingContext();

  // Enter adds a new row / exits the table when on an empty row. If the handler
  // declines (e.g. an active selection), fall back to a normal newline so the
  // key is never swallowed.
  ed.addAction({
    id: 'table-enter-new-row',
    label: 'Table: New Row',
    keybindings: [monaco.KeyCode.Enter],
    precondition: 'bokuchiInTableRow',
    run: (editorInstance) => {
      const e = editorInstance as editor.IStandaloneCodeEditor;
      if (!handleTableEnter(e)) {
        e.trigger('keyboard', 'type', { text: '\n' });
      }
    },
  });

  // Tab / Shift+Tab move between cells; fall back to default indent/outdent when
  // the handler declines.
  ed.addAction({
    id: 'table-next-cell',
    label: 'Table: Next Cell',
    keybindings: [monaco.KeyCode.Tab],
    precondition: 'bokuchiInTableRow',
    run: (editorInstance) => {
      const e = editorInstance as editor.IStandaloneCodeEditor;
      if (!handleTableTab(e, false)) {
        e.trigger('keyboard', 'tab', null);
      }
    },
  });
  ed.addAction({
    id: 'table-prev-cell',
    label: 'Table: Previous Cell',
    keybindings: [monaco.KeyMod.Shift | monaco.KeyCode.Tab],
    precondition: 'bokuchiInTableRow',
    run: (editorInstance) => {
      const e = editorInstance as editor.IStandaloneCodeEditor;
      if (!handleTableTab(e, true)) {
        e.trigger('keyboard', 'outdent', null);
      }
    },
  });

  // --- Smart Markdown list editing (Enter continuation, Tab indent) ---

  // Enter continues the list (or ends it on an empty item). Fall back to a
  // normal newline when the handler declines (e.g. active selection).
  ed.addAction({
    id: 'list-enter-continue',
    label: 'List: Continue Item',
    keybindings: [monaco.KeyCode.Enter],
    precondition: 'bokuchiInListItem',
    run: (editorInstance) => {
      const e = editorInstance as editor.IStandaloneCodeEditor;
      if (!handleListEnter(e)) {
        e.trigger('keyboard', 'type', { text: '\n' });
      }
    },
  });

  // Tab / Shift+Tab indent or outdent the list item; fall back to the default
  // indent/outdent when the handler declines.
  ed.addAction({
    id: 'list-indent',
    label: 'List: Indent Item',
    keybindings: [monaco.KeyCode.Tab],
    precondition: 'bokuchiInListItem',
    run: (editorInstance) => {
      const e = editorInstance as editor.IStandaloneCodeEditor;
      if (!handleListIndent(e, false)) {
        e.trigger('keyboard', 'tab', null);
      }
    },
  });
  ed.addAction({
    id: 'list-outdent',
    label: 'List: Outdent Item',
    keybindings: [monaco.KeyMod.Shift | monaco.KeyCode.Tab],
    precondition: 'bokuchiInListItem',
    run: (editorInstance) => {
      const e = editorInstance as editor.IStandaloneCodeEditor;
      if (!handleListIndent(e, true)) {
        e.trigger('keyboard', 'outdent', null);
      }
    },
  });

  return disposables;
}
