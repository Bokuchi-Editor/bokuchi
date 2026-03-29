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

});
