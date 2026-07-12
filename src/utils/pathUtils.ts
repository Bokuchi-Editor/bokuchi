import { Tab } from '../types/tab';
import { getPlatform } from './platform';

/**
 * Normalize file path by replacing backslashes with forward slashes.
 */
export const normalizeFilePath = (filePath: string): string => {
  return filePath.replace(/\\/g, '/');
};

/**
 * Format a file path for display using the current OS's native separator.
 * Windows displays with backslashes; macOS/Linux with forward slashes.
 * This guards against paths that were stored on a different OS.
 */
export const formatFilePathForDisplay = (filePath: string): string => {
  if (getPlatform() === 'windows') {
    return filePath.replace(/\//g, '\\');
  }
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
 *
 * Comparison is case-insensitive: Windows (NTFS) and macOS (default APFS/HFS+)
 * treat file paths case-insensitively, and an OS-level file association may
 * deliver a differently-cased path than the one stored when the user first
 * opened the file via File > Open.
 */
export const checkDuplicateFileInTabs = (filePath: string, tabs: Tab[]): Tab | null => {
  const normalizedPath = normalizeFilePath(filePath).toLowerCase();
  return tabs.find(tab => {
    if (!tab.filePath) return false;
    const normalizedExistingPath = normalizeFilePath(tab.filePath).toLowerCase();
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

const UNTITLED_TAB_TITLE_MAX_LENGTH = 20;

/**
 * Get the display title for a tab.
 * For unsaved (new) tabs, derives the title from the first line of content.
 * Falls back to 'Untitled' if content is empty.
 */
export const getTabDisplayTitle = (tab: Tab): string => {
  if (!tab.isNew) {
    return tab.title;
  }

  const firstLine = tab.content.split('\n')[0]?.trim();
  if (!firstLine) {
    return 'Untitled';
  }

  // Truncate by code points, not UTF-16 units: String#slice can cut an
  // emoji's surrogate pair in half and leave a broken glyph before the
  // ellipsis.
  const chars = Array.from(firstLine);
  if (chars.length > UNTITLED_TAB_TITLE_MAX_LENGTH) {
    return chars.slice(0, UNTITLED_TAB_TITLE_MAX_LENGTH).join('') + '…';
  }

  return firstLine;
};
