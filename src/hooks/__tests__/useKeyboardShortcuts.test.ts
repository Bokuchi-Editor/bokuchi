import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useKeyboardShortcuts } from '../useKeyboardShortcuts';
import { DEFAULT_APP_SETTINGS } from '../../types/settings';
import type { Tab } from '../../types/tab';
import { asMock } from '../../test-utils';

describe('useKeyboardShortcuts', () => {
  let onNewTab: ReturnType<typeof vi.fn>;
  let onOpenFile: ReturnType<typeof vi.fn>;
  let onSaveFile: ReturnType<typeof vi.fn>;
  let onSaveFileAs: ReturnType<typeof vi.fn>;
  let onRecentFilesOpen: ReturnType<typeof vi.fn>;
  let onHelpOpen: ReturnType<typeof vi.fn>;
  let onSettingsOpen: ReturnType<typeof vi.fn>;
  let onRotateViewMode: ReturnType<typeof vi.fn>;
  let onChangeViewMode: ReturnType<typeof vi.fn>;
  let setActiveTab: ReturnType<typeof vi.fn>;
  let setOutlinePanelOpen: ReturnType<typeof vi.fn>;
  let setFolderTreePanelOpen: ReturnType<typeof vi.fn>;

  const tabs: Tab[] = [
    { id: 'tab1', title: 'file1.md', content: '', isModified: false, isNew: false },
    { id: 'tab2', title: 'file2.md', content: '', isModified: false, isNew: false },
    { id: 'tab3', title: 'file3.md', content: '', isModified: false, isNew: false },
  ];

  beforeEach(() => {
    onNewTab = vi.fn();
    onOpenFile = vi.fn();
    onSaveFile = vi.fn();
    onSaveFileAs = vi.fn();
    onRecentFilesOpen = vi.fn();
    onHelpOpen = vi.fn();
    onSettingsOpen = vi.fn();
    onRotateViewMode = vi.fn();
    onChangeViewMode = vi.fn();
    setActiveTab = vi.fn();
    setOutlinePanelOpen = vi.fn();
    setFolderTreePanelOpen = vi.fn();
  });

  const defaultParams = () => ({
    onNewTab: asMock<() => void>(onNewTab),
    onOpenFile: asMock<() => void>(onOpenFile),
    onSaveFile: asMock<() => void>(onSaveFile),
    onSaveFileAs: asMock<() => void>(onSaveFileAs),
    onRecentFilesOpen: asMock<() => void>(onRecentFilesOpen),
    onHelpOpen: asMock<() => void>(onHelpOpen),
    onSettingsOpen: asMock<() => void>(onSettingsOpen),
    onRotateViewMode: asMock<() => void>(onRotateViewMode),
    onChangeViewMode: asMock<(mode: 'split' | 'editor' | 'preview') => void>(onChangeViewMode),
    tabs,
    activeTabId: 'tab1',
    setActiveTab: asMock<(tabId: string) => void>(setActiveTab),
    appSettings: DEFAULT_APP_SETTINGS,
    setOutlinePanelOpen: asMock<React.Dispatch<React.SetStateAction<boolean>>>(setOutlinePanelOpen),
    setFolderTreePanelOpen: asMock<React.Dispatch<React.SetStateAction<boolean>>>(setFolderTreePanelOpen),
  });

  const fireKeydown = (key: string, modifiers: Partial<KeyboardEvent> = {}) => {
    const event = new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      ...modifiers,
    });
    document.dispatchEvent(event);
  };

  // T-KS-01: Ctrl+N calls onNewTab
  it('T-KS-01: Ctrl+N triggers new tab', () => {
    renderHook(() => useKeyboardShortcuts(defaultParams()));

    act(() => {
      fireKeydown('n', { ctrlKey: true });
    });

    expect(onNewTab).toHaveBeenCalledTimes(1);
  });

  // T-KS-02: Ctrl+O calls onOpenFile
  it('T-KS-02: Ctrl+O triggers open file', () => {
    renderHook(() => useKeyboardShortcuts(defaultParams()));

    act(() => {
      fireKeydown('o', { ctrlKey: true });
    });

    expect(onOpenFile).toHaveBeenCalledTimes(1);
  });

  // T-KS-03: Ctrl+S calls onSaveFile
  it('T-KS-03: Ctrl+S triggers save', () => {
    renderHook(() => useKeyboardShortcuts(defaultParams()));

    act(() => {
      fireKeydown('s', { ctrlKey: true });
    });

    expect(onSaveFile).toHaveBeenCalledTimes(1);
  });

  // T-KS-04: F1 calls onHelpOpen
  it('T-KS-04: F1 triggers help', () => {
    renderHook(() => useKeyboardShortcuts(defaultParams()));

    act(() => {
      fireKeydown('F1');
    });

    expect(onHelpOpen).toHaveBeenCalledTimes(1);
  });

  // T-KS-05: Ctrl+, calls onSettingsOpen
  it('T-KS-05: Ctrl+, triggers settings', () => {
    renderHook(() => useKeyboardShortcuts(defaultParams()));

    act(() => {
      fireKeydown(',', { ctrlKey: true });
    });

    expect(onSettingsOpen).toHaveBeenCalledTimes(1);
  });

  // T-KS-06: Ctrl+R calls onRecentFilesOpen
  it('T-KS-06: Ctrl+R triggers recent files', () => {
    renderHook(() => useKeyboardShortcuts(defaultParams()));

    act(() => {
      fireKeydown('r', { ctrlKey: true });
    });

    expect(onRecentFilesOpen).toHaveBeenCalledTimes(1);
  });

  // T-KS-07: Ctrl+Tab switches to next tab
  it('T-KS-07: Ctrl+Tab switches to next tab', () => {
    renderHook(() => useKeyboardShortcuts(defaultParams()));

    act(() => {
      fireKeydown('Tab', { ctrlKey: true });
    });

    expect(setActiveTab).toHaveBeenCalledWith('tab2');
  });

  // T-KS-08: Ctrl+Shift+Tab switches to previous tab (wraps)
  it('T-KS-08: Ctrl+Shift+Tab switches to previous tab', () => {
    renderHook(() => useKeyboardShortcuts(defaultParams()));

    act(() => {
      fireKeydown('Tab', { ctrlKey: true, shiftKey: true });
    });

    expect(setActiveTab).toHaveBeenCalledWith('tab3');
  });

  // T-KS-09: cleans up event listener on unmount
  it('T-KS-09: cleans up event listener on unmount', () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener');
    const { unmount } = renderHook(() => useKeyboardShortcuts(defaultParams()));

    unmount();

    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    removeSpy.mockRestore();
  });

  // T-KS-10: Ctrl+Shift+O toggles outline panel
  it('T-KS-10: Ctrl+Shift+O toggles outline panel', () => {
    renderHook(() => useKeyboardShortcuts(defaultParams()));

    act(() => {
      fireKeydown('O', { ctrlKey: true, shiftKey: true });
    });

    expect(setOutlinePanelOpen).toHaveBeenCalled();
  });
});
