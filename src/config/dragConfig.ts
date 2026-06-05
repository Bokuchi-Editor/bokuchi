/**
 * Drag & drop configuration
 */
export const dragConfig = {
  // Drag start threshold (pixels)
  // Dragging only starts when the mouse moves beyond this distance
  dragThreshold: 8,
} as const;

export type DragConfig = typeof dragConfig;
