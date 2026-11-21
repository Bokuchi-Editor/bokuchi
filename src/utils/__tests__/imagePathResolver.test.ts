import { describe, it, expect, vi, beforeEach } from 'vitest';

const homeDirMock = vi.fn();
const desktopDirMock = vi.fn();
const documentDirMock = vi.fn();
const downloadDirMock = vi.fn();
vi.mock('@tauri-apps/api/path', () => ({
  homeDir: () => homeDirMock(),
  desktopDir: () => desktopDirMock(),
  documentDir: () => documentDirMock(),
  downloadDir: () => downloadDirMock(),
}));

import {
  IMAGE_MIME_MAP,
  isAbsoluteUrl,
  mimeTypeFromPath,
  resolveRelativePath,
  dirnameOf,
  decodeImageSrc,
  stripQueryAndFragment,
  bytesToDataUri,
} from '../imagePathResolver';

describe('isAbsoluteUrl', () => {
  it('returns true for http, https, data, and blob URLs', () => {
    expect(isAbsoluteUrl('http://example.com/a.png')).toBe(true);
    expect(isAbsoluteUrl('https://example.com/a.png')).toBe(true);
    expect(isAbsoluteUrl('data:image/png;base64,AAAA')).toBe(true);
    expect(isAbsoluteUrl('blob:http://localhost/x')).toBe(true);
  });

  it('returns true for asset protocol URLs (already-rewritten srcs must not be re-resolved)', () => {
    expect(isAbsoluteUrl('asset://localhost/%2FUsers%2Fme%2Fpic.png')).toBe(true);
  });

  it('returns false for relative paths', () => {
    expect(isAbsoluteUrl('./img.png')).toBe(false);
    expect(isAbsoluteUrl('../images/x.png')).toBe(false);
    expect(isAbsoluteUrl('img.png')).toBe(false);
  });
});

describe('mimeTypeFromPath', () => {
  it('maps known extensions to their MIME types', () => {
    expect(mimeTypeFromPath('pic.png')).toBe('image/png');
    expect(mimeTypeFromPath('pic.jpg')).toBe('image/jpeg');
    expect(mimeTypeFromPath('pic.jpeg')).toBe('image/jpeg');
    expect(mimeTypeFromPath('pic.SVG')).toBe('image/svg+xml');
  });

  it('falls back to application/octet-stream for unknown extensions', () => {
    expect(mimeTypeFromPath('file.xyz')).toBe('application/octet-stream');
    expect(mimeTypeFromPath('noext')).toBe('application/octet-stream');
  });

  it('exposes the full MIME map', () => {
    expect(IMAGE_MIME_MAP.webp).toBe('image/webp');
    expect(IMAGE_MIME_MAP.avif).toBe('image/avif');
  });

  // #623: a query string must not defeat SVG's strict image/svg+xml MIME
  // requirement (unlike raster formats, it fails to render as octet-stream).
  it('strips a trailing ?query or #fragment before resolving the extension', () => {
    expect(mimeTypeFromPath('diagram.svg?v=1')).toBe('image/svg+xml');
    expect(mimeTypeFromPath('sprite.svg#icon')).toBe('image/svg+xml');
    expect(mimeTypeFromPath('pic.png?x=1#y')).toBe('image/png');
  });
});

describe('stripQueryAndFragment', () => {
  it('removes a trailing ?query', () => {
    expect(stripQueryAndFragment('icon.svg?v=1')).toBe('icon.svg');
  });

  it('removes a trailing #fragment', () => {
    expect(stripQueryAndFragment('sprite.svg#layer')).toBe('sprite.svg');
  });

  it('removes both when a query precedes a fragment', () => {
    expect(stripQueryAndFragment('icon.svg?v=1#layer')).toBe('icon.svg');
  });

  it('leaves a path without either unchanged', () => {
    expect(stripQueryAndFragment('images/pic.png')).toBe('images/pic.png');
  });
});

describe('resolveRelativePath', () => {
  it('resolves ./ as the base directory', () => {
    expect(resolveRelativePath('/home/user/docs', './img.png')).toBe('/home/user/docs/img.png');
  });

  it('resolves ../ to parent directory', () => {
    expect(resolveRelativePath('/home/user/docs', '../img.png')).toBe('/home/user/img.png');
  });

  it('resolves multiple parent traversals', () => {
    expect(resolveRelativePath('/a/b/c', '../../img.png')).toBe('/a/img.png');
  });

  it('handles plain relative paths without prefix', () => {
    expect(resolveRelativePath('/a/b', 'img.png')).toBe('/a/b/img.png');
  });

  // #623: a leading "/" before a Windows drive letter (e.g. "/C:/Users/...")
  // is not a valid Windows path and fails file reads with OS error 123.
  it('does not prepend a leading slash for a Windows drive-letter base path', () => {
    expect(resolveRelativePath('C:/Users/me/docs', './img.png')).toBe('C:/Users/me/docs/img.png');
    expect(resolveRelativePath('C:/Users/me/docs', '../img.png')).toBe('C:/Users/me/img.png');
  });

  it('recognizes a Windows drive-letter base path given with backslashes', () => {
    expect(resolveRelativePath('C:\\Users\\me\\docs', 'img.png')).toBe('C:/Users/me/docs/img.png');
  });
});

describe('dirnameOf', () => {
  it('returns the directory portion of a file path', () => {
    expect(dirnameOf('/home/user/docs/file.md')).toBe('/home/user/docs');
  });

  it('returns empty string for a path without slashes', () => {
    expect(dirnameOf('file.md')).toBe('');
  });

  // #623: a Windows path that reached this function before normalization
  // (backslash-separated) must still resolve its directory.
  it('recognizes a backslash-separated Windows path', () => {
    expect(dirnameOf('C:\\Users\\me\\docs\\file.md')).toBe('C:\\Users\\me\\docs');
  });

  it('picks the later separator in a mixed-separator path', () => {
    expect(dirnameOf('C:/Users\\me/docs\\file.md')).toBe('C:/Users\\me/docs');
  });
});

describe('decodeImageSrc', () => {
  it('decodes percent-encoded spaces (marked output for "my photo.png")', () => {
    expect(decodeImageSrc('images/my%20photo.png')).toBe('images/my photo.png');
  });

  it('decodes percent-encoded non-ASCII (e.g. Japanese screenshot names)', () => {
    const encoded = 'images/' + encodeURIComponent('スクリーンショット 2026-07-06.png');
    expect(decodeImageSrc(encoded)).toBe('images/スクリーンショット 2026-07-06.png');
  });

  it('leaves already-decoded paths unchanged', () => {
    expect(decodeImageSrc('images/test.png')).toBe('images/test.png');
  });

  it('falls back to the raw string on malformed encoding', () => {
    expect(decodeImageSrc('images/50%off.png')).toBe('images/50%off.png');
  });
});

describe('bytesToDataUri', () => {
  it('base64-encodes bytes and wraps them in a data: URI with the given MIME type', () => {
    const bytes = new TextEncoder().encode('abc') as Uint8Array<ArrayBuffer>;
    expect(bytesToDataUri(bytes, 'image/svg+xml')).toBe(`data:image/svg+xml;base64,${btoa('abc')}`);
  });
});

// isPathInDefaultFsScope caches the resolved scope directories at module
// scope (loaded once, reused for the module's lifetime), so each test here
// resets the module registry and re-imports to get an isolated cache.
describe('isPathInDefaultFsScope', () => {
  beforeEach(() => {
    vi.resetModules();
    homeDirMock.mockReset();
    desktopDirMock.mockReset();
    documentDirMock.mockReset();
    downloadDirMock.mockReset();
  });

  const mockScopeDirs = () => {
    homeDirMock.mockResolvedValue('/Users/me');
    desktopDirMock.mockResolvedValue('/Users/me/Desktop');
    documentDirMock.mockResolvedValue('/Users/me/Documents');
    downloadDirMock.mockResolvedValue('/Users/me/Downloads');
  };

  it('resolves true for a path under the home directory', async () => {
    mockScopeDirs();
    const { isPathInDefaultFsScope: check } = await import('../imagePathResolver');
    expect(await check('/Users/me/deck/pic.png')).toBe(true);
  });

  it('resolves false for a path outside all four scope roots', async () => {
    mockScopeDirs();
    const { isPathInDefaultFsScope: check } = await import('../imagePathResolver');
    expect(await check('/Volumes/external/pic.png')).toBe(false);
  });

  it('is case-insensitive and tolerates backslashes (Windows)', async () => {
    homeDirMock.mockResolvedValue('C:/Users/me');
    desktopDirMock.mockResolvedValue('C:/Users/me/Desktop');
    documentDirMock.mockResolvedValue('C:/Users/me/Documents');
    downloadDirMock.mockResolvedValue('C:/Users/me/Downloads');
    const { isPathInDefaultFsScope: check } = await import('../imagePathResolver');
    expect(await check('C:\\Users\\ME\\deck\\pic.png')).toBe(true);
  });

  it('resolves false (prefer the fallback) when the scope dirs cannot be resolved', async () => {
    homeDirMock.mockRejectedValue(new Error('unavailable'));
    desktopDirMock.mockResolvedValue('/Users/me/Desktop');
    documentDirMock.mockResolvedValue('/Users/me/Documents');
    downloadDirMock.mockResolvedValue('/Users/me/Downloads');
    const { isPathInDefaultFsScope: check } = await import('../imagePathResolver');
    expect(await check('/Users/me/deck/pic.png')).toBe(false);
  });
});
