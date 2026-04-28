import { describe, it, expect, vi } from 'vitest';
import type { editor } from 'monaco-editor';
import {
  setModelContentSilently,
  isModelSilentlyEditing,
  findModelForTab,
  syncModelForTab,
} from '../editorSync';

// Build a minimal model stub backed by a string. setValue is observable;
// getValue returns the current backing store.
function makeModel(initial: string, uri = 'tab-1'): editor.ITextModel {
  let value = initial;
  const setValue = vi.fn((v: string) => {
    value = v;
  });
  return {
    getValue: () => value,
    setValue,
    uri: { toString: () => uri },
  } as unknown as editor.ITextModel;
}

describe('editorSync', () => {
  describe('setModelContentSilently', () => {
    // T-ES-01: writes content when it differs from the model's current value
    it('T-ES-01: calls setValue when content differs', () => {
      const model = makeModel('old');
      setModelContentSilently(model, 'new');
      expect(model.setValue).toHaveBeenCalledWith('new');
    });

    // T-ES-02: skips setValue when content already matches (avoids spurious
    // ContentFlush events that would scroll/reset the editor)
    it('T-ES-02: skips setValue when content already matches', () => {
      const model = makeModel('same');
      setModelContentSilently(model, 'same');
      expect(model.setValue).not.toHaveBeenCalled();
    });

    // T-ES-03: while setValue is mid-flight, the model reports itself as
    // silently editing — this is what the editor's onChange handler keys off.
    it('T-ES-03: model reports silently-editing during setValue', () => {
      const model = makeModel('old');
      let observedDuring: boolean | null = null;
      (model.setValue as ReturnType<typeof vi.fn>).mockImplementation(() => {
        observedDuring = isModelSilentlyEditing(model);
      });
      setModelContentSilently(model, 'new');
      expect(observedDuring).toBe(true);
    });

    // T-ES-04: the silent flag is cleared after the call returns, so future
    // user-driven changes are not accidentally treated as silent.
    it('T-ES-04: silent-edit flag is cleared after return', () => {
      const model = makeModel('old');
      setModelContentSilently(model, 'new');
      expect(isModelSilentlyEditing(model)).toBe(false);
    });

    // T-ES-05: if setValue throws, the silent flag is still cleared so the
    // model isn't permanently stuck in silent mode.
    it('T-ES-05: silent-edit flag is cleared even if setValue throws', () => {
      const model = makeModel('old');
      (model.setValue as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error('boom');
      });
      expect(() => setModelContentSilently(model, 'new')).toThrow('boom');
      expect(isModelSilentlyEditing(model)).toBe(false);
    });
  });

  describe('isModelSilentlyEditing', () => {
    // T-ES-06: null/undefined model is not silently editing
    it('T-ES-06: returns false for null/undefined model', () => {
      expect(isModelSilentlyEditing(null)).toBe(false);
      expect(isModelSilentlyEditing(undefined)).toBe(false);
    });

    // T-ES-07: a fresh model is not silently editing
    it('T-ES-07: returns false for a model with no in-flight silent edit', () => {
      const model = makeModel('hello');
      expect(isModelSilentlyEditing(model)).toBe(false);
    });
  });

  describe('findModelForTab', () => {
    // T-ES-FM-01: returns the model whose URI exactly matches the tab id
    it('T-ES-FM-01: matches by exact URI string', () => {
      const model = makeModel('x', 'tab-1');
      const originalMonaco = (window as { monaco?: unknown }).monaco;
      (window as { monaco?: unknown }).monaco = {
        editor: { getModels: () => [model] },
      };
      try {
        expect(findModelForTab('tab-1')).toBe(model);
      } finally {
        (window as { monaco?: unknown }).monaco = originalMonaco;
      }
    });

    // T-ES-FM-02: matches when Monaco normalizes the URI to file:///<id>
    it('T-ES-FM-02: matches by trailing /tabId path segment', () => {
      const model = makeModel('x', 'file:///tab-1');
      const originalMonaco = (window as { monaco?: unknown }).monaco;
      (window as { monaco?: unknown }).monaco = {
        editor: { getModels: () => [model] },
      };
      try {
        expect(findModelForTab('tab-1')).toBe(model);
      } finally {
        (window as { monaco?: unknown }).monaco = originalMonaco;
      }
    });

    // T-ES-FM-03: returns null when no model matches
    it('T-ES-FM-03: returns null when no model matches the tab id', () => {
      const other = makeModel('x', 'tab-2');
      const originalMonaco = (window as { monaco?: unknown }).monaco;
      (window as { monaco?: unknown }).monaco = {
        editor: { getModels: () => [other] },
      };
      try {
        expect(findModelForTab('tab-missing')).toBeNull();
      } finally {
        (window as { monaco?: unknown }).monaco = originalMonaco;
      }
    });

    // T-ES-FM-04: returns null when Monaco isn't loaded
    it('T-ES-FM-04: returns null when window.monaco is undefined', () => {
      const originalMonaco = (window as { monaco?: unknown }).monaco;
      (window as { monaco?: unknown }).monaco = undefined;
      try {
        expect(findModelForTab('tab-1')).toBeNull();
      } finally {
        (window as { monaco?: unknown }).monaco = originalMonaco;
      }
    });
  });

  describe('syncModelForTab', () => {
    // T-ES-08: updates the model whose URI string equals the tab id
    it('T-ES-08: matches model by exact URI string', () => {
      const model = makeModel('old', 'tab-1');
      const originalMonaco = (window as { monaco?: unknown }).monaco;
      (window as { monaco?: unknown }).monaco = {
        editor: { getModels: () => [model] },
      };
      try {
        syncModelForTab('tab-1', 'new');
        expect(model.setValue).toHaveBeenCalledWith('new');
      } finally {
        (window as { monaco?: unknown }).monaco = originalMonaco;
      }
    });

    // T-ES-09: matches when Monaco normalizes the URI to file:///<id>
    it('T-ES-09: matches model by trailing /tabId path segment', () => {
      const model = makeModel('old', 'file:///tab-1');
      const originalMonaco = (window as { monaco?: unknown }).monaco;
      (window as { monaco?: unknown }).monaco = {
        editor: { getModels: () => [model] },
      };
      try {
        syncModelForTab('tab-1', 'new');
        expect(model.setValue).toHaveBeenCalledWith('new');
      } finally {
        (window as { monaco?: unknown }).monaco = originalMonaco;
      }
    });

    // T-ES-10: leaves unrelated models alone
    it('T-ES-10: does not touch models for other tabs', () => {
      const target = makeModel('old', 'tab-1');
      const other = makeModel('untouched', 'tab-2');
      const originalMonaco = (window as { monaco?: unknown }).monaco;
      (window as { monaco?: unknown }).monaco = {
        editor: { getModels: () => [other, target] },
      };
      try {
        syncModelForTab('tab-1', 'new');
        expect(target.setValue).toHaveBeenCalledWith('new');
        expect(other.setValue).not.toHaveBeenCalled();
      } finally {
        (window as { monaco?: unknown }).monaco = originalMonaco;
      }
    });

    // T-ES-11: no-op when Monaco isn't loaded yet (e.g. fileNotFound state
    // where the editor never mounted)
    it('T-ES-11: no-ops when window.monaco is undefined', () => {
      const originalMonaco = (window as { monaco?: unknown }).monaco;
      (window as { monaco?: unknown }).monaco = undefined;
      try {
        expect(() => syncModelForTab('tab-1', 'new')).not.toThrow();
      } finally {
        (window as { monaco?: unknown }).monaco = originalMonaco;
      }
    });

    // T-ES-12: no-op when no model matches the tab id (model was disposed
    // or never created — e.g. inactive tab in a fresh session)
    it('T-ES-12: no-ops when no model matches the tab id', () => {
      const other = makeModel('untouched', 'tab-2');
      const originalMonaco = (window as { monaco?: unknown }).monaco;
      (window as { monaco?: unknown }).monaco = {
        editor: { getModels: () => [other] },
      };
      try {
        expect(() => syncModelForTab('tab-missing', 'new')).not.toThrow();
        expect(other.setValue).not.toHaveBeenCalled();
      } finally {
        (window as { monaco?: unknown }).monaco = originalMonaco;
      }
    });
  });
});
