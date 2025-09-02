import { ZoomConfig } from '../hooks/useZoom';

// 現在のCSSのフォントサイズを基準としたズーム設定
export const ZOOM_CONFIG: ZoomConfig = {
  minZoom: 0.5,      // 最小50%
  maxZoom: 3.0,      // 最大300%
  defaultZoom: 1.0,  // デフォルト100%
  zoomStep: 0.1,     // 1ステップ10%
};

// ズームレベルの表示用ラベル
export const ZOOM_LABELS = {
  min: '50%',
  max: '300%',
  default: '100%',
  step: '10%',
};
