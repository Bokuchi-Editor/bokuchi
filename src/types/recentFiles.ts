export interface RecentFile {
  id: string;
  filePath: string;
  fileName: string;
  lastOpened: number; // timestamp
  openCount: number;
  lastModified?: number; // File last modified time
  fileSize?: number;
  preview?: string; // First few lines of the file (for preview)
}

export interface RecentFilesSettings {
  maxRecentFiles: number; // Maximum number of files to keep (default: 20)
  showPreview: boolean; // Whether to show preview
  previewLength: number; // Preview character count (default: 100)
}

export const DEFAULT_RECENT_FILES_SETTINGS: RecentFilesSettings = {
  maxRecentFiles: 20,
  showPreview: true,
  previewLength: 100,
};
