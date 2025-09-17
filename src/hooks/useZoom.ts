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

  // 保存されたズーム設定を読み込み
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

  // ズームイン（拡大）
  const zoomIn = useCallback(() => {
    const newZoom = Math.min(currentZoom + config.zoomStep, config.maxZoom);
    if (newZoom === config.maxZoom && currentZoom < config.maxZoom) {
      setIsAtLimit(true);
      setTimeout(() => setIsAtLimit(false), 2000); // 2秒後に警告を消す
    }
    setCurrentZoom(newZoom);

    // ズーム設定を保存
    storeApi.saveZoomLevel(newZoom).catch(error => {
      console.warn('Failed to save zoom level:', error);
    });
  }, [currentZoom, config.maxZoom, config.zoomStep]);

  // ズームアウト（縮小）
  const zoomOut = useCallback(() => {
    const newZoom = Math.max(currentZoom - config.zoomStep, config.minZoom);
    if (newZoom === config.minZoom && currentZoom > config.minZoom) {
      setIsAtLimit(true);
      setTimeout(() => setIsAtLimit(false), 2000); // 2秒後に警告を消す
    }
    setCurrentZoom(newZoom);

    // ズーム設定を保存
    storeApi.saveZoomLevel(newZoom).catch(error => {
      console.warn('Failed to save zoom level:', error);
    });
  }, [currentZoom, config.minZoom, config.zoomStep]);

  // デフォルトサイズに戻す
  const resetZoom = useCallback(() => {
    setCurrentZoom(config.defaultZoom);
    setIsAtLimit(false);

    // ズーム設定を保存
    storeApi.saveZoomLevel(config.defaultZoom).catch(error => {
      console.warn('Failed to save zoom level:', error);
    });
  }, [config.defaultZoom]);

  // キーボードショートカットの処理
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {

      // macOS: Cmd + キー、Windows/Linux: Ctrl + キー
      if (event.metaKey || event.ctrlKey) {

                // JIS配列キーボードに対応した拡張キー判定
        // JIS配列では、;キーが+の入力に使用される
        const isZoomInKey = event.key === '=' || event.key === '+' ||
                           event.code === 'Equal' || event.code === 'Plus' ||
                           (event.code === 'Semicolon' && event.shiftKey); // JIS配列の+キー

        const isZoomOutKey = event.key === '-' || event.code === 'Minus';
        const isResetKey = event.key === '0' || event.code === 'Digit0';

        if (isZoomInKey) {
          // 拡大: Cmd + Shift + + または Cmd + = または JIS配列の+キー
          if (event.shiftKey || event.key === '=' || event.key === '+' ||
              (event.code === 'Semicolon' && event.shiftKey)) {
            event.preventDefault();
            event.stopPropagation();
            zoomIn();
          }
        } else if (isZoomOutKey) {
          // 縮小: Cmd + - (Shift不要)
          if (!event.shiftKey) {
            event.preventDefault();
            event.stopPropagation();
            zoomOut();
          }
        } else if (isResetKey) {
          // リセット: Cmd + 0 (Shift不要)
          if (!event.shiftKey) {
            event.preventDefault();
            event.stopPropagation();
            resetZoom();
          }
        }
      }
    };

    // キャプチャフェーズでイベントを処理（優先度を上げる）
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [zoomIn, zoomOut, resetZoom]);

  // ズームレベルをパーセンテージで取得
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
