import { describe, it, expect, vi } from 'vitest';
import type { editor } from 'monaco-editor';
import {
  setModelContentSilently,
  isModelSilentlyEditing,
  findModelForTab,
  syncModelForTab,
} from '../editorSync';

// Build a minimal model stub backed by a string. setModelContentSilently now
// uses an undoable pushEditOperations with a minimal range; the stub applies
// the op to the backing store and encodes offsets as column numbers (line 1)
// so getPositionAt and the op range round-trip.
function makeModel(initial: string, uri = 'tab-1'): editor.ITextModel {
  let value = initial;
  const pushEditOperations = vi.fn(
    (_before: unknown, ops: { range: { startColumn: number; endColumn: number }; text: string }[]) => {
      const op = ops[0];
      const start = op.range.startColumn - 1;
      const end = op.range.endColumn - 1;
      value = value.slice(0, start) + op.text + value.slice(end);
    },
  );
  return {
    getValue: () => value,
    getPositionAt: (offset: number) => ({ lineNumber: 1, column: offset + 1 }),
    pushEditOperations,
    uri: { toString: () => uri },
  } as unknown as editor.ITextModel;
}

describe('editorSync', () => {
  describe('setModelContentSilently', () => {
    // T-ES-01: writes content when it differs from the model's current value
    it('T-ES-01: applies an undoable edit when content differs', () => {
      const model = makeModel('old');
      setModelContentSilently(model, 'new');
      expect(model.pushEditOperations).toHaveBeenCalled();
      expect(model.getValue()).toBe('new');
    });

    // T-ES-01b: only the changed span is replaced (common prefix/suffix kept),
    // so the edit is minimal and the caret outside it is preserved.
    it('T-ES-01b: replaces only the changed span', () => {
      const model = makeModel('hello world');
      setModelContentSilently(model, 'hello brave world');
      const op = (model.pushEditOperations as ReturnType<typeof vi.fn>).mock.calls[0][1][0];
      // "hello " is the common prefix, "world" the common suffix.
      expect(op.range.startColumn - 1).toBe(6);
      expect(op.range.endColumn - 1).toBe(6);
      expect(op.text).toBe('brave ');
      expect(model.getValue()).toBe('hello brave world');
    });

    // T-ES-01c: shrinking content (a deletion) produces a pure delete op over
    // the removed span — the common prefix/suffix trimming must handle the
    // new content being shorter than the old.
    it('T-ES-01c: replaces the removed span when content shrinks', () => {
      const model = makeModel('hello brave world');
      setModelContentSilently(model, 'hello world');
      const op = (model.pushEditOperations as ReturnType<typeof vi.fn>).mock.calls[0][1][0];
      // Prefix "hello " (6) and suffix "world" survive; "brave " is deleted.
      expect(op.range.startColumn - 1).toBe(6);
      expect(op.range.endColumn - 1).toBe(12);
      expect(op.text).toBe('');
      expect(model.getValue()).toBe('hello world');
    });

    // T-ES-02: skips the edit when content already matches (avoids spurious
    // ContentFlush events that would scroll/reset the editor)
    it('T-ES-02: skips the edit when content already matches', () => {
      const model = makeModel('same');
      setModelContentSilently(model, 'same');
      expect(model.pushEditOperations).not.toHaveBeenCalled();
    });

    // T-ES-03: while the edit is mid-flight, the model reports itself as
    // silently editing — this is what the editor's onChange handler keys off.
    it('T-ES-03: model reports silently-editing during the edit', () => {
      const model = makeModel('old');
      let observedDuring: boolean | null = null;
      (model.pushEditOperations as ReturnType<typeof vi.fn>).mockImplementation(() => {
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

    // T-ES-05: if the edit throws, the silent flag is still cleared so the
    // model isn't permanently stuck in silent mode.
    it('T-ES-05: silent-edit flag is cleared even if the edit throws', () => {
      const model = makeModel('old');
      (model.pushEditOperations as ReturnType<typeof vi.fn>).mockImplementation(() => {
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
        expect(model.getValue()).toBe('new');
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
        expect(target.getValue()).toBe('new');
        expect(other.pushEditOperations).not.toHaveBeenCalled();
        expect(other.getValue()).toBe('untouched');
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
  });
});
