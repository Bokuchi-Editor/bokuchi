import { describe, it, expect } from 'vitest';
import {
  normalizeFilePath,
  extractFileNameFromPath,
  extractFolderNameFromPath,
  checkDuplicateFileInTabs,
  isMarkdownFile,
} from '../pathUtils';
import type { Tab } from '../../types/tab';

describe('normalizeFilePath', () => {
  // T-PU-01
  it('T-PU-01: replaces backslashes with forward slashes', () => {
    expect(normalizeFilePath('C:\\Users\\docs\\file.md')).toBe('C:/Users/docs/file.md');
  });

  // T-PU-02
  it('T-PU-02: leaves forward slashes unchanged', () => {
    expect(normalizeFilePath('/home/user/file.md')).toBe('/home/user/file.md');
  });

  // T-PU-03
  it('T-PU-03: handles mixed separators', () => {
    expect(normalizeFilePath('C:/Users\\docs/file.md')).toBe('C:/Users/docs/file.md');
  });
});

describe('extractFileNameFromPath', () => {
  // T-PU-04
  it('T-PU-04: extracts file name from Unix path', () => {
    expect(extractFileNameFromPath('/home/user/docs/readme.md')).toBe('readme.md');
  });

  // T-PU-05
  it('T-PU-05: extracts file name from Windows path', () => {
    expect(extractFileNameFromPath('C:\\Users\\docs\\readme.md')).toBe('readme.md');
  });

  // T-PU-06
  it('T-PU-06: returns Untitled for empty string', () => {
    expect(extractFileNameFromPath('')).toBe('Untitled');
  });
});

describe('extractFolderNameFromPath', () => {
  // T-PU-07
  it('T-PU-07: extracts folder name from path', () => {
    expect(extractFolderNameFromPath('/home/user/project')).toBe('project');
  });

  // T-PU-08
  it('T-PU-08: returns null for null input', () => {
    expect(extractFolderNameFromPath(null)).toBeNull();
  });

  // T-PU-09
  it('T-PU-09: returns the path itself if no separator', () => {
    expect(extractFolderNameFromPath('project')).toBe('project');
  });
});

describe('checkDuplicateFileInTabs', () => {
  const tabs: Tab[] = [
    { id: 't1', title: 'File1.md', content: '', isModified: false, isNew: false, filePath: '/docs/file1.md' },
    { id: 't2', title: 'File2.md', content: '', isModified: false, isNew: true },
  ];

  // T-PU-10
  it('T-PU-10: finds duplicate by exact path', () => {
    const result = checkDuplicateFileInTabs('/docs/file1.md', tabs);
    expect(result).not.toBeNull();
    expect(result!.id).toBe('t1');
  });

  // T-PU-11
  it('T-PU-11: finds duplicate with different path separators', () => {
    const result = checkDuplicateFileInTabs('\\docs\\file1.md', tabs);
    expect(result).not.toBeNull();
    expect(result!.id).toBe('t1');
  });

  // T-PU-12
  it('T-PU-12: returns null when no duplicate', () => {
    expect(checkDuplicateFileInTabs('/docs/other.md', tabs)).toBeNull();
  });

  // T-PU-13
  it('T-PU-13: skips tabs without filePath', () => {
    expect(checkDuplicateFileInTabs('/docs/file2.md', tabs)).toBeNull();
  });
});

describe('normalizeFilePath - edge cases', () => {
  // T-PU-18: UNC paths
  it('T-PU-18: normalizes UNC paths', () => {
    expect(normalizeFilePath('\\\\server\\share\\file.md')).toBe('//server/share/file.md');
  });

  // T-PU-19: relative paths pass through with normalization
  it('T-PU-19: normalizes relative paths with backslashes', () => {
    expect(normalizeFilePath('.\\docs\\file.md')).toBe('./docs/file.md');
    expect(normalizeFilePath('..\\file.md')).toBe('../file.md');
  });
});

describe('extractFolderNameFromPath - edge cases', () => {
  // T-PU-20: trailing slash falls back to full path (pop() returns '' which is falsy)
  it('T-PU-20: returns full path for path with trailing slash', () => {
    const result = extractFolderNameFromPath('/home/user/');
    expect(result).toBe('/home/user/');
  });
});

describe('isMarkdownFile', () => {
  // T-PU-14
  it('T-PU-14: returns true for .md files', () => {
    expect(isMarkdownFile('readme.md')).toBe(true);
  });

  // T-PU-15
  it('T-PU-15: returns true for .markdown files', () => {
    expect(isMarkdownFile('notes.markdown')).toBe(true);
  });

  // T-PU-16
  it('T-PU-16: returns true case-insensitively', () => {
    expect(isMarkdownFile('README.MD')).toBe(true);
  });

  // T-PU-17
  it('T-PU-17: returns false for non-markdown files', () => {
    expect(isMarkdownFile('script.js')).toBe(false);
    expect(isMarkdownFile('style.css')).toBe(false);
  });

  // T-PU-21: multiple extensions ending in .md
  it('T-PU-21: returns true for files with multiple extensions ending in .md', () => {
    expect(isMarkdownFile('file.test.md')).toBe(true);
    expect(isMarkdownFile('docs.backup.markdown')).toBe(true);
  });

  // T-PU-22: .md-like but not .md
  it('T-PU-22: returns false for similar but non-markdown extensions', () => {
    expect(isMarkdownFile('file.mdx')).toBe(false);
    expect(isMarkdownFile('file.mdown')).toBe(false);
  });
});
