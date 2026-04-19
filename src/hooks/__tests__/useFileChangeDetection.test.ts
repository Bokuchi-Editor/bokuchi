import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../../api/desktopApi', () => ({
  desktopApi: {
    readFileFromPath: vi.fn().mockResolvedValue('new content'),
    readFileByPath: vi.fn().mockResolvedValue({ content: 'new content', error: null }),
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

  // T-FCD-09: polling fires at exactly 5-second intervals
  it('T-FCD-09: polls for file changes every 5 seconds', async () => {
    vi.useFakeTimers();

    try {
      const { detectFileChange } = await import('../../utils/fileChangeDetection');
      const mockDetect = detectFileChange as ReturnType<typeof vi.fn>;
      mockDetect.mockClear();
      mockDetect.mockResolvedValue(false);

      renderHook(() => useFileChangeDetection(defaultParams()));

      // At 4999ms - should NOT have polled yet
      await act(async () => {
        vi.advanceTimersByTime(4999);
      });
      expect(mockDetect).not.toHaveBeenCalled();

      // At 5000ms - should poll
      await act(async () => {
        vi.advanceTimersByTime(1);
      });
      expect(mockDetect).toHaveBeenCalledTimes(1);

      // At 10000ms - should poll again
      await act(async () => {
        vi.advanceTimersByTime(5000);
      });
      expect(mockDetect).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  // T-FCD-10: polling resumes after dialog is closed
  it('T-FCD-10: resumes polling after dialog is closed', async () => {
    vi.useFakeTimers();

    try {
      const { detectFileChange } = await import('../../utils/fileChangeDetection');
      const mockDetect = detectFileChange as ReturnType<typeof vi.fn>;
      mockDetect.mockClear();
      mockDetect.mockResolvedValue(false);

      const { result } = renderHook(() => useFileChangeDetection(defaultParams()));

      // Open dialog - stops polling
      act(() => {
        result.current.setFileChangeDialog({
          open: true,
          fileName: 'test.md',
          onReload: vi.fn(),
          onCancel: vi.fn(),
        });
      });

      await act(async () => {
        vi.advanceTimersByTime(10000);
      });
      expect(mockDetect).not.toHaveBeenCalled();

      // Close dialog - polling should resume
      act(() => {
        result.current.setFileChangeDialog({
          open: false,
          fileName: '',
          onReload: vi.fn(),
          onCancel: vi.fn(),
        });
      });

      await act(async () => {
        vi.advanceTimersByTime(5000);
      });
      expect(mockDetect).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  // T-FCD-11: detectFileChange error does not open dialog
  it('T-FCD-11: error in detectFileChange does not open dialog', async () => {
    vi.useFakeTimers();

    try {
      const { detectFileChange } = await import('../../utils/fileChangeDetection');
      const mockDetect = detectFileChange as ReturnType<typeof vi.fn>;
      mockDetect.mockClear();
      mockDetect.mockRejectedValue(new Error('permission denied'));

      const { result } = renderHook(() => useFileChangeDetection(defaultParams()));

      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      // Dialog should remain closed despite the error
      expect(result.current.fileChangeDialog.open).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  // T-FCD-12: Regression test - reload syncs Monaco model (preview mode fix)
  it('T-FCD-12: onReload syncs Monaco model when it exists', async () => {
    const { desktopApi } = await import('../../api/desktopApi');
    (desktopApi.readFileByPath as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      content: 'externally updated content',
      error: null,
    });

    const mockSetValue = vi.fn();
    const mockModel = {
      uri: { toString: () => 'tab1' },
      getValue: () => 'old content',
      setValue: mockSetValue,
    };

    // Set up mock Monaco global with a model for tab1
    const originalMonaco = (window as { monaco?: unknown }).monaco;
    (window as { monaco?: unknown }).monaco = {
      editor: {
        getModels: () => [mockModel],
      },
    };

    try {
      const { result } = renderHook(() => useFileChangeDetection(defaultParams()));

      // Dispatch fileChangeDetected event
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

      // Click reload
      await act(async () => {
        await result.current.fileChangeDialog.onReload();
      });

      // Monaco model should have been synced with the new content
      expect(mockSetValue).toHaveBeenCalledWith('externally updated content');
      expect(reloadTabContent).toHaveBeenCalledWith('tab1', 'externally updated content');
      expect(result.current.fileChangeDialog.open).toBe(false);
    } finally {
      (window as { monaco?: unknown }).monaco = originalMonaco;
    }
  });

  // T-FCD-13: Regression test - reload skips Monaco sync when model content matches
  it('T-FCD-13: onReload skips Monaco setValue when model already has correct content', async () => {
    const { desktopApi } = await import('../../api/desktopApi');
    (desktopApi.readFileByPath as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      content: 'same content',
      error: null,
    });

    const mockSetValue = vi.fn();
    const mockModel = {
      uri: { toString: () => 'tab1' },
      getValue: () => 'same content',
      setValue: mockSetValue,
    };

    const originalMonaco = (window as { monaco?: unknown }).monaco;
    (window as { monaco?: unknown }).monaco = {
      editor: {
        getModels: () => [mockModel],
      },
    };

    try {
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

      await act(async () => {
        await result.current.fileChangeDialog.onReload();
      });

      // setValue should NOT be called since content already matches
      expect(mockSetValue).not.toHaveBeenCalled();
    } finally {
      (window as { monaco?: unknown }).monaco = originalMonaco;
    }
  });

  // T-FCD-14: Regression test - reload works when Monaco is not available
  it('T-FCD-14: onReload works gracefully when Monaco global is not available', async () => {
    const { desktopApi } = await import('../../api/desktopApi');
    (desktopApi.readFileByPath as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      content: 'new content',
      error: null,
    });

    const originalMonaco = (window as { monaco?: unknown }).monaco;
    (window as { monaco?: unknown }).monaco = undefined;

    try {
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

      // Should not throw even without Monaco
      await act(async () => {
        await result.current.fileChangeDialog.onReload();
      });

      expect(reloadTabContent).toHaveBeenCalledWith('tab1', 'new content');
      expect(result.current.fileChangeDialog.open).toBe(false);
    } finally {
      (window as { monaco?: unknown }).monaco = originalMonaco;
    }
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
