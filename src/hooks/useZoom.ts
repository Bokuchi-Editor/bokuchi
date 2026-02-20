import { useState, useEffect, useCallback } from 'react';
import { storeApi } from '../api/storeApi';

export interface ZoomConfig {
  minZoom: number;
  maxZoom: number;
  defaultZoom: number;
  zoomStep: number;
}

export const useZoom = (config: ZoomConfig) => {
  const [currentZoom, setCurrentZoom] = useState(config.defaultZoom);
  const [isAtLimit, setIsAtLimit] = useState(false);

  // Load saved zoom level
  useEffect(() => {
    const loadSavedZoom = async () => {
      try {
        const savedZoom = await storeApi.loadZoomLevel();
        if (savedZoom >= config.minZoom && savedZoom <= config.maxZoom) {
          setCurrentZoom(savedZoom);
        }
      } catch (error) {
        console.warn('Failed to load saved zoom level:', error);
      }
    };
    loadSavedZoom();
  }, [config.minZoom, config.maxZoom]);

  // Zoom in
  const zoomIn = useCallback(() => {
    const newZoom = Math.min(currentZoom + config.zoomStep, config.maxZoom);
    if (newZoom === config.maxZoom && currentZoom < config.maxZoom) {
      setIsAtLimit(true);
      setTimeout(() => setIsAtLimit(false), 2000); // Clear warning after 2 seconds
    }
    setCurrentZoom(newZoom);

    // Save zoom level
    storeApi.saveZoomLevel(newZoom).catch(error => {
      console.warn('Failed to save zoom level:', error);
    });
  }, [currentZoom, config.maxZoom, config.zoomStep]);

  // Zoom out
  const zoomOut = useCallback(() => {
    const newZoom = Math.max(currentZoom - config.zoomStep, config.minZoom);
    if (newZoom === config.minZoom && currentZoom > config.minZoom) {
      setIsAtLimit(true);
      setTimeout(() => setIsAtLimit(false), 2000); // Clear warning after 2 seconds
    }
    setCurrentZoom(newZoom);

    // Save zoom level
    storeApi.saveZoomLevel(newZoom).catch(error => {
      console.warn('Failed to save zoom level:', error);
    });
  }, [currentZoom, config.minZoom, config.zoomStep]);

  // Reset to default size
  const resetZoom = useCallback(() => {
    setCurrentZoom(config.defaultZoom);
    setIsAtLimit(false);

    // Save zoom level
    storeApi.saveZoomLevel(config.defaultZoom).catch(error => {
      console.warn('Failed to save zoom level:', error);
    });
  }, [config.defaultZoom]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {

      // macOS: Cmd + key, Windows/Linux: Ctrl + key
      if (event.metaKey || event.ctrlKey) {

                // Extended key detection for JIS keyboard layout
        // On JIS layout, semicolon key is used for +
        const isZoomInKey = event.key === '=' || event.key === '+' ||
                           event.code === 'Equal' || event.code === 'Plus' ||
                           (event.code === 'Semicolon' && event.shiftKey); // + key on JIS layout

        const isZoomOutKey = event.key === '-' || event.code === 'Minus';
        const isResetKey = event.key === '0' || event.code === 'Digit0';

        if (isZoomInKey) {
          // Zoom in: Cmd + Shift + + or Cmd + = or JIS layout + key
          if (event.shiftKey || event.key === '=' || event.key === '+' ||
              (event.code === 'Semicolon' && event.shiftKey)) {
            event.preventDefault();
            event.stopPropagation();
            zoomIn();
          }
        } else if (isZoomOutKey) {
          // Zoom out: Cmd + - (no Shift needed)
          if (!event.shiftKey) {
            event.preventDefault();
            event.stopPropagation();
            zoomOut();
          }
        } else if (isResetKey) {
          // Reset: Cmd + 0 (no Shift needed)
          if (!event.shiftKey) {
            event.preventDefault();
            event.stopPropagation();
            resetZoom();
          }
        }
      }
    };

    // Process events in capture phase (higher priority)
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [zoomIn, zoomOut, resetZoom]);

  // Get zoom level as percentage
  const zoomPercentage = Math.round(currentZoom * 100);

  return {
    currentZoom,
    zoomPercentage,
    isAtLimit,
    zoomIn,
    zoomOut,
    resetZoom,
    canZoomIn: currentZoom < config.maxZoom,
    canZoomOut: currentZoom > config.minZoom,
  };
};
