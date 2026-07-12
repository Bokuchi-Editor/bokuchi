/**
 * Pure helpers for inserting images into a Markdown document: deciding whether a
 * dropped path is an image, computing a document-relative link, naming pasted
 * bitmaps, and building the Markdown image syntax.
 *
 * Side-effect free (no Tauri / Monaco imports) so it can be unit-tested in
 * isolation. The actual file writing lives behind `desktopApi` (Rust) and the
 * editor wiring lives in `Editor.tsx`.
 */
import { normalizeFilePath } from './pathUtils';

/** Subfolder (relative to the document) where written/copied images are stored. */
export const IMAGE_SUBDIR = 'images';

/** Image file extensions recognized for drag & drop insertion. */
export const IMAGE_EXTENSIONS = new Set([
  'png',
  'jpg',
  'jpeg',
  'gif',
  'svg',
  'webp',
  'bmp',
  'ico',
  'avif',
]);

/** Whether a file path points at a supported image (by extension). */
export function isImageFilePath(path: string): boolean {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  return IMAGE_EXTENSIONS.has(ext);
}

/** Map a clipboard image MIME type (e.g. "image/png") to a file extension. */
export function imageExtFromMime(mime: string): string {
  const sub = mime.split('/')[1]?.toLowerCase() ?? '';
  if (sub === 'jpeg') return 'jpg';
  if (sub === 'svg+xml') return 'svg';
  if (sub === 'x-icon' || sub === 'vnd.microsoft.icon') return 'ico';
  return sub || 'png';
}

/** Zero-pad a number to two digits. */
function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/**
 * Build a timestamped file name for a pasted bitmap that has no source name,
 * e.g. `image-20260706-153000.png`. The date is passed in for testability.
 */
export function generatePastedImageName(date: Date, ext: string): string {
  const stamp =
    `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}` +
    `-${pad2(date.getHours())}${pad2(date.getMinutes())}${pad2(date.getSeconds())}`;
  return `image-${stamp}.${ext}`;
}

/**
 * If `targetPath` lives inside the document's own folder (`docDir`), return the
 * document-relative, forward-slashed path (never containing `..`). Returns null
 * when the target is outside `docDir`, signalling that the caller should copy it
 * into the image subfolder instead.
 *
 * The prefix comparison is case-insensitive because Windows (NTFS) and macOS
 * (default APFS/HFS+) treat paths case-insensitively.
 */
export function relativeImagePath(docDir: string, targetPath: string): string | null {
  const base = normalizeFilePath(docDir).replace(/\/+$/, '');
  const target = normalizeFilePath(targetPath);
  const prefix = base + '/';
  if (target.toLowerCase().startsWith(prefix.toLowerCase())) {
    return target.slice(prefix.length);
  }
  return null;
}

/** The directory portion of a document's file path (forward-slashed, no trailing slash). */
export function documentDir(filePath: string): string {
  const normalized = normalizeFilePath(filePath);
  const idx = normalized.lastIndexOf('/');
  return idx >= 0 ? normalized.slice(0, idx) : '';
}

/**
 * Build Markdown image syntax for a link path. Paths containing characters that
 * would break `![](...)` (spaces or parentheses) are wrapped in angle brackets,
 * which CommonMark allows for link destinations.
 */
export function buildImageMarkdown(linkPath: string, alt = ''): string {
  const needsWrap = /[ ()]/.test(linkPath);
  const dest = needsWrap ? `<${linkPath}>` : linkPath;
  return `![${alt}](${dest})`;
}
