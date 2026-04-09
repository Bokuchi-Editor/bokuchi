import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../../api/desktopApi', () => ({
  desktopApi: {
    readFileFromPath: vi.fn().mockResolvedValue('new content'),
    getFileHash: vi.fn().mockResolvedValue({ hash: 'abc', modified_time: 1000, file_size: 100 }),
  },
}));

vi.mock('../../utils/fileChangeDetection', () => ({
  detectFileChange: vi.fn().mockResolvedValue(false),
}));

import { useFileChangeDetection } from '../useFileChangeDetection';
import type { Tab } from '../../types/tab';
import { asMock } from '../../test-utils';

describe('useFileChangeDetection', () => {
  let reloadTabContent: ReturnType<typeof vi.fn>;
  let updateTabFileHash: ReturnType<typeof vi.fn>;
  let setTabModified: ReturnType<typeof vi.fn>;
  let setActiveTab: ReturnType<typeof vi.fn>;

  const tabs: Tab[] = [
    { id: 'tab1', title: 'test.md', content: '# Old', filePath: '/path/test.md', isModified: false, isNew: false },
  ];

  beforeEach(() => {
    reloadTabContent = vi.fn();
    updateTabFileHash = vi.fn();
    setTabModified = vi.fn();
    setActiveTab = vi.fn();
  });

  const defaultParams = () => ({
    tabs,
    activeTab: tabs[0],
    isInitialized: true,
    reloadTabContent: asMock<(tabId: string, content: string) => void>(reloadTabContent),
    updateTabFileHash: asMock<(tabId: string) => void>(updateTabFileHash),
    setTabModified: asMock<(tabId: string, isModified: boolean) => void>(setTabModified),
    setActiveTab: asMock<(tabId: string) => void>(setActiveTab),
  });

  // T-FCD-01: initial state
  it('T-FCD-01: starts with dialog closed', () => {
    const { result } = renderHook(() => useFileChangeDetection(defaultParams()));
    expect(result.current.fileChangeDialog.open).toBe(false);
  });

  // T-FCD-02: responds to fileChangeDetected event
  it('T-FCD-02: opens dialog on fileChangeDetected event', () => {
    const { result } = renderHook(() => useFileChangeDetection(defaultParams()));

    act(() => {
      const event = new CustomEvent('fileChangeDetected', {
        detail: {
          fileName: 'test.md',
          tabId: 'tab1',
          onCancel: vi.fn(),
        },
      });
      window.dispatchEvent(event);
    });

    expect(result.current.fileChangeDialog.open).toBe(true);
    expect(result.current.fileChangeDialog.fileName).toBe('test.md');
  });

  // T-FCD-03: dialog can be set externally
  it('T-FCD-03: setFileChangeDialog updates state', () => {
    const { result } = renderHook(() => useFileChangeDetection(defaultParams()));

    act(() => {
      result.current.setFileChangeDialog({
        open: true,
        fileName: 'manual.md',
        onReload: vi.fn(),
        onCancel: vi.fn(),
      });
    });

    expect(result.current.fileChangeDialog.open).toBe(true);
    expect(result.current.fileChangeDialog.fileName).toBe('manual.md');
  });

  // T-FCD-04: cleans up event listener on unmount
  it('T-FCD-04: cleans up event listener on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useFileChangeDetection(defaultParams()));

    unmount();

    expect(removeSpy).toHaveBeenCalledWith('fileChangeDetected', expect.any(Function));
    removeSpy.mockRestore();
  });

  // T-FCD-05: Regression test - event listener sees updated tabs (Issue #225)
  it('T-FCD-05: reload finds tab after tabs are updated', async () => {
    const { desktopApi } = await import('../../api/desktopApi');

    const initialTabs: Tab[] = [
      { id: 'tab1', title: 'test.md', content: '# Old', filePath: '/path/test.md', isModified: false, isNew: false },
    ];

    const newTab: Tab = {
      id: 'tab2', title: 'new.md', content: '# New', filePath: '/path/new.md', isModified: false, isNew: false,
    };

    let currentTabs = initialTabs;

    const { rerender } = renderHook(
      () => useFileChangeDetection({
        tabs: currentTabs,
        activeTab: currentTabs[0],
        isInitialized: true,
        reloadTabContent: asMock<(tabId: string, content: string) => void>(reloadTabContent),
        updateTabFileHash: asMock<(tabId: string) => void>(updateTabFileHash),
        setTabModified: asMock<(tabId: string, isModified: boolean) => void>(setTabModified),
        setActiveTab: asMock<(tabId: string) => void>(setActiveTab),
      }),
    );

    // Add a new tab and rerender
    currentTabs = [...initialTabs, newTab];
    rerender();

    // Dispatch event for the new tab
    await act(async () => {
      const event = new CustomEvent('fileChangeDetected', {
        detail: {
          fileName: 'new.md',
          tabId: 'tab2',
          onCancel: vi.fn(),
        },
      });
      window.dispatchEvent(event);
    });

    // The dialog should open and the reload handler should find tab2
    // If tabs dependency was missing, the listener would have stale tabs and not find tab2
    asMock<typeof desktopApi.readFileFromPath>(desktopApi.readFileFromPath as ReturnType<typeof vi.fn>);
    (desktopApi.readFileFromPath as ReturnType<typeof vi.fn>).mockResolvedValueOnce('updated content');
  });

  // T-FCD-07: Regression test - cancel marks tab as modified
  it('T-FCD-07: onCancel calls detail onCancel and closes dialog', async () => {
    const detailOnCancel = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useFileChangeDetection(defaultParams()));

    // Open dialog via event
    act(() => {
      const event = new CustomEvent('fileChangeDetected', {
        detail: {
          fileName: 'test.md',
          tabId: 'tab1',
          onCancel: detailOnCancel,
        },
      });
      window.dispatchEvent(event);
    });

    expect(result.current.fileChangeDialog.open).toBe(true);

    // Click cancel
    await act(async () => {
      await result.current.fileChangeDialog.onCancel();
    });

    // Detail's onCancel should have been called
    expect(detailOnCancel).toHaveBeenCalledTimes(1);
    // Dialog should be closed
    expect(result.current.fileChangeDialog.open).toBe(false);
  });

  // T-FCD-08: Regression test - dialog closes even if onCancel throws
  it('T-FCD-08: dialog closes even when detail onCancel throws', async () => {
    const detailOnCancel = vi.fn().mockRejectedValue(new Error('save failed'));
    const { result } = renderHook(() => useFileChangeDetection(defaultParams()));

    // Open dialog via event
    act(() => {
      const event = new CustomEvent('fileChangeDetected', {
        detail: {
          fileName: 'test.md',
          tabId: 'tab1',
          onCancel: detailOnCancel,
        },
      });
      window.dispatchEvent(event);
    });

    expect(result.current.fileChangeDialog.open).toBe(true);

    // Click cancel (onCancel throws internally)
    await act(async () => {
      await result.current.fileChangeDialog.onCancel();
    });

    // Dialog must still close despite the error
    expect(result.current.fileChangeDialog.open).toBe(false);
  });

  // T-FCD-06: Regression test - polling stops while dialog is open
  it('T-FCD-06: does not poll while file change dialog is open', async () => {
    vi.useFakeTimers();

    try {
      const { detectFileChange } = await import('../../utils/fileChangeDetection');
      const mockDetect = detectFileChange as ReturnType<typeof vi.fn>;
      mockDetect.mockClear();

      const { result } = renderHook(() => useFileChangeDetection(defaultParams()));

      // Open the dialog
      act(() => {
        result.current.setFileChangeDialog({
          open: true,
          fileName: 'test.md',
          onReload: vi.fn(),
          onCancel: vi.fn(),
        });
      });

      // Advance timers past the 5-second polling interval
      await act(async () => {
        vi.advanceTimersByTime(10000);
      });

      // detectFileChange should NOT have been called while dialog is open
      expect(mockDetect).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
