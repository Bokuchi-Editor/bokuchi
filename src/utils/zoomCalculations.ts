/**
 * Calculate the new zoom level when zooming in.
 * Clamps to maxZoom.
 */
export function calculateZoomIn(currentZoom: number, step: number, maxZoom: number): number {
  return Math.min(currentZoom + step, maxZoom);
}

/**
 * Calculate the new zoom level when zooming out.
 * Clamps to minZoom.
 */
export function calculateZoomOut(currentZoom: number, step: number, minZoom: number): number {
  return Math.max(currentZoom - step, minZoom);
}

/**
 * Determine if the zoom operation just hit the limit.
 */
export function isHittingMaxLimit(currentZoom: number, newZoom: number, maxZoom: number): boolean {
  return newZoom === maxZoom && currentZoom < maxZoom;
}

export function isHittingMinLimit(currentZoom: number, newZoom: number, minZoom: number): boolean {
  return newZoom === minZoom && currentZoom > minZoom;
}

/**
 * Convert zoom factor to percentage.
 */
export function zoomToPercentage(zoom: number): number {
  return Math.round(zoom * 100);
}
