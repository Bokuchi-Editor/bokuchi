import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the Tauri fs plugin so loadThemeSrcCss can be tested without a runtime.
const readFileMock = vi.fn();
vi.mock('@tauri-apps/plugin-fs', () => ({
  readFile: (path: string) => readFileMock(path),
}));

import { extractThemeSrc, loadThemeSrcCss } from '../marpThemeLoader';

const encode = (s: string) => new TextEncoder().encode(s);

describe('extractThemeSrc', () => {
  it('extracts a relative path from front-matter', () => {
    const content = `---
marp: true
theme: company
theme-src: ./styles/common.css
---

# Slide`;
    expect(extractThemeSrc(content)).toBe('./styles/common.css');
  });

  it('strips surrounding double quotes', () => {
    const content = `---
marp: true
theme-src: "../shared/theme.css"
---
`;
    expect(extractThemeSrc(content)).toBe('../shared/theme.css');
  });

  it('strips surrounding single quotes', () => {
    const content = `---
marp: true
theme-src: '../shared/theme.css'
---
`;
    expect(extractThemeSrc(content)).toBe('../shared/theme.css');
  });

  it('returns null when the directive is absent', () => {
    const content = `---
marp: true
theme: default
---
`;
    expect(extractThemeSrc(content)).toBeNull();
  });

  it('returns null when there is no front-matter', () => {
    expect(extractThemeSrc('# Just a heading\n\ntheme-src: ./x.css')).toBeNull();
  });
});

describe('loadThemeSrcCss', () => {
  beforeEach(() => {
    readFileMock.mockReset();
  });

  it('reads the CSS file resolved relative to the markdown file', async () => {
    readFileMock.mockResolvedValue(encode('section { color: teal; }'));
    const content = `---
marp: true
theme-src: ./styles/common.css
---
`;
    const css = await loadThemeSrcCss(content, '/Users/me/slides/deck.md');
    expect(css).toBe('section { color: teal; }');
    // ./styles/common.css resolved against /Users/me/slides
    expect(readFileMock).toHaveBeenCalledWith('/Users/me/slides/styles/common.css');
  });

  it('resolves parent-directory (..) references against the markdown dir', async () => {
    readFileMock.mockResolvedValue(encode('section {}'));
    const content = `---
marp: true
theme-src: ../css/common.css
---
`;
    await loadThemeSrcCss(content, '/Users/me/slides/deck.md');
    expect(readFileMock).toHaveBeenCalledWith('/Users/me/css/common.css');
  });

  it('returns empty string and never reads when the directive is absent', async () => {
    const css = await loadThemeSrcCss('---\nmarp: true\n---\n', '/Users/me/deck.md');
    expect(css).toBe('');
    expect(readFileMock).not.toHaveBeenCalled();
  });

  it('rejects absolute URLs without reading the filesystem', async () => {
    const content = `---
marp: true
theme-src: https://example.com/theme.css
---
`;
    const css = await loadThemeSrcCss(content, '/Users/me/deck.md');
    expect(css).toBe('');
    expect(readFileMock).not.toHaveBeenCalled();
  });

  it('returns empty string when the file cannot be read', async () => {
    readFileMock.mockRejectedValue(new Error('not found'));
    const content = `---
marp: true
theme-src: ./missing.css
---
`;
    const css = await loadThemeSrcCss(content, '/Users/me/deck.md');
    expect(css).toBe('');
  });
});
