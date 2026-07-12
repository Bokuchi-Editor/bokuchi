import { describe, it, expect } from 'vitest';
import { isSupportedDocumentFile } from '../fileDropFilters';

describe('isSupportedDocumentFile', () => {
  it('accepts markdown and text extensions', () => {
    expect(isSupportedDocumentFile('/a/b/note.md')).toBe(true);
    expect(isSupportedDocumentFile('/a/b/note.markdown')).toBe(true);
    expect(isSupportedDocumentFile('/a/b/note.txt')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isSupportedDocumentFile('README.MD')).toBe(true);
    expect(isSupportedDocumentFile('Notes.TXT')).toBe(true);
  });

  it('rejects other file types', () => {
    expect(isSupportedDocumentFile('/a/b/image.png')).toBe(false);
    expect(isSupportedDocumentFile('/a/b/doc.pdf')).toBe(false);
    expect(isSupportedDocumentFile('/a/b/noext')).toBe(false);
  });
});
