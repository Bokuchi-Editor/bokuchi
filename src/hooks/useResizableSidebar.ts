import React, { useCallback, useRef, useState } from 'react';
import { clampSidebarWidth, SIDEBAR_COLLAPSE_THRESHOLD_PX } from '../constants/layout';

/**
 * Layout constraints for the merged "open editors + explorer" sidebar.
 * Exported for tests and for consumers that need to respect the same bounds.
 */
export const RESIZABLE_SIDEBAR = {
  initialTopSectionHeightPx: 200,
  minTopSectionHeightPx: 80,
  /** Reserved height at the bottom for explorer header + divider (~40 + 4 + slack). */
  reservedBottomHeightPx: 48,
  /** Reserved height when expanding the top section after a collapse. */
  expandReservedBottomHeightPx: 120,
};

interface UseResizableSidebarResult {
  sidebarRef: React.RefObject<HTMLDivElement | null>;
  topSectionHeight: number;
  bottomCollapsed: boolean;
  isDragging: boolean;
  toggleBottomCollapsed: () => void;
  handleDividerMouseDown: (event: React.MouseEvent) => void;
}

/**
 * Encapsulates the resizable divider between two sidebar sections
 * (e.g. vertical tab list and folder tree panel).
 *
 * The bottom section can be collapsed by clicking its header; the top
 * section's previous height is remembered and restored on expand.
 */
export function useResizableSidebar(): UseResizableSidebarResult {
  const [topSectionHeight, setTopSectionHeight] = useState(RESIZABLE_SIDEBAR.initialTopSectionHeightPx);
  const [bottomCollapsed, setBottomCollapsed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const heightBeforeCollapseRef = useRef(0);
  const isDraggingRef = useRef(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const toggleBottomCollapsed = useCallback(() => {
    if (bottomCollapsed) {
      // Restore the previous height (or the initial default) clamped to available space.
      const restoreHeight = heightBeforeCollapseRef.current || RESIZABLE_SIDEBAR.initialTopSectionHeightPx;
      if (sidebarRef.current) {
        const maxHeight = sidebarRef.current.getBoundingClientRect().height - RESIZABLE_SIDEBAR.expandReservedBottomHeightPx;
        setTopSectionHeight(Math.min(restoreHeight, maxHeight));
      } else {
        setTopSectionHeight(restoreHeight);
      }
      setBottomCollapsed(false);
      return;
    }
    // Save current height, then collapse the bottom section (header stays visible).
    heightBeforeCollapseRef.current = topSectionHeight;
    if (sidebarRef.current) {
      const totalHeight = sidebarRef.current.getBoundingClientRect().height;
      setTopSectionHeight(totalHeight - RESIZABLE_SIDEBAR.reservedBottomHeightPx);
    }
    setBottomCollapsed(true);
  }, [bottomCollapsed, topSectionHeight]);

  const handleDividerMouseDown = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    isDraggingRef.current = true;
    setIsDragging(true);

    const onMouseMove = (ev: MouseEvent) => {
      if (!isDraggingRef.current || !sidebarRef.current) return;
      const sidebarRect = sidebarRef.current.getBoundingClientRect();
      const newHeight = ev.clientY - sidebarRect.top;
      const maxHeight = sidebarRect.height - RESIZABLE_SIDEBAR.reservedBottomHeightPx;
      const clamped = Math.max(RESIZABLE_SIDEBAR.minTopSectionHeightPx, Math.min(maxHeight, newHeight));
      setTopSectionHeight(clamped);
      setBottomCollapsed(false);
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
      setIsDragging(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, []);

  return {
    sidebarRef,
    topSectionHeight,
    bottomCollapsed,
    isDragging,
    toggleBottomCollapsed,
    handleDividerMouseDown,
  };
}

interface UseSidebarWidthDragParams {
  /** Current sidebar width (px); the drag computes deltas from this value. */
  width: number;
  /** Live width updates during the drag, already clamped to [MIN, MAX]. */
  onWidthChange: (width: number) => void;
  /**
   * Fired once when the drag crosses SIDEBAR_COLLAPSE_THRESHOLD_PX: the drag
   * ends and the caller is expected to unpin the sidebar (hover/auto-hide).
   * The width state keeps its last valid (>= MIN) value so re-pinning restores it.
   */
  onCollapse: () => void;
}

interface UseSidebarWidthDragResult {
  isResizingWidth: boolean;
  handleWidthResizeMouseDown: (event: React.MouseEvent) => void;
}

/**
 * Horizontal drag on the vertical-tab sidebar's right edge (Arc-style):
 * free resize between the min/max bounds, collapse (unpin) below the threshold.
 */
export function useSidebarWidthDrag({ width, onWidthChange, onCollapse }: UseSidebarWidthDragParams): UseSidebarWidthDragResult {
  const [isResizingWidth, setIsResizingWidth] = useState(false);

  const handleWidthResizeMouseDown = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = width;
    setIsResizingWidth(true);

    const cleanup = () => {
      setIsResizingWidth(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    const onMouseMove = (ev: MouseEvent) => {
      const rawWidth = startWidth + (ev.clientX - startX);
      if (rawWidth < SIDEBAR_COLLAPSE_THRESHOLD_PX) {
        cleanup();
        onCollapse();
        return;
      }
      onWidthChange(clampSidebarWidth(rawWidth));
    };

    const onMouseUp = () => cleanup();

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [width, onWidthChange, onCollapse]);

  return { isResizingWidth, handleWidthResizeMouseDown };
}
