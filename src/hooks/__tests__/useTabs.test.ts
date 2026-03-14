import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useTabs } from '../useTabs';

describe('useTabs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // T-UT-01: initial state has no tabs
  it('T-UT-01: starts with empty tabs and null activeTabId', () => {
    const { result } = renderHook(() => useTabs());
    expect(result.current.tabs).toHaveLength(0);
    expect(result.current.activeTabId).toBeNull();
    expect(result.current.activeTab).toBeNull();
  });

  // T-UT-02: addTab creates a tab and sets it active
  it('T-UT-02: addTab creates a new tab and sets it as active', () => {
    const { result } = renderHook(() => useTabs());

    act(() => {
      result.current.addTab({
        title: 'Test',
        content: 'Hello',
        isModified: false,
        isNew: true,
      });
    });

    expect(result.current.tabs).toHaveLength(1);
    expect(result.current.tabs[0].title).toBe('Test');
    expect(result.current.activeTab?.title).toBe('Test');
  });

  // T-UT-03: removeTab removes the tab
  it('T-UT-03: removeTab removes the specified tab', () => {
    const { result } = renderHook(() => useTabs());

    let tabId: string;
    act(() => {
      tabId = result.current.addTab({
        title: 'ToRemove',
        content: '',
        isModified: false,
        isNew: true,
      });
    });

    act(() => {
      result.current.removeTab(tabId!);
    });

    expect(result.current.tabs).toHaveLength(0);
  });

  // T-UT-04: setActiveTab changes active tab
  it('T-UT-04: setActiveTab changes the active tab', () => {
    const { result } = renderHook(() => useTabs());

    let id1: string;
    act(() => {
      id1 = result.current.addTab({ title: 'Tab1', content: '', isModified: false, isNew: true });
    });
    act(() => {
      result.current.addTab({ title: 'Tab2', content: '', isModified: false, isNew: true });
    });
    act(() => {
      result.current.setActiveTab(id1!);
    });

    expect(result.current.activeTabId).toBe(id1!);
  });

  // T-UT-05: updateTabContent updates content
  it('T-UT-05: updateTabContent updates the tab content', () => {
    const { result } = renderHook(() => useTabs());

    let tabId: string;
    act(() => {
      tabId = result.current.addTab({ title: 'Tab', content: 'old', isModified: false, isNew: true });
    });
    act(() => {
      result.current.updateTabContent(tabId!, 'new content');
    });

    expect(result.current.tabs[0].content).toBe('new content');
  });

  // T-UT-06: setTabModified marks tab as modified
  it('T-UT-06: setTabModified sets the modified flag', () => {
    const { result } = renderHook(() => useTabs());

    let tabId: string;
    act(() => {
      tabId = result.current.addTab({ title: 'Tab', content: '', isModified: false, isNew: true });
    });
    act(() => {
      result.current.setTabModified(tabId!, true);
    });

    expect(result.current.tabs[0].isModified).toBe(true);
  });

  // T-UT-07: createNewTab creates a tab with default content
  it('T-UT-07: createNewTab creates a tab with default content', () => {
    const { result } = renderHook(() => useTabs());

    act(() => {
      result.current.createNewTab();
    });

    expect(result.current.tabs).toHaveLength(1);
    expect(result.current.tabs[0].title).toBe('Untitled');
    expect(result.current.tabs[0].content).toContain('# New Document');
  });

  // T-UT-08: openFile reads file content and creates tab
  it('T-UT-08: openFile creates a tab from a File object', async () => {
    const { result } = renderHook(() => useTabs());

    const file = new File(['# Hello World'], 'hello.md', { type: 'text/plain' });

    await act(async () => {
      await result.current.openFile(file);
    });

    expect(result.current.tabs).toHaveLength(1);
    expect(result.current.tabs[0].title).toBe('hello.md');
    expect(result.current.tabs[0].content).toBe('# Hello World');
  });

  // T-UT-09: saveTab triggers download
  it('T-UT-09: saveTab creates a download link', async () => {
    const { result } = renderHook(() => useTabs());

    let tabId: string;
    act(() => {
      tabId = result.current.addTab({
        title: 'Test',
        content: 'content',
        isModified: true,
        isNew: true,
      });
    });

    // Mock after renderHook to avoid breaking DOM
    const mockUrl = 'blob:test';
    const origCreateObjectURL = URL.createObjectURL;
    const origRevokeObjectURL = URL.revokeObjectURL;
    URL.createObjectURL = vi.fn(() => mockUrl);
    URL.revokeObjectURL = vi.fn();

    const mockAnchor = {
      href: '',
      download: '',
      click: vi.fn(),
      set textContent(_: string) {},
    };
    const origCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') return mockAnchor as unknown as HTMLAnchorElement;
      return origCreateElement(tag);
    });
    vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
    vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node);

    let saved: boolean | undefined;
    await act(async () => {
      saved = await result.current.saveTab(tabId!);
    });

    expect(saved).toBe(true);
    expect(mockAnchor.click).toHaveBeenCalled();

    // Restore
    URL.createObjectURL = origCreateObjectURL;
    URL.revokeObjectURL = origRevokeObjectURL;
    vi.restoreAllMocks();
  });

  // T-UT-10: updateTabTitle updates the title
  it('T-UT-10: updateTabTitle changes the tab title', () => {
    const { result } = renderHook(() => useTabs());

    let tabId: string;
    act(() => {
      tabId = result.current.addTab({ title: 'Old', content: '', isModified: false, isNew: true });
    });
    act(() => {
      result.current.updateTabTitle(tabId!, 'New Title');
    });

    expect(result.current.tabs[0].title).toBe('New Title');
  });
});
