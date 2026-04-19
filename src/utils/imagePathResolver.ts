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
    src.startsWith('blob:')
  );
}

/** Look up the MIME type for a file path's extension. */
export function mimeTypeFromPath(src: string): string {
  const ext = src.split('.').pop()?.toLowerCase() || '';
  return IMAGE_MIME_MAP[ext] || DEFAULT_MIME;
}

/** Resolve a relative path against a base directory path, collapsing . and .. segments. */
export function resolveRelativePath(baseDirPath: string, relativePath: string): string {
  const parts = (baseDirPath + '/' + relativePath).split('/').filter(Boolean);
  const resolved: string[] = [];
  for (const part of parts) {
    if (part === '.') continue;
    if (part === '..') {
      resolved.pop();
    } else {
      resolved.push(part);
    }
  }
  return '/' + resolved.join('/');
}

/** Extract the directory portion of a file path (no trailing slash). */
export function dirnameOf(filePath: string): string {
  return filePath.substring(0, filePath.lastIndexOf('/'));
}
