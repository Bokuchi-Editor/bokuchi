import { describe, it, expect } from 'vitest';
import {
  isImageFilePath,
  imageExtFromMime,
  generatePastedImageName,
  relativeImagePath,
  documentDir,
  buildImageMarkdown,
} from '../imageInsertion';

describe('imageInsertion', () => {
  describe('isImageFilePath', () => {
    it('T-II-01: recognizes common image extensions (case-insensitive)', () => {
      expect(isImageFilePath('/a/b/photo.PNG')).toBe(true);
      expect(isImageFilePath('c:/x/y.jpeg')).toBe(true);
      expect(isImageFilePath('logo.svg')).toBe(true);
    });

    it('T-II-02: rejects non-images', () => {
      expect(isImageFilePath('/a/notes.md')).toBe(false);
      expect(isImageFilePath('/a/archive.zip')).toBe(false);
      expect(isImageFilePath('/a/noext')).toBe(false);
    });
  });

  describe('imageExtFromMime', () => {
    it('T-II-03: maps MIME types to extensions', () => {
      expect(imageExtFromMime('image/png')).toBe('png');
      expect(imageExtFromMime('image/jpeg')).toBe('jpg');
      expect(imageExtFromMime('image/svg+xml')).toBe('svg');
      expect(imageExtFromMime('image/x-icon')).toBe('ico');
    });

    it('T-II-04: falls back to png for unknown MIME', () => {
      expect(imageExtFromMime('image/')).toBe('png');
    });
  });

  describe('generatePastedImageName', () => {
    it('T-II-05: builds a zero-padded timestamped name', () => {
      const d = new Date(2026, 6, 6, 15, 30, 0); // 2026-07-06 15:30:00 (month is 0-based)
      expect(generatePastedImageName(d, 'png')).toBe('image-20260706-153000.png');
    });

    it('T-II-06: pads single-digit fields', () => {
      const d = new Date(2026, 0, 2, 3, 4, 5);
      expect(generatePastedImageName(d, 'jpg')).toBe('image-20260102-030405.jpg');
    });
  });

  describe('documentDir', () => {
    it('T-II-07: returns the parent folder, normalized', () => {
      expect(documentDir('/Users/me/docs/note.md')).toBe('/Users/me/docs');
      expect(documentDir('C:\\Users\\me\\note.md')).toBe('C:/Users/me');
    });
  });

  describe('relativeImagePath', () => {
    it('T-II-08: computes a relative path for a file under the doc folder', () => {
      expect(relativeImagePath('/Users/me/docs', '/Users/me/docs/img/a.png')).toBe('img/a.png');
      expect(relativeImagePath('/Users/me/docs', '/Users/me/docs/a.png')).toBe('a.png');
    });

    it('T-II-09: is case-insensitive on the base prefix', () => {
      expect(relativeImagePath('/Users/Me/Docs', '/users/me/docs/img/a.png')).toBe('img/a.png');
    });

    it('T-II-10: returns null when the file is outside the doc folder', () => {
      expect(relativeImagePath('/Users/me/docs', '/Users/me/pictures/a.png')).toBeNull();
      // A sibling folder is outside — must be copied, not referenced in place.
      expect(relativeImagePath('/Users/me/docs', '/Users/me/docsX/a.png')).toBeNull();
    });

    it('T-II-11: handles Windows-style separators', () => {
      expect(relativeImagePath('C:\\Users\\me\\docs', 'C:\\Users\\me\\docs\\img\\a.png')).toBe('img/a.png');
    });
  });

  describe('buildImageMarkdown', () => {
    it('T-II-12: builds plain syntax for simple paths', () => {
      expect(buildImageMarkdown('images/a.png')).toBe('![](images/a.png)');
    });

    it('T-II-13: wraps paths with spaces or parens in angle brackets', () => {
      expect(buildImageMarkdown('images/my photo.png')).toBe('![](<images/my photo.png>)');
      expect(buildImageMarkdown('images/shot(1).png')).toBe('![](<images/shot(1).png>)');
    });

    it('T-II-14: includes alt text when provided', () => {
      expect(buildImageMarkdown('images/a.png', 'diagram')).toBe('![diagram](images/a.png)');
    });
  });
});
