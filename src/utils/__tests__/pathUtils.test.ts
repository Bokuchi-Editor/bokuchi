import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  normalizeFilePath,
  extractFileNameFromPath,
  extractFolderNameFromPath,
  checkDuplicateFileInTabs,
  isMarkdownFile,
  getTabDisplayTitle,
  formatFilePathForDisplay,
  deriveExportFileName,
} from '../pathUtils';
import * as platform from '../platform';
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

  // T-PU-13b: case-insensitive match (Windows / macOS default volumes)
  it('T-PU-13b: finds duplicate with different letter case', () => {
    const result = checkDuplicateFileInTabs('/DOCS/File1.MD', tabs);
    expect(result).not.toBeNull();
    expect(result!.id).toBe('t1');
  });

  // T-PU-13c: case-insensitive match with Windows-style path
  it('T-PU-13c: finds duplicate combining case and separator differences', () => {
    const mixedTabs: Tab[] = [
      { id: 't3', title: 'Doc.md', content: '', isModified: false, isNew: false, filePath: 'C:/Users/Foo/Doc.md' },
    ];
    const result = checkDuplicateFileInTabs('c:\\users\\foo\\doc.md', mixedTabs);
    expect(result).not.toBeNull();
    expect(result!.id).toBe('t3');
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

describe('formatFilePathForDisplay', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // T-PU-29: Windows displays with backslashes
  it('T-PU-29: converts forward slashes to backslashes on Windows', () => {
    vi.spyOn(platform, 'getPlatform').mockReturnValue('windows');
    expect(formatFilePathForDisplay('C:/Users/foo/file.md')).toBe('C:\\Users\\foo\\file.md');
  });

  // T-PU-30: Windows leaves backslash paths unchanged
  it('T-PU-30: keeps native backslash paths unchanged on Windows', () => {
    vi.spyOn(platform, 'getPlatform').mockReturnValue('windows');
    expect(formatFilePathForDisplay('C:\\Users\\foo\\file.md')).toBe('C:\\Users\\foo\\file.md');
  });

  // T-PU-31: macOS displays with forward slashes
  it('T-PU-31: converts backslashes to forward slashes on macOS', () => {
    vi.spyOn(platform, 'getPlatform').mockReturnValue('mac');
    expect(formatFilePathForDisplay('\\Users\\foo\\file.md')).toBe('/Users/foo/file.md');
  });

  // T-PU-32: macOS leaves native forward-slash paths unchanged
  it('T-PU-32: keeps native forward-slash paths unchanged on macOS', () => {
    vi.spyOn(platform, 'getPlatform').mockReturnValue('mac');
    expect(formatFilePathForDisplay('/Users/foo/file.md')).toBe('/Users/foo/file.md');
  });

  // T-PU-33: Linux behaves like macOS
  it('T-PU-33: uses forward slashes on Linux', () => {
    vi.spyOn(platform, 'getPlatform').mockReturnValue('linux');
    expect(formatFilePathForDisplay('/home/user/file.md')).toBe('/home/user/file.md');
  });
});

describe('getTabDisplayTitle', () => {
  const makeTab = (overrides: Partial<Tab>): Tab => ({
    id: 'test',
    title: 'Untitled',
    content: '',
    isModified: false,
    isNew: true,
    ...overrides,
  });

  // T-PU-23
  it('T-PU-23: returns file title for saved tabs', () => {
    const tab = makeTab({ isNew: false, title: 'readme.md', content: '# Hello' });
    expect(getTabDisplayTitle(tab)).toBe('readme.md');
  });

  // T-PU-24
  it('T-PU-24: returns first line of content for new tabs', () => {
    const tab = makeTab({ content: '# What\'s New\n\n- item1' });
    expect(getTabDisplayTitle(tab)).toBe('# What\'s New');
  });

  // T-PU-25
  it('T-PU-25: returns Untitled for new tabs with empty content', () => {
    const tab = makeTab({ content: '' });
    expect(getTabDisplayTitle(tab)).toBe('Untitled');
  });

  // T-PU-26
  it('T-PU-26: truncates long first lines to 20 characters', () => {
    const tab = makeTab({ content: 'This is a very long first line that should be truncated' });
    const result = getTabDisplayTitle(tab);
    expect(result).toBe('This is a very long …');
    expect(result.length).toBe(21); // 20 chars + ellipsis
  });

  // T-PU-27
  it('T-PU-27: returns Untitled when first line is whitespace only', () => {
    const tab = makeTab({ content: '   \n\nsome content' });
    expect(getTabDisplayTitle(tab)).toBe('Untitled');
  });

  // T-PU-28
  it('T-PU-28: does not truncate exactly 20 character lines', () => {
    const tab = makeTab({ content: '12345678901234567890' }); // exactly 20 chars
    expect(getTabDisplayTitle(tab)).toBe('12345678901234567890');
  });

  // T-PU-34: truncation counts code points, so an emoji (surrogate pair) is
  // never cut in half. A UTF-16 slice(0, 20) would end the title on a lone
  // high surrogate (a broken glyph) before the ellipsis.
  it('T-PU-34: does not split surrogate pairs when truncating', () => {
    const tab = makeTab({ content: 'a' + '😀'.repeat(25) }); // 26 code points
    const result = getTabDisplayTitle(tab);
    expect(result).toBe('a' + '😀'.repeat(19) + '…'); // 20 code points + ellipsis
    // No unpaired high surrogate anywhere in the title.
    expect(result).not.toMatch(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/);
  });

  // T-PU-35: CJK titles truncate at 20 characters like Latin ones (CJK chars
  // are single code units, so behavior is unchanged by the code-point fix)
  it('T-PU-35: truncates long CJK first lines to 20 characters', () => {
    const tab = makeTab({ content: 'あ'.repeat(25) });
    expect(getTabDisplayTitle(tab)).toBe('あ'.repeat(20) + '…');
  });
});

// #442: export dialogs default to the source document's name.
describe('deriveExportFileName', () => {
  // T-PU-36
  it('T-PU-36: replaces .md with the target extension', () => {
    expect(deriveExportFileName('/home/user/notes.md', 'pdf')).toBe('notes.pdf');
    expect(deriveExportFileName('/home/user/notes.md', 'html')).toBe('notes.html');
  });

  // T-PU-37
  it('T-PU-37: replaces .markdown with the target extension', () => {
    expect(deriveExportFileName('/docs/guide.markdown', 'pdf')).toBe('guide.pdf');
    expect(deriveExportFileName('/docs/guide.markdown', 'html')).toBe('guide.html');
  });

  // T-PU-38: only the trailing markdown extension is swapped; inner dots
  // are part of the document name and must survive.
  it('T-PU-38: keeps inner dots and swaps only the trailing extension', () => {
    expect(deriveExportFileName('/docs/release.notes.v2.md', 'pdf')).toBe('release.notes.v2.pdf');
  });

  // T-PU-39
  it('T-PU-39: preserves non-ASCII file names', () => {
    expect(deriveExportFileName('/docs/議事録メモ.md', 'pdf')).toBe('議事録メモ.pdf');
    expect(deriveExportFileName('/docs/議事録メモ.md', 'html')).toBe('議事録メモ.html');
  });

  // T-PU-40: unsaved documents keep the legacy fixed name.
  it('T-PU-40: falls back to the fixed name when there is no file path', () => {
    expect(deriveExportFileName(undefined, 'pdf')).toBe('markdown-export.pdf');
    expect(deriveExportFileName(undefined, 'html')).toBe('markdown-export.html');
  });

  // T-PU-41: markdown extensions match case-insensitively (Windows/macOS
  // file systems are case-insensitive, so README.MD is a markdown file).
  it('T-PU-41: matches the markdown extension case-insensitively', () => {
    expect(deriveExportFileName('/docs/README.MD', 'pdf')).toBe('README.pdf');
    expect(deriveExportFileName('/docs/Guide.Markdown', 'html')).toBe('Guide.html');
  });

  // T-PU-42: a non-markdown extension is not swallowed — appending keeps
  // the source name intact instead of guessing at its extension.
  it('T-PU-42: appends the target extension to non-markdown file names', () => {
    expect(deriveExportFileName('/docs/notes.txt', 'pdf')).toBe('notes.txt.pdf');
  });

  // T-PU-43
  it('T-PU-43: handles Windows-style paths', () => {
    expect(deriveExportFileName('C:\\Users\\docs\\notes.md', 'pdf')).toBe('notes.pdf');
  });
});
