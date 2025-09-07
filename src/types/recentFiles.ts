export interface RecentFile {
  id: string;
  filePath: string;
  fileName: string;
  lastOpened: number; // timestamp
  openCount: number;
  lastModified?: number; // ファイルの最終更新時刻
  fileSize?: number;
  preview?: string; // ファイルの最初の数行（プレビュー用）
}

export interface RecentFilesSettings {
  maxRecentFiles: number; // 保持する最大ファイル数（デフォルト: 20）
  showPreview: boolean; // プレビュー表示の有無
  previewLength: number; // プレビューの文字数（デフォルト: 100）
}

export const DEFAULT_RECENT_FILES_SETTINGS: RecentFilesSettings = {
  maxRecentFiles: 20,
  showPreview: true,
  previewLength: 100,
};
