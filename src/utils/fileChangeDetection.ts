import { desktopApi } from '../api/desktopApi';
import { Tab } from '../types/tab';

/**
 * Detect file changes (hash comparison)
 * @param tab The tab to check
 * @returns Whether the file has been changed
 */
export async function detectFileChange(tab: Tab): Promise<boolean> {
  // Skip change detection for new files (isNew: true)
  if (tab.isNew || !tab.filePath) {
    return false;
  }

  // Treat as unchanged if no file hash info is available
  if (!tab.fileHashInfo) {
    console.warn('No file hash info available for tab:', tab.id);
    return false;
  }

  try {
    // Get current file hash
    const currentHashInfo = await desktopApi.getFileHash(tab.filePath);

    // Incremental checks
    // 1. File size check (fast)
    if (currentHashInfo.file_size !== tab.fileHashInfo.file_size) {
      return true;
    }

    // 2. Last modified time check (fast)
    if (currentHashInfo.modified_time !== tab.fileHashInfo.modified_time) {
      return true;
    }

    // 3. Hash value check (only when needed)
    if (currentHashInfo.hash !== tab.fileHashInfo.hash) {
      return true;
    }

    // No changes
    return false;
  } catch (error) {
    console.error('Failed to detect file change:', error);
    // Treat as unchanged on error
    return false;
  }
}

/**
 * Detect file changes and prompt the user for confirmation if needed
 * @param tab The tab to check
 * @param onReload Callback when reloading
 * @param onCancel Callback when cancelled
 * @returns Whether a reload was performed
 */
export async function checkFileChangeAndReload(
  tab: Tab,
  onReload: (newContent: string) => void,
  onCancel: () => void
): Promise<boolean> {
  const hasChanged = await detectFileChange(tab);

  if (!hasChanged) {
    return false;
  }

  // If file has changed, prompt user for confirmation
  const shouldReload = await showFileChangeDialog(tab.title || 'Untitled');

  if (shouldReload) {
    try {
      // Reload file
      const newContent = await desktopApi.readFileFromPath(tab.filePath!);
      onReload(newContent);
      return true;
    } catch (error) {
      console.error('Failed to reload file:', error);
      onCancel();
      return false;
    }
  } else {
    onCancel();
    return false;
  }
}

/**
 * Show file change confirmation dialog
 * @param fileName The file name
 * @returns Whether to reload
 */
async function showFileChangeDialog(fileName: string): Promise<boolean> {
  return new Promise((resolve) => {
    // Fire custom dialog event
    const event = new CustomEvent('fileChangeDetected', {
      detail: {
        fileName,
        onReload: () => resolve(true),
        onCancel: () => resolve(false),
      },
    });

    window.dispatchEvent(event);
  });
}

/**
 * Detect file changes for multiple tabs at once
 * @param tabs Array of tabs to check
 * @returns Array of changed tab IDs
 */
export async function detectMultipleFileChanges(tabs: Tab[]): Promise<string[]> {
  const changedTabs: string[] = [];

  const promises = tabs.map(async (tab) => {
    if (await detectFileChange(tab)) {
      changedTabs.push(tab.id);
    }
  });

  await Promise.all(promises);
  return changedTabs;
}

