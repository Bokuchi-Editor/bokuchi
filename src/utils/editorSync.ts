import type { editor } from 'monaco-editor';

// Symbol-keyed flag attached transiently to a Monaco model while
// setModelContentSilently runs. Symbol (not a string) so it cannot collide
// with anything Monaco may add in the future.
const SILENT_EDIT_FLAG = Symbol.for('bokuchi.silentEdit');

type ModelWithFlag = editor.ITextModel & { [SILENT_EDIT_FLAG]?: boolean };

/**
 * Replace a Monaco model's content from outside the editor without letting
 * the editor's onChange callback push the new value back into React state.
 *
 * The Editor component is uncontrolled (no `value` prop), so the model is the
 * source of truth for content. Reload paths still need to push fresh content
 * INTO the model — this helper does that, while flagging the change so the
 * editor's onChange handler can recognize it as programmatic and bail out
 * (otherwise the handler would re-dispatch UPDATE_TAB_CONTENT and clobber
 * the isModified=false that RELOAD_TAB_CONTENT just set).
 */
export const setModelContentSilently = (model: editor.ITextModel, content: string): void => {
  if (model.getValue() === content) return;
  const tagged = model as ModelWithFlag;
  tagged[SILENT_EDIT_FLAG] = true;
  try {
    model.setValue(content);
  } finally {
    tagged[SILENT_EDIT_FLAG] = false;
  }
};

/** True while a model is mid-`setModelContentSilently` call. */
export const isModelSilentlyEditing = (model: editor.ITextModel | null | undefined): boolean => {
  if (!model) return false;
  return Boolean((model as ModelWithFlag)[SILENT_EDIT_FLAG]);
};

/**
 * Find the live Monaco model corresponding to a tab id, or null if no such
 * model is currently loaded (e.g. the tab has never been opened in this
 * session, or its model was disposed, or Monaco hasn't initialized yet).
 *
 * Tab ids may appear in the model's URI either as the entire URI string or
 * as the trailing path segment (Monaco normalizes raw ids to `file:///<id>`).
 */
export const findModelForTab = (tabId: string): editor.ITextModel | null => {
  const monaco = (window as { monaco?: typeof import('monaco-editor') }).monaco;
  if (!monaco?.editor?.getModels) return null;
  for (const model of monaco.editor.getModels()) {
    const uriStr = model.uri.toString();
    if (uriStr === tabId || uriStr.endsWith('/' + tabId)) return model;
  }
  return null;
};

/**
 * Find the model for a tab and silently update its content. No-op if the
 * model isn't currently loaded.
 */
export const syncModelForTab = (tabId: string, content: string): void => {
  const model = findModelForTab(tabId);
  if (model) setModelContentSilently(model, content);
};
