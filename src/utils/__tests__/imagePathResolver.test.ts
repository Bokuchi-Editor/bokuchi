import { describe, it, expect } from 'vitest';
import {
  IMAGE_MIME_MAP,
  isAbsoluteUrl,
  mimeTypeFromPath,
  resolveRelativePath,
  dirnameOf,
} from '../imagePathResolver';

describe('isAbsoluteUrl', () => {
  it('returns true for http, https, data, and blob URLs', () => {
    expect(isAbsoluteUrl('http://example.com/a.png')).toBe(true);
    expect(isAbsoluteUrl('https://example.com/a.png')).toBe(true);
    expect(isAbsoluteUrl('data:image/png;base64,AAAA')).toBe(true);
    expect(isAbsoluteUrl('blob:http://localhost/x')).toBe(true);
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
});

describe('dirnameOf', () => {
  it('returns the directory portion of a file path', () => {
    expect(dirnameOf('/home/user/docs/file.md')).toBe('/home/user/docs');
  });

  it('returns empty string for a path without slashes', () => {
    expect(dirnameOf('file.md')).toBe('');
  });
});
