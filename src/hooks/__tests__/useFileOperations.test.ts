import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../../api/desktopApi', () => ({
  desktopApi: {
    saveFileAs: vi.fn().mockResolvedValue({ success: true }),
  },
}));

vi.mock('../../api/variableApi', () => ({
  variableApi: {
    getExpandedMarkdown: vi.fn().mockResolvedValue('expanded content'),
  },
}));

import { useFileOperations } from '../useFileOperations';
import type { UseFileOperationsParams } from '../useFileOperations';
import type { Tab } from '../../types/tab';
import { asMock } from '../../test-utils';

describe('useFileOperations', () => {
  let openFile: ReturnType<typeof vi.fn>;
  let saveTab: ReturnType<typeof vi.fn>;
  let saveTabAs: ReturnType<typeof vi.fn>;
  let removeTab: ReturnType<typeof vi.fn>;
  let requestEditorFocus: ReturnType<typeof vi.fn>;
  let setSnackbar: ReturnType<typeof vi.fn>;
  let showSaveStatus: ReturnType<typeof vi.fn>;
  const t = (key: string) => key;

  const activeTab: Tab = {
    id: 'tab1',
    title: 'test.md',
    content: '# Hello',
    filePath: '/path/test.md',
    isModified: false,
    isNew: false,
  };

  const tabs: Tab[] = [
    activeTab,
    { id: 'tab2', title: 'other.md', content: '', isModified: true, isNew: false },
  ];

  beforeEach(() => {
    openFile = vi.fn().mockResolvedValue('new-tab-id');
    saveTab = vi.fn().mockResolvedValue(true);
    saveTabAs = vi.fn().mockResolvedValue(true);
    removeTab = vi.fn();
    requestEditorFocus = vi.fn();
    setSnackbar = vi.fn();
    showSaveStatus = vi.fn();
  });

  const defaultParams = (): UseFileOperationsParams => ({
    activeTab,
    tabs,
    globalVariables: {},
    openFile: asMock<(filePath?: string) => Promise<string>>(openFile),
    saveTab: asMock<(tabId: string) => Promise<boolean>>(saveTab),
    saveTabAs: asMock<(tabId: string) => Promise<boolean>>(saveTabAs),
    removeTab: asMock<(tabId: string) => void>(removeTab),
    requestEditorFocus: asMock<() => void>(requestEditorFocus),
    setSnackbar: asMock<(snackbar: { open: boolean; message: string; severity: 'success' | 'error' | 'warning' }) => void>(setSnackbar),
    showSaveStatus: asMock<(message: string) => void>(showSaveStatus),
    t,
  });

  // T-FO-01: handleOpenFile calls openFile
  it('T-FO-01: handleOpenFile calls openFile and shows snackbar', async () => {
    const { result } = renderHook(() => useFileOperations(defaultParams()));

    await act(async () => {
      await result.current.handleOpenFile();
    });

    expect(openFile).toHaveBeenCalled();
    expect(setSnackbar).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success' }));
    expect(requestEditorFocus).toHaveBeenCalled();
  });

  // T-FO-02: handleSaveFile calls saveTab
  it('T-FO-02: handleSaveFile calls saveTab', async () => {
    const { result } = renderHook(() => useFileOperations(defaultParams()));

    await act(async () => {
      await result.current.handleSaveFile();
    });

    expect(saveTab).toHaveBeenCalledWith('tab1');
    expect(showSaveStatus).toHaveBeenCalledWith('statusBar.saved');
  });

  // T-FO-03: handleSaveFileAs calls saveTabAs
  it('T-FO-03: handleSaveFileAs calls saveTabAs', async () => {
    const { result } = renderHook(() => useFileOperations(defaultParams()));

    await act(async () => {
      await result.current.handleSaveFileAs();
    });

    expect(saveTabAs).toHaveBeenCalledWith('tab1');
  });

  // T-FO-04: handleSaveFileAs with no active tab shows error
  it('T-FO-04: handleSaveFileAs shows error when no active tab', async () => {
    const params: UseFileOperationsParams = defaultParams();
    params.activeTab = null;
    const { result } = renderHook(() => useFileOperations(params));

    await act(async () => {
      await result.current.handleSaveFileAs();
    });

    expect(setSnackbar).toHaveBeenCalledWith(expect.objectContaining({ severity: 'error' }));
  });

  // T-FO-05: handleTabClose with unmodified tab removes directly
  it('T-FO-05: closes unmodified tab directly', () => {
    const { result } = renderHook(() => useFileOperations(defaultParams()));

    act(() => {
      result.current.handleTabClose('tab1');
    });

    expect(removeTab).toHaveBeenCalledWith('tab1');
  });

  // T-FO-06: handleTabClose with modified tab shows dialog
  it('T-FO-06: shows save dialog for modified tab', () => {
    const { result } = renderHook(() => useFileOperations(defaultParams()));

    act(() => {
      result.current.handleTabClose('tab2');
    });

    expect(result.current.saveBeforeCloseDialog.open).toBe(true);
    expect(result.current.saveBeforeCloseDialog.fileName).toBe('other.md');
    expect(removeTab).not.toHaveBeenCalled();
  });

  // T-FO-07: handleDontSaveBeforeClose removes tab
  it('T-FO-07: handleDontSaveBeforeClose removes tab without saving', () => {
    const { result } = renderHook(() => useFileOperations(defaultParams()));

    // First, trigger the dialog
    act(() => {
      result.current.handleTabClose('tab2');
    });

    act(() => {
      result.current.handleDontSaveBeforeClose();
    });

    expect(removeTab).toHaveBeenCalledWith('tab2');
    expect(result.current.saveBeforeCloseDialog.open).toBe(false);
  });

  // T-FO-08: handleCancelBeforeClose closes dialog without action
  it('T-FO-08: handleCancelBeforeClose closes dialog', () => {
    const { result } = renderHook(() => useFileOperations(defaultParams()));

    act(() => {
      result.current.handleTabClose('tab2');
    });

    act(() => {
      result.current.handleCancelBeforeClose();
    });

    expect(removeTab).not.toHaveBeenCalled();
    expect(result.current.saveBeforeCloseDialog.open).toBe(false);
  });

  // --- Close queue (bulk close of multiple modified tabs) ---------------------
  // Closing several modified tabs at once (close-all, close-others, quit) walks
  // a queue: the SaveBeforeClose dialog is shown for one tab at a time and each
  // user choice decides that tab only, then the queue advances. Cancel skips
  // the current tab (keeps it open) and moves on — it does not abort the rest
  // of the queue.

  const modifiedTabs: Tab[] = [
    { id: 'm1', title: 'one.md', content: 'a', isModified: true, isNew: false },
    { id: 'm2', title: 'two.md', content: 'b', isModified: true, isNew: false },
    { id: 'm3', title: 'three.md', content: 'c', isModified: true, isNew: false },
  ];

  const queueParams = (): UseFileOperationsParams => ({
    ...defaultParams(),
    activeTab: modifiedTabs[0],
    tabs: modifiedTabs,
  });

  // T-FO-09: the queue shows one dialog per tab, in order, and each choice
  // (cancel / don't save / save) applies only to the tab it was made for.
  it('T-FO-09: startCloseQueue walks modified tabs one dialog at a time', async () => {
    const { result } = renderHook(() => useFileOperations(queueParams()));

    act(() => {
      result.current.startCloseQueue(['m1', 'm2', 'm3']);
    });
    expect(result.current.saveBeforeCloseDialog.open).toBe(true);
    expect(result.current.saveBeforeCloseDialog.fileName).toBe('one.md');

    // Cancel: m1 stays open, queue moves on to m2
    act(() => {
      result.current.handleCancelBeforeClose();
    });
    expect(removeTab).not.toHaveBeenCalled();
    expect(result.current.saveBeforeCloseDialog.open).toBe(true);
    expect(result.current.saveBeforeCloseDialog.fileName).toBe('two.md');

    // Don't save: m2 is closed without saving, queue moves on to m3
    act(() => {
      result.current.handleDontSaveBeforeClose();
    });
    expect(removeTab).toHaveBeenCalledWith('m2');
    expect(saveTab).not.toHaveBeenCalled();
    expect(result.current.saveBeforeCloseDialog.fileName).toBe('three.md');

    // Save: m3 is saved and closed, queue is exhausted, dialog closes
    await act(async () => {
      await result.current.handleSaveBeforeClose();
    });
    expect(saveTab).toHaveBeenCalledWith('m3');
    expect(removeTab).toHaveBeenCalledWith('m3');
    expect(result.current.saveBeforeCloseDialog.open).toBe(false);
    expect(result.current.saveBeforeCloseDialog.queue).toEqual([]);
  });

  // T-FO-10: successful save-before-close removes the tab and reports "saved"
  it('T-FO-10: handleSaveBeforeClose saves, removes tab and shows save status', async () => {
    const { result } = renderHook(() => useFileOperations(defaultParams()));

    act(() => {
      result.current.handleTabClose('tab2');
    });

    await act(async () => {
      await result.current.handleSaveBeforeClose();
    });

    expect(saveTab).toHaveBeenCalledWith('tab2');
    expect(removeTab).toHaveBeenCalledWith('tab2');
    expect(showSaveStatus).toHaveBeenCalledWith('statusBar.saved');
  });

  // T-FO-11: when saveTab resolves false (e.g. the user cancelled the native
  // Save dialog for a new tab) the tab must NOT be closed — closing would
  // discard the unsaved edits — but the queue still advances to the next tab.
  it('T-FO-11: handleSaveBeforeClose keeps the tab when save returns false but advances the queue', async () => {
    saveTab.mockResolvedValue(false);
    const { result } = renderHook(() => useFileOperations(queueParams()));

    act(() => {
      result.current.startCloseQueue(['m1', 'm2']);
    });

    await act(async () => {
      await result.current.handleSaveBeforeClose();
    });

    expect(saveTab).toHaveBeenCalledWith('m1');
    expect(removeTab).not.toHaveBeenCalled();
    expect(showSaveStatus).not.toHaveBeenCalled();
    // The queue continues with the next tab instead of stalling
    expect(result.current.saveBeforeCloseDialog.open).toBe(true);
    expect(result.current.saveBeforeCloseDialog.fileName).toBe('two.md');
  });

  // T-FO-12: "Save with variables" expands {{variables}} before writing, so
  // the exported file contains resolved values, not the template syntax.
  it('T-FO-12: handleSaveWithVariables saves the variable-expanded content', async () => {
    const { desktopApi } = await import('../../api/desktopApi');
    const { variableApi } = await import('../../api/variableApi');
    const globalVariables = { author: 'Alice' };

    const { result } = renderHook(() =>
      useFileOperations({ ...defaultParams(), globalVariables })
    );

    await act(async () => {
      await result.current.handleSaveWithVariables();
    });

    expect(variableApi.getExpandedMarkdown).toHaveBeenCalledWith(activeTab.content, globalVariables);
    // The expanded content — not the raw tab content — goes to the save dialog
    expect(desktopApi.saveFileAs).toHaveBeenCalledWith('expanded content');
    expect(showSaveStatus).toHaveBeenCalledWith('statusBar.saved');
  });
});
