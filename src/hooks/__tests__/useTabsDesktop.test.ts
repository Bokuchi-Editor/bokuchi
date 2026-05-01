import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock Tauri APIs that useTabsDesktop pulls in transitively.
vi.mock('@tauri-apps/api/core');
vi.mock('@tauri-apps/plugin-fs');

vi.mock('../../api/desktopApi', () => ({
  desktopApi: {
    readFileFromPath: vi.fn(),
    writeFileToPath: vi.fn(),
  },
}));

vi.mock('../../api/storeApi', () => ({
  storeApi: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    loadState: vi.fn().mockResolvedValue(null),
    saveState: vi.fn().mockResolvedValue(undefined),
    createInitialState: vi.fn().mockReturnValue({ tabs: [], activeTabId: null }),
  },
}));

vi.mock('../../utils/fileChangeDetection', () => ({
  detectFileChange: vi.fn(),
}));

// editorSync is the contract we want to assert against. Spy on syncModelForTab.
const syncModelForTabMock = vi.fn();
vi.mock('../../utils/editorSync', () => ({
  syncModelForTab: (...args: unknown[]) => syncModelForTabMock(...args),
  setModelContentSilently: vi.fn(),
  isModelSilentlyEditing: vi.fn().mockReturnValue(false),
  findModelForTab: vi.fn().mockReturnValue(null),
}));

import { useTabsDesktop } from '../useTabsDesktop';

/**
 * These tests pin down the contract that any tab-state mutation that originates
 * OUTSIDE the Monaco editor (e.g. a preview checkbox toggle, a search/replace,
 * a future "format document" command) must push the new content into the
 * Monaco model via syncModelForTab. The Editor is intentionally uncontrolled
 * (Monaco model is source of truth), so without this sync the editor view
 * silently goes out of step with React state — which has caused at least three
 * checkbox-toggle regressions historically.
 *
 * If you need to remove the syncModelForTab call from updateTabContent or
 * reloadTabContent: stop, read src/utils/editorSync.ts and the comments on
 * src/components/Editor.tsx around the <Editor defaultValue={content}> usage,
 * and add an alternative model-sync mechanism BEFORE deleting these tests.
 */
describe('useTabsDesktop – Monaco model sync contract', () => {
  beforeEach(() => {
    syncModelForTabMock.mockClear();
  });

  // T-UTD-01: updateTabContent must sync the Monaco model with the new content.
  // This is the assertion that catches the regression chain that has bitten
  // checkbox toggles three times: Preview → onContentChange → updateTabContent
  // → (must) → syncModelForTab → Monaco model.
  it('T-UTD-01: updateTabContent calls syncModelForTab with the same id and content', () => {
    const { result } = renderHook(() => useTabsDesktop());

    let tabId: string;
    act(() => {
      tabId = result.current.addTab({
        title: 'Tasks',
        content: '- [ ] task',
        isModified: false,
        isNew: true,
      });
    });

    syncModelForTabMock.mockClear(); // ignore any sync triggered by addTab

    act(() => {
      result.current.updateTabContent(tabId!, '- [x] task');
    });

    expect(syncModelForTabMock).toHaveBeenCalledTimes(1);
    expect(syncModelForTabMock).toHaveBeenCalledWith(tabId!, '- [x] task');
    // React state must also reflect the new content.
    expect(result.current.tabs[0].content).toBe('- [x] task');
  });

  // T-UTD-02: model sync runs BEFORE the reducer dispatch so that the silent
  // flag is set while Monaco's onChange re-fires. Without this ordering the
  // tab's isModified would flicker / fire onChange twice.
  it('T-UTD-02: updateTabContent syncs the model before React state changes', () => {
    const { result } = renderHook(() => useTabsDesktop());

    let tabId: string;
    act(() => {
      tabId = result.current.addTab({
        title: 'A',
        content: 'old',
        isModified: false,
        isNew: true,
      });
    });

    let contentAtSyncTime: string | undefined;
    syncModelForTabMock.mockImplementationOnce((_id: string, c: string) => {
      // At the moment syncModelForTab is invoked, React state should still
      // have the OLD content. The reducer dispatch happens after.
      contentAtSyncTime = result.current.tabs[0].content;
      // Returned content must be the new content we are syncing INTO Monaco.
      expect(c).toBe('new');
    });

    act(() => {
      result.current.updateTabContent(tabId!, 'new');
    });

    expect(contentAtSyncTime).toBe('old');
    expect(result.current.tabs[0].content).toBe('new');
  });

  // T-UTD-03: reloadTabContent (file-change reload path) also must sync the
  // model. Same regression class — covered explicitly so a future refactor of
  // the reload path can't quietly drop the sync.
  it('T-UTD-03: reloadTabContent calls syncModelForTab with the new content', () => {
    const { result } = renderHook(() => useTabsDesktop());

    let tabId: string;
    act(() => {
      tabId = result.current.addTab({
        title: 'A',
        content: 'old',
        isModified: true,
        isNew: false,
      });
    });

    syncModelForTabMock.mockClear();

    act(() => {
      result.current.reloadTabContent(tabId!, 'reloaded');
    });

    expect(syncModelForTabMock).toHaveBeenCalledTimes(1);
    expect(syncModelForTabMock).toHaveBeenCalledWith(tabId!, 'reloaded');
    expect(result.current.tabs[0].content).toBe('reloaded');
    // reload path also resets isModified.
    expect(result.current.tabs[0].isModified).toBe(false);
  });
});
