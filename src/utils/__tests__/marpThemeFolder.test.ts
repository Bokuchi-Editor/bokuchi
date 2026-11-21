import { describe, it, expect, vi, beforeEach } from 'vitest';

const readFileMock = vi.fn();
const readDirectoryMock = vi.fn();
const readFileBytesMock = vi.fn();

vi.mock('@tauri-apps/plugin-fs', () => ({
  readFile: (path: string) => readFileMock(path),
}));
vi.mock('../../api/desktopApi', () => ({
  desktopApi: {
    readDirectory: (path: string, showAll: boolean) => readDirectoryMock(path, showAll),
    readFileBytes: (path: string) => readFileBytesMock(path),
  },
}));
// Fixed scope root so the "/themes" fixture paths used below resolve as
// in-scope (exercising the default plugin-fs readFile path). A path outside
// this root exercises the out-of-scope fallback (#623).
vi.mock('@tauri-apps/api/path', () => ({
  homeDir: vi.fn().mockResolvedValue('/themes'),
  desktopDir: vi.fn().mockResolvedValue('/themes/Desktop'),
  documentDir: vi.fn().mockResolvedValue('/themes/Documents'),
  downloadDir: vi.fn().mockResolvedValue('/themes/Downloads'),
}));

import { extractThemeName, scanThemeFolder, loadRegisterableThemeCss } from '../marpThemeFolder';

const encode = (s: string) => new TextEncoder().encode(s);
const dirEntry = (name: string, is_directory = false) => ({
  name,
  path: `/themes/${name}`,
  is_directory,
});

describe('extractThemeName', () => {
  it('reads the name from an @theme comment', () => {
    expect(extractThemeName('/* @theme company */\nsection {}')).toBe('company');
  });

  it('accepts hyphens and underscores in names', () => {
    expect(extractThemeName('/*\n @theme my-cool_theme \n*/')).toBe('my-cool_theme');
  });

  it('returns null when no @theme header is present', () => {
    expect(extractThemeName('section { color: red; }')).toBeNull();
  });
});

describe('scanThemeFolder', () => {
  beforeEach(() => {
    readFileMock.mockReset();
    readDirectoryMock.mockReset();
    readFileBytesMock.mockReset();
  });

  it('returns an empty array for an empty folder path without touching the fs', async () => {
    const result = await scanThemeFolder('');
    expect(result).toEqual([]);
    expect(readDirectoryMock).not.toHaveBeenCalled();
  });

  it('reads only .css files and parses their theme names', async () => {
    readDirectoryMock.mockResolvedValue([
      dirEntry('company.css'),
      dirEntry('notes.txt'),
      dirEntry('subdir', true),
    ]);
    readFileMock.mockResolvedValue(encode('/* @theme company */'));

    const result = await scanThemeFolder('/themes');
    expect(result).toEqual([{ file: 'company.css', name: 'company', css: '/* @theme company */' }]);
    expect(readFileMock).toHaveBeenCalledTimes(1);
    expect(readFileMock).toHaveBeenCalledWith('/themes/company.css');
    // Must list ALL files (showAllFiles=true): the backend otherwise returns
    // only .md/.txt, which would hide every .css theme.
    expect(readDirectoryMock).toHaveBeenCalledWith('/themes', true);
  });

  it('includes css files without an @theme header (name=null) for the UI to flag', async () => {
    readDirectoryMock.mockResolvedValue([dirEntry('a.css'), dirEntry('b.css')]);
    readFileMock
      .mockResolvedValueOnce(encode('/* @theme alpha */'))
      .mockResolvedValueOnce(encode('section {}'));

    const result = await scanThemeFolder('/themes');
    expect(result.find((t) => t.file === 'b.css')?.name).toBeNull();
  });

  // Contract pin: an unlistable folder (deleted/renamed after being
  // configured) REJECTS rather than resolving [] — callers own the fallback
  // and both current ones catch to "no custom themes". If this changes to a
  // silent [], the settings UI could no longer distinguish "folder gone"
  // from "folder empty".
  it('rejects when the folder itself cannot be listed', async () => {
    readDirectoryMock.mockRejectedValue(new Error('no such directory'));
    await expect(scanThemeFolder('/gone')).rejects.toThrow('no such directory');
  });

  it('skips files that fail to read', async () => {
    readDirectoryMock.mockResolvedValue([dirEntry('ok.css'), dirEntry('bad.css')]);
    readFileMock
      .mockResolvedValueOnce(encode('/* @theme ok */'))
      .mockRejectedValueOnce(new Error('boom'));

    const result = await scanThemeFolder('/themes');
    expect(result).toHaveLength(1);
    expect(result[0].file).toBe('ok.css');
  });

  // #623: a theme folder outside $HOME/$DESKTOP/$DOCUMENT/$DOWNLOAD is outside
  // the fs plugin's static scope too — fall back to the scope-bypassing
  // command instead of plugin-fs's readFile.
  it('falls back to desktopApi.readFileBytes for a theme folder outside the default fs scope', async () => {
    readDirectoryMock.mockResolvedValue([{ name: 'out.css', path: '/mnt/external/out.css', is_directory: false }]);
    readFileBytesMock.mockResolvedValue(encode('/* @theme outside */'));

    const result = await scanThemeFolder('/mnt/external');
    expect(result).toEqual([{ file: 'out.css', name: 'outside', css: '/* @theme outside */' }]);
    expect(readFileBytesMock).toHaveBeenCalledWith('/mnt/external/out.css');
    expect(readFileMock).not.toHaveBeenCalled();
  });
});

describe('loadRegisterableThemeCss', () => {
  beforeEach(() => {
    readFileMock.mockReset();
    readDirectoryMock.mockReset();
  });

  it('returns CSS only for files with a valid @theme name', async () => {
    readDirectoryMock.mockResolvedValue([dirEntry('named.css'), dirEntry('plain.css')]);
    readFileMock
      .mockResolvedValueOnce(encode('/* @theme named */ section{}'))
      .mockResolvedValueOnce(encode('section{}'));

    const css = await loadRegisterableThemeCss('/themes');
    expect(css).toEqual(['/* @theme named */ section{}']);
  });
});
