/**
 * Drag & drop configuration
 */
export const dragConfig = {
  // Drag start threshold (pixels)
  // Dragging only starts when the mouse moves beyond this distance
  dragThreshold: 8,

  // Drag start delay (milliseconds)
  // Dragging only starts if the threshold is exceeded within this time
  dragDelay: 150,
} as const;

export type DragConfig = typeof dragConfig;
