/**
 * ドラッグ&ドロップ機能の設定
 */
export const dragConfig = {
  // ドラッグ開始の閾値（ピクセル）
  // この距離以上マウスを動かした場合のみドラッグ開始
  dragThreshold: 8,

  // ドラッグ開始までの待機時間（ミリ秒）
  // この時間内に閾値を超えた場合のみドラッグ開始
  dragDelay: 150,
} as const;

export type DragConfig = typeof dragConfig;
