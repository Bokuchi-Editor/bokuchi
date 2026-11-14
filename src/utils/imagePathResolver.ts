/**
 * Shared helpers for resolving relative image paths in rendered preview HTML.
 * Used by both MarpPreview (iframe data URLs) and Preview (blob URLs).
 */

/** MIME types for supported image extensions. */
export const IMAGE_MIME_MAP: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  webp: 'image/webp',
  bmp: 'image/bmp',
  ico: 'image/x-icon',
  avif: 'image/avif',
};

const DEFAULT_MIME = 'application/octet-stream';

/** Check if a URL is absolute (http, https, data, blob). */
export function isAbsoluteUrl(src: string): boolean {
  return (
    src.startsWith('http://') ||
    src.startsWith('https://') ||
    src.startsWith('data:') ||
    src.startsWith('blob:') ||
    src.startsWith('asset:')
  );
}

/** Strip a trailing `?query` and/or `#fragment` from a path (#623). */
export function stripQueryAndFragment(path: string): string {
  return path.split(/[?#]/)[0];
}

/** Look up the MIME type for a file path's extension (query/fragment-aware, #623). */
export function mimeTypeFromPath(src: string): string {
  const ext = stripQueryAndFragment(src).split('.').pop()?.toLowerCase() || '';
  return IMAGE_MIME_MAP[ext] || DEFAULT_MIME;
}

/**
 * Decode a URL-encoded `<img src>` for filesystem lookup. The Markdown renderer
 * (marked) percent-encodes spaces and non-ASCII characters in image URLs (e.g.
 * `my photo.png` becomes `my%20photo.png`), but the file on disk has the literal
 * characters — so the raw src must be decoded before it is turned into a path or
 * fetched. Falls back to the raw string when the input is not valid percent-
 * encoding (e.g. a stray `%`).
 */
export function decodeImageSrc(src: string): string {
  try {
    return decodeURIComponent(src);
  } catch {
    return src;
  }
}

/** True for a Windows drive-letter path (`C:/...` or `C:\...`), forward-slashed or not. */
function isWindowsDrivePath(path: string): boolean {
  return /^[A-Za-z]:[/\\]/.test(path);
}

/**
 * Resolve a relative path against a base directory path, collapsing . and ..
 * segments (either separator is accepted and normalized to `/`). A POSIX base
 * gets a leading `/`; a Windows drive-letter base (`C:/Users/...`) does not,
 * since `/C:/Users/...` is not a valid Windows path and fails file reads with
 * OS error 123 (#623).
 */
export function resolveRelativePath(baseDirPath: string, relativePath: string): string {
  const parts = (baseDirPath + '/' + relativePath).replace(/\\/g, '/').split('/').filter(Boolean);
  const resolved: string[] = [];
  for (const part of parts) {
    if (part === '.') continue;
    if (part === '..') {
      resolved.pop();
    } else {
      resolved.push(part);
    }
  }
  const root = isWindowsDrivePath(baseDirPath) ? '' : '/';
  return root + resolved.join('/');
}

/**
 * Extract the directory portion of a file path (no trailing slash). Callers
 * normalize `\` to `/` first, but this also recognizes a literal backslash as
 * a defense-in-depth fallback for an un-normalized Windows path (#623).
 */
export function dirnameOf(filePath: string): string {
  const lastSep = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
  return filePath.substring(0, lastSep);
}
