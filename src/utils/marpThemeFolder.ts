import { readFile } from '@tauri-apps/plugin-fs';
import { desktopApi } from '../api/desktopApi';

/**
 * Custom Marp theme folder support.
 *
 * A user-configured folder (rendering.marpThemeFolder) holds `.css` files. Each
 * file carrying an `@theme name` header comment is a registered Marp theme that
 * slides can select with the standard `theme:` front-matter directive — the
 * same model as the VS Code Marp extension's `markdown.marp.themes` setting.
 *
 * Scanning is explicit (folder change / manual reload), not a filesystem watch,
 * so editing a theme CSS file requires a reload to take effect.
 */

export interface LoadedTheme {
  /** File name (e.g. "company.css"). */
  file: string;
  /** Theme name from the `@theme` header, or null when the file lacks one. */
  name: string | null;
  /** Raw CSS text. */
  css: string;
}

/**
 * Extract the theme name declared by a `@theme` comment, or null if absent.
 * Marp requires the name to be declared inside a CSS block comment.
 */
export function extractThemeName(css: string): string | null {
  const match = /\/\*[^]*?@theme\s+([A-Za-z0-9_-]+)[^]*?\*\//.exec(css);
  return match ? match[1] : null;
}

/**
 * Scan a folder for Marp theme CSS files and read their contents.
 * Returns one entry per `.css` file (including files missing an `@theme`
 * header, with name=null, so the settings UI can flag them). Returns an empty
 * array when the path is empty or unreadable.
 */
export async function scanThemeFolder(folderPath: string): Promise<LoadedTheme[]> {
  if (!folderPath) return [];

  // Pass showAllFiles=true: the backend otherwise restricts results to .md/.txt
  // (folder-tree behaviour). We list everything and filter to .css here.
  const entries = await desktopApi.readDirectory(folderPath, true);
  const cssFiles = entries.filter(
    (e) => !e.is_directory && e.name.toLowerCase().endsWith('.css'),
  );

  const themes = await Promise.all(
    cssFiles.map(async (entry): Promise<LoadedTheme | null> => {
      try {
        const css = new TextDecoder('utf-8').decode(await readFile(entry.path));
        return { file: entry.name, name: extractThemeName(css), css };
      } catch (err) {
        console.error('[MarpPreview] Failed to read theme CSS:', entry.path, err);
        return null;
      }
    }),
  );

  return themes.filter((t): t is LoadedTheme => t !== null);
}

/**
 * Scan a folder and return only the CSS strings of files that declare an
 * `@theme` name — i.e. the ones Marp can actually register. Convenience wrapper
 * for the render path, which has no use for invalid files.
 */
export async function loadRegisterableThemeCss(folderPath: string): Promise<string[]> {
  const themes = await scanThemeFolder(folderPath);
  return themes.filter((t) => t.name !== null).map((t) => t.css);
}
