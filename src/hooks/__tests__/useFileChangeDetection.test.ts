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

describe('useFileChangeDetection', () => {
  let updateTabContent: ReturnType<typeof vi.fn>;
  let updateTabFileHash: ReturnType<typeof vi.fn>;
  let setActiveTab: ReturnType<typeof vi.fn>;

  const tabs: Tab[] = [
    { id: 'tab1', title: 'test.md', content: '# Old', filePath: '/path/test.md', isModified: false, isNew: false },
  ];

  beforeEach(() => {
    updateTabContent = vi.fn();
    updateTabFileHash = vi.fn();
    setActiveTab = vi.fn();
  });

  const defaultParams = () => ({
    tabs,
    activeTab: tabs[0],
    isInitialized: true,
    updateTabContent,
    updateTabFileHash,
    setActiveTab,
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
});
