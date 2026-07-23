/** Shared layout constants for panels and sidebars. */

/** Default width of the left sidebar (vertical tabs / folder tree / merged). */
export const SIDEBAR_WIDTH_PX = 280;

/** Minimum user-resizable width of the vertical-tab sidebar. */
export const SIDEBAR_WIDTH_MIN_PX = 180;

/** Maximum user-resizable width of the vertical-tab sidebar. */
export const SIDEBAR_WIDTH_MAX_PX = 480;

/**
 * Dragging the sidebar's right edge narrower than this unpins the sidebar
 * (switches to the hover/auto-hide overlay), Arc-style. Between this and
 * SIDEBAR_WIDTH_MIN_PX the width just clamps to the minimum.
 */
export const SIDEBAR_COLLAPSE_THRESHOLD_PX = 120;

/** Clamp a sidebar width to the user-resizable bounds. */
export const clampSidebarWidth = (width: number): number => {
  if (!Number.isFinite(width)) return SIDEBAR_WIDTH_PX;
  return Math.min(SIDEBAR_WIDTH_MAX_PX, Math.max(SIDEBAR_WIDTH_MIN_PX, width));
};

/** Divider thickness between the resizable sidebar sections. */
export const SIDEBAR_DIVIDER_HEIGHT_PX = 4;

/** Width of the outline and folder-tree drawer overlays. */
export const DRAWER_WIDTH_PX = 280;

/** Delay used to wait for a layout settle before focusing Monaco or dispatching resize. */
export const LAYOUT_SETTLE_DELAY_MS = 50;
