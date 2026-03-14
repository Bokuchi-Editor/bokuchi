import { Tab } from '../types/tab';

/**
 * Normalize file path by replacing backslashes with forward slashes.
 */
export const normalizeFilePath = (filePath: string): string => {
  return filePath.replace(/\\/g, '/');
};

/**
 * Extract file name from a file path (handles both / and \ separators).
 */
export const extractFileNameFromPath = (filePath: string): string => {
  return filePath.split('/').pop()?.split('\\').pop() || 'Untitled';
};

/**
 * Extract folder name from a folder path.
 */
export const extractFolderNameFromPath = (folderPath: string | null): string | null => {
  return folderPath ? (folderPath.split('/').pop() || folderPath) : null;
};

/**
 * Check if a file with the given path already exists in the tabs list.
 * Returns the matching tab or null.
 */
export const checkDuplicateFileInTabs = (filePath: string, tabs: Tab[]): Tab | null => {
  const normalizedPath = normalizeFilePath(filePath);
  return tabs.find(tab => {
    if (!tab.filePath) return false;
    const normalizedExistingPath = normalizeFilePath(tab.filePath);
    return normalizedExistingPath === normalizedPath;
  }) || null;
};

/**
 * Check if a file name indicates a markdown file.
 */
export const isMarkdownFile = (fileName: string): boolean => {
  const lowerName = fileName.toLowerCase();
  return lowerName.endsWith('.md') || lowerName.endsWith('.markdown');
};
