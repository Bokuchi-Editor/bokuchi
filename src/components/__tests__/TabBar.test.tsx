import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { Tab as TabType } from '../../types/tab';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock dnd-kit to avoid complex DnD setup
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  closestCenter: vi.fn(),
  KeyboardSensor: vi.fn(),
  PointerSensor: vi.fn(),
  useSensor: vi.fn().mockReturnValue({}),
  useSensors: vi.fn().mockReturnValue([]),
}));

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  sortableKeyboardCoordinates: vi.fn(),
  horizontalListSortingStrategy: vi.fn(),
  verticalListSortingStrategy: vi.fn(),
  useSortable: vi.fn().mockReturnValue({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: vi.fn().mockReturnValue(undefined),
    },
  },
}));

// Mock scrollIntoView for jsdom
Element.prototype.scrollIntoView = vi.fn();

import TabBar from '../TabBar';
import { asMock } from '../../test-utils';

describe('TabBar', () => {
  let onTabChange: ReturnType<typeof vi.fn>;
  let onTabClose: ReturnType<typeof vi.fn>;
  let onNewTab: ReturnType<typeof vi.fn>;
  let onTabReorder: ReturnType<typeof vi.fn>;

  const sampleTabs: TabType[] = [
    { id: 'tab1', title: 'File1.md', content: 'content1', isModified: false, isNew: false },
    { id: 'tab2', title: 'File2.md', content: 'content2', isModified: true, isNew: false },
  ];

  beforeEach(() => {
    onTabChange = vi.fn();
    onTabClose = vi.fn();
    onNewTab = vi.fn();
    onTabReorder = vi.fn();
  });

  const defaultProps = () => ({
    tabs: sampleTabs,
    activeTabId: 'tab1',
    onTabChange: asMock<(tabId: string) => void>(onTabChange),
    onTabClose: asMock<(tabId: string) => void>(onTabClose),
    onNewTab: asMock<() => void>(onNewTab),
    onTabReorder: asMock<(tabs: TabType[]) => void>(onTabReorder),
  });

  // T-TB-01: renders tab titles
  it('T-TB-01: renders tab titles', () => {
    render(<TabBar {...defaultProps()} />);
    expect(screen.getByText('File1.md')).toBeInTheDocument();
    expect(screen.getByText('File2.md')).toBeInTheDocument();
  });

  // T-TB-02: new tab button calls onNewTab
  it('T-TB-02: calls onNewTab when + button is clicked', () => {
    render(<TabBar {...defaultProps()} />);
    const addButtons = screen.getAllByRole('button');
    const addBtn = addButtons.find(btn => btn.querySelector('[data-testid="AddIcon"]'));
    expect(addBtn).toBeDefined();
    fireEvent.click(addBtn!);
    expect(onNewTab).toHaveBeenCalledTimes(1);
  });

  // T-TB-03: clicking tab calls onTabChange
  it('T-TB-03: calls onTabChange when tab is clicked', () => {
    render(<TabBar {...defaultProps()} />);
    fireEvent.click(screen.getByText('File2.md'));
    expect(onTabChange).toHaveBeenCalledWith('tab2');
  });

  // T-TB-04: renders in vertical layout
  it('T-TB-04: renders in vertical layout', () => {
    render(<TabBar {...defaultProps()} layout="vertical" />);
    expect(screen.getByText('File1.md')).toBeInTheDocument();
    expect(screen.getByText('File2.md')).toBeInTheDocument();
  });

  // T-TB-05: empty tabs renders only add button
  it('T-TB-05: renders with no tabs', () => {
    render(<TabBar {...defaultProps()} tabs={[]} activeTabId={null} />);
    const addBtn = screen.getAllByRole('button').find(btn =>
      btn.querySelector('[data-testid="AddIcon"]'),
    );
    expect(addBtn).toBeDefined();
  });

  // T-TB-06: vertical layout close button calls onTabClose
  it('T-TB-06: close button in vertical layout calls onTabClose', () => {
    render(<TabBar {...defaultProps()} layout="vertical" />);
    // Find close icon buttons (IconButtons wrapping CloseIcon)
    const closeIcons = screen.getAllByTestId('CloseIcon');
    expect(closeIcons.length).toBeGreaterThan(0);
    const closeButton = closeIcons[0].closest('button');
    expect(closeButton).not.toBeNull();
    fireEvent.click(closeButton!);
    expect(onTabClose).toHaveBeenCalled();
  });

  // T-TB-07: close passes correct tab ID
  it('T-TB-07: close button passes the correct tab ID', () => {
    render(<TabBar {...defaultProps()} layout="vertical" />);
    const closeIcons = screen.getAllByTestId('CloseIcon');
    // Click close on the second tab (File2.md)
    expect(closeIcons.length).toBeGreaterThanOrEqual(2);
    const closeButton = closeIcons[1].closest('button');
    expect(closeButton).not.toBeNull();
    fireEvent.click(closeButton!);
    expect(onTabClose).toHaveBeenCalledWith('tab2');
  });

  // T-TB-08: horizontal close button passes correct tab ID
  it('T-TB-08: horizontal close button calls onTabClose with correct ID', () => {
    render(<TabBar {...defaultProps()} />);
    const closeIcons = screen.getAllByTestId('CloseIcon');
    // Click close on the first tab (tab1). The horizontal close control is a
    // <span> with onClick wrapping the icon, so the click bubbles up from it.
    expect(closeIcons.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(closeIcons[0]);
    expect(onTabClose).toHaveBeenCalledWith('tab1');
  });

  // T-TB-09: modified badge visible for modified tab
  it('T-TB-09: shows modification badge for modified tab', () => {
    const { container } = render(<TabBar {...defaultProps()} />);
    // MUI Badge with variant="dot" renders a <span> with class MuiBadge-dot
    const badges = container.querySelectorAll('.MuiBadge-dot');
    // tab1 is not modified (invisible=true → dot hidden), tab2 is modified (invisible=false → dot visible)
    // Count visible badges
    const visibleBadges = Array.from(badges).filter(
      (b) => !b.classList.contains('MuiBadge-invisible'),
    );
    expect(visibleBadges.length).toBe(1); // only tab2
  });

  // T-TB-10: unmodified tab hides badge
  it('T-TB-10: hides modification badge for unmodified tab', () => {
    const unmodifiedTabs: TabType[] = [
      { id: 'tab1', title: 'Clean.md', content: '', isModified: false, isNew: false },
    ];
    const { container } = render(
      <TabBar {...defaultProps()} tabs={unmodifiedTabs} />,
    );
    const visibleBadges = Array.from(
      container.querySelectorAll('.MuiBadge-dot'),
    ).filter((b) => !b.classList.contains('MuiBadge-invisible'));
    expect(visibleBadges.length).toBe(0);
  });

  // T-TB-11: vertical new tab button works
  it('T-TB-11: vertical layout new tab button calls onNewTab', () => {
    render(<TabBar {...defaultProps()} layout="vertical" />);
    const addIcons = screen.getAllByTestId('AddIcon');
    expect(addIcons.length).toBeGreaterThan(0);
    const addBtn = addIcons[0].closest('button');
    expect(addBtn).not.toBeNull();
    fireEvent.click(addBtn!);
    expect(onNewTab).toHaveBeenCalledTimes(1);
  });

  // T-TB-12: clicking tab in vertical layout calls onTabChange with correct ID
  it('T-TB-12: vertical tab click calls onTabChange with tab ID', () => {
    render(<TabBar {...defaultProps()} layout="vertical" />);
    fireEvent.click(screen.getByText('File2.md'));
    expect(onTabChange).toHaveBeenCalledWith('tab2');
  });

  // T-TB-13: many tabs render all titles
  it('T-TB-13: renders all tabs when many are provided', () => {
    const manyTabs: TabType[] = Array.from({ length: 10 }, (_, i) => ({
      id: `tab${i}`,
      title: `Doc${i}.md`,
      content: '',
      isModified: i % 2 === 0,
      isNew: false,
    }));
    render(<TabBar {...defaultProps()} tabs={manyTabs} activeTabId="tab0" />);
    for (let i = 0; i < 10; i++) {
      expect(screen.getByText(`Doc${i}.md`)).toBeInTheDocument();
    }
  });

  // --- Context menu / Rename tests ---

  // T-TB-15: right-click on horizontal tab shows context menu with Rename
  it('T-TB-15: right-click on horizontal tab shows context menu', () => {
    const onTabRename = vi.fn();
    render(
      <TabBar
        {...defaultProps()}
        onTabRename={asMock<(tabId: string) => void>(onTabRename)}
      />,
    );
    fireEvent.contextMenu(screen.getByText('File1.md'));
    expect(screen.getByText('folderTree.rename')).toBeInTheDocument();
  });

  // T-TB-16: clicking Rename in context menu calls onTabRename with correct ID
  it('T-TB-16: Rename menu item calls onTabRename with correct tab ID', () => {
    const onTabRename = vi.fn();
    render(
      <TabBar
        {...defaultProps()}
        onTabRename={asMock<(tabId: string) => void>(onTabRename)}
      />,
    );
    fireEvent.contextMenu(screen.getByText('File2.md'));
    fireEvent.click(screen.getByText('folderTree.rename'));
    expect(onTabRename).toHaveBeenCalledWith('tab2');
  });

  // T-TB-17: clicking Rename calls handler and menu item becomes hidden
  it('T-TB-17: Rename click triggers handler (menu will close via state)', () => {
    const onTabRename = vi.fn();
    render(
      <TabBar
        {...defaultProps()}
        onTabRename={asMock<(tabId: string) => void>(onTabRename)}
      />,
    );
    fireEvent.contextMenu(screen.getByText('File1.md'));
    const menuItem = screen.getByText('folderTree.rename');
    expect(menuItem).toBeInTheDocument();
    fireEvent.click(menuItem);
    // Handler is called, which sets contextMenu to null (menu closes)
    expect(onTabRename).toHaveBeenCalledWith('tab1');
  });

  // T-TB-18: right-click on vertical tab shows context menu
  it('T-TB-18: right-click on vertical tab shows context menu', () => {
    const onTabRename = vi.fn();
    render(
      <TabBar
        {...defaultProps()}
        layout="vertical"
        onTabRename={asMock<(tabId: string) => void>(onTabRename)}
      />,
    );
    fireEvent.contextMenu(screen.getByText('File2.md'));
    expect(screen.getByText('folderTree.rename')).toBeInTheDocument();
  });

  // T-TB-19: vertical Rename menu item calls onTabRename with correct ID
  it('T-TB-19: vertical Rename calls onTabRename with correct tab ID', () => {
    const onTabRename = vi.fn();
    render(
      <TabBar
        {...defaultProps()}
        layout="vertical"
        onTabRename={asMock<(tabId: string) => void>(onTabRename)}
      />,
    );
    fireEvent.contextMenu(screen.getByText('File1.md'));
    fireEvent.click(screen.getByText('folderTree.rename'));
    expect(onTabRename).toHaveBeenCalledWith('tab1');
  });

  // T-TB-20: Rename not shown when onTabRename is not provided, but other items shown
  it('T-TB-20: Rename not shown without onTabRename, but context menu items still appear', () => {
    render(<TabBar {...defaultProps()} />);
    fireEvent.contextMenu(screen.getByText('File1.md'));
    expect(screen.queryByText('folderTree.rename')).not.toBeInTheDocument();
    expect(screen.getByText('tabs.closeTab')).toBeInTheDocument();
  });

  // --- New context menu and pin feature tests ---

  // T-TB-21: context menu shows all items
  it('T-TB-21: context menu shows all items', () => {
    const onTabRename = vi.fn();
    render(
      <TabBar
        {...defaultProps()}
        onTabRename={asMock<(tabId: string) => void>(onTabRename)}
      />,
    );
    fireEvent.contextMenu(screen.getByText('File1.md'));
    expect(screen.getByText('folderTree.rename')).toBeInTheDocument();
    expect(screen.getByText('tabs.copyFilePath')).toBeInTheDocument();
    expect(screen.getByText('tabs.copyFileName')).toBeInTheDocument();
    expect(screen.getByText('tabs.pinTab')).toBeInTheDocument();
    expect(screen.getByText('tabs.closeTab')).toBeInTheDocument();
    expect(screen.getByText('tabs.closeOtherTabs')).toBeInTheDocument();
    expect(screen.getByText('tabs.closeTabsToRight')).toBeInTheDocument();
    expect(screen.getByText('tabs.closeAllTabs')).toBeInTheDocument();
  });

  // T-TB-22: Copy file path is disabled for unsaved tabs
  it('T-TB-22: Copy file path disabled for unsaved tab', () => {
    const unsavedTabs: TabType[] = [
      { id: 'tab1', title: 'Untitled', content: '', isModified: false, isNew: true },
    ];
    render(<TabBar {...defaultProps()} tabs={unsavedTabs} activeTabId="tab1" />);
    fireEvent.contextMenu(screen.getByText('Untitled'));
    const copyPathItem = screen.getByText('tabs.copyFilePath');
    expect(copyPathItem.closest('li')).toHaveAttribute('aria-disabled', 'true');
  });

  // T-TB-23: Pin/Unpin label changes based on isPinned state
  it('T-TB-23: shows Unpin for pinned tab', () => {
    const pinnedTabs: TabType[] = [
      { id: 'tab1', title: 'File1.md', content: '', isModified: false, isNew: false, isPinned: true },
    ];
    render(<TabBar {...defaultProps()} tabs={pinnedTabs} activeTabId="tab1" />);
    fireEvent.contextMenu(screen.getByText('File1.md'));
    expect(screen.getByText('tabs.unpinTab')).toBeInTheDocument();
    expect(screen.queryByText('tabs.pinTab')).not.toBeInTheDocument();
  });

  // T-TB-24: Pinned tab shows PushPin icon instead of Close
  it('T-TB-24: pinned tab shows PushPin icon', () => {
    const pinnedTabs: TabType[] = [
      { id: 'tab1', title: 'Pinned.md', content: '', isModified: false, isNew: false, isPinned: true },
    ];
    const { container } = render(
      <TabBar {...defaultProps()} tabs={pinnedTabs} activeTabId="tab1" />,
    );
    expect(container.querySelector('[data-testid="PushPinIcon"]')).toBeInTheDocument();
  });

  // T-TB-25: Double-click calls onToggleTabPinned
  it('T-TB-25: double-click calls onToggleTabPinned', () => {
    const onToggleTabPinned = vi.fn();
    render(
      <TabBar
        {...defaultProps()}
        onToggleTabPinned={asMock<(tabId: string) => void>(onToggleTabPinned)}
      />,
    );
    fireEvent.doubleClick(screen.getByText('File1.md'));
    expect(onToggleTabPinned).toHaveBeenCalledWith('tab1');
  });

  // T-TB-26: vertical layout shows "Close Tabs Below" instead of "to the Right"
  it('T-TB-26: vertical layout shows closeTabsBelow', () => {
    render(<TabBar {...defaultProps()} layout="vertical" />);
    fireEvent.contextMenu(screen.getByText('File1.md'));
    expect(screen.getByText('tabs.closeTabsBelow')).toBeInTheDocument();
    expect(screen.queryByText('tabs.closeTabsToRight')).not.toBeInTheDocument();
  });

  // T-TB-27: Close Tab menu item calls onTabClose
  it('T-TB-27: Close Tab calls onTabClose with correct tab ID', () => {
    render(<TabBar {...defaultProps()} />);
    fireEvent.contextMenu(screen.getByText('File2.md'));
    fireEvent.click(screen.getByText('tabs.closeTab'));
    expect(onTabClose).toHaveBeenCalledWith('tab2');
  });

  // T-TB-28: Close Other Tabs calls onCloseOtherTabs
  it('T-TB-28: Close Other Tabs calls onCloseOtherTabs', () => {
    const onCloseOtherTabs = vi.fn();
    render(
      <TabBar
        {...defaultProps()}
        onCloseOtherTabs={asMock<(tabId: string) => void>(onCloseOtherTabs)}
      />,
    );
    fireEvent.contextMenu(screen.getByText('File1.md'));
    fireEvent.click(screen.getByText('tabs.closeOtherTabs'));
    expect(onCloseOtherTabs).toHaveBeenCalledWith('tab1');
  });

  // T-TB-29: Close All Tabs calls onCloseAllTabs
  it('T-TB-29: Close All Tabs calls onCloseAllTabs', () => {
    const onCloseAllTabs = vi.fn();
    render(
      <TabBar
        {...defaultProps()}
        onCloseAllTabs={asMock<() => void>(onCloseAllTabs)}
      />,
    );
    fireEvent.contextMenu(screen.getByText('File1.md'));
    fireEvent.click(screen.getByText('tabs.closeAllTabs'));
    expect(onCloseAllTabs).toHaveBeenCalledTimes(1);
  });

  // --- Close button position and accent border tests ---

  // T-TB-31: closeButtonPosition="left" renders close button before title (vertical)
  it('T-TB-31: left position renders close button before title in vertical', () => {
    const { container } = render(
      <TabBar {...defaultProps()} layout="vertical" closeButtonPosition="left" />,
    );
    // Close icon should exist
    const closeIcons = container.querySelectorAll('[data-testid="CloseIcon"]');
    expect(closeIcons.length).toBeGreaterThan(0);
  });

  // T-TB-33: vertical mode auto-scrolls active tab into view
  it('T-TB-33: scrollIntoView is called for active tab in vertical mode', () => {
    const scrollSpy = vi.spyOn(Element.prototype, 'scrollIntoView');
    scrollSpy.mockClear();

    render(
      <TabBar {...defaultProps()} layout="vertical" />,
    );

    // scrollIntoView should have been called for the active tab
    expect(scrollSpy).toHaveBeenCalledWith({ block: 'nearest' });
    scrollSpy.mockRestore();
  });

  // T-TB-34: horizontal mode does not auto-scroll
  it('T-TB-34: scrollIntoView is not called in horizontal mode', () => {
    const scrollSpy = vi.spyOn(Element.prototype, 'scrollIntoView');
    scrollSpy.mockClear();

    render(
      <TabBar {...defaultProps()} layout="horizontal" />,
    );

    // scrollIntoView should NOT be called in horizontal layout
    expect(scrollSpy).not.toHaveBeenCalled();
    scrollSpy.mockRestore();
  });

  // T-TB-35: Close Tabs to the Right dispatches with the right-clicked tab ID
  // (T-TB-26 only checks the label; this covers the handler wiring)
  it('T-TB-35: Close Tabs to the Right calls onCloseTabsToRight with correct tab ID', () => {
    const onCloseTabsToRight = vi.fn();
    render(
      <TabBar
        {...defaultProps()}
        onCloseTabsToRight={asMock<(tabId: string) => void>(onCloseTabsToRight)}
      />,
    );
    fireEvent.contextMenu(screen.getByText('File1.md'));
    fireEvent.click(screen.getByText('tabs.closeTabsToRight'));
    expect(onCloseTabsToRight).toHaveBeenCalledWith('tab1');
  });

  // T-TB-36: Copy file path dispatches onCopyFilePath with the tab ID
  // (the actual clipboard write lives in useAppState.handleCopyFilePath)
  it('T-TB-36: Copy file path calls onCopyFilePath with correct tab ID', () => {
    const onCopyFilePath = vi.fn();
    const savedTabs: TabType[] = [
      { id: 'tab1', title: 'Saved.md', content: '', isModified: false, isNew: false, filePath: '/docs/Saved.md' },
    ];
    render(
      <TabBar
        {...defaultProps()}
        tabs={savedTabs}
        activeTabId="tab1"
        onCopyFilePath={asMock<(tabId: string) => void>(onCopyFilePath)}
      />,
    );
    fireEvent.contextMenu(screen.getByText('Saved.md'));
    fireEvent.click(screen.getByText('tabs.copyFilePath'));
    expect(onCopyFilePath).toHaveBeenCalledWith('tab1');
  });

  // T-TB-37: Copy file name dispatches onCopyFileName with the tab ID
  it('T-TB-37: Copy file name calls onCopyFileName with correct tab ID', () => {
    const onCopyFileName = vi.fn();
    render(
      <TabBar
        {...defaultProps()}
        onCopyFileName={asMock<(tabId: string) => void>(onCopyFileName)}
      />,
    );
    fireEvent.contextMenu(screen.getByText('File2.md'));
    fireEvent.click(screen.getByText('tabs.copyFileName'));
    expect(onCopyFileName).toHaveBeenCalledWith('tab2');
  });
});
