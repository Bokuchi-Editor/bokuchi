import { revealItemInDir } from '@tauri-apps/plugin-opener';
import { getPlatform, Platform } from './platform';

/**
 * i18n key for the "reveal in OS file manager" context-menu label.
 * Follows VSCode's per-OS naming: Finder (macOS), File Explorer (Windows),
 * and a neutral "open containing folder" elsewhere.
 */
export const getRevealMenuLabelKey = (platform: Platform = getPlatform()): string => {
  switch (platform) {
    case 'mac':
      return 'tabs.revealInFinder';
    case 'windows':
      return 'tabs.revealInFileExplorer';
    default:
      return 'tabs.openContainingFolder';
  }
};

/**
 * Show the file selected in the OS file manager (Finder / Explorer / etc.).
 * The opener plugin handles the per-OS implementation.
 */
export const revealInFileManager = (path: string): Promise<void> => {
  return revealItemInDir(path);
};
