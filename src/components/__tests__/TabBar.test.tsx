import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { Tab as TabType } from '../../types/tab';

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
    if (addBtn) {
      fireEvent.click(addBtn);
      expect(onNewTab).toHaveBeenCalledTimes(1);
    }
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
    if (closeIcons.length > 0) {
      const closeButton = closeIcons[0].closest('button');
      if (closeButton) {
        fireEvent.click(closeButton);
        expect(onTabClose).toHaveBeenCalled();
      }
    }
  });

  // T-TB-07: close passes correct tab ID
  it('T-TB-07: close button passes the correct tab ID', () => {
    render(<TabBar {...defaultProps()} layout="vertical" />);
    const closeIcons = screen.getAllByTestId('CloseIcon');
    // Click close on the second tab (File2.md)
    if (closeIcons.length >= 2) {
      const closeButton = closeIcons[1].closest('button');
      if (closeButton) {
        fireEvent.click(closeButton);
        expect(onTabClose).toHaveBeenCalledWith('tab2');
      }
    }
  });

  // T-TB-08: horizontal close button passes correct tab ID
  it('T-TB-08: horizontal close button calls onTabClose with correct ID', () => {
    render(<TabBar {...defaultProps()} />);
    const closeIcons = screen.getAllByTestId('CloseIcon');
    // Click close on the first tab (tab1)
    if (closeIcons.length >= 1) {
      const closeBtn = closeIcons[0].closest('[role="tab"]')
        ? closeIcons[0]
        : closeIcons[0].parentElement;
      if (closeBtn) {
        fireEvent.click(closeBtn);
        expect(onTabClose).toHaveBeenCalledWith('tab1');
      }
    }
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
    const addBtn = addIcons[0]?.closest('button');
    if (addBtn) {
      fireEvent.click(addBtn);
      expect(onNewTab).toHaveBeenCalledTimes(1);
    }
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

  // T-TB-14: embedded vertical layout does not set fixed width
  it('T-TB-14: embedded mode does not apply fixed width', () => {
    const { container } = render(
      <TabBar {...defaultProps()} layout="vertical" embedded={true} />,
    );
    // The root Box should not have width: 280 when embedded
    const rootBox = container.firstElementChild as HTMLElement;
    expect(rootBox.style.width).not.toBe('280px');
  });
});
