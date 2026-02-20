import { ZoomConfig } from '../hooks/useZoom';

// Zoom configuration based on CSS font size
export const ZOOM_CONFIG: ZoomConfig = {
  minZoom: 0.5,      // Min 50%
  maxZoom: 3.0,      // Max 300%
  defaultZoom: 1.0,  // Default 100%
  zoomStep: 0.1,     // Step 10%
};

// Display labels for zoom levels
export const ZOOM_LABELS = {
  min: '50%',
  max: '300%',
  default: '100%',
  step: '10%',
};
