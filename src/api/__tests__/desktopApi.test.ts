import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { desktopApi } from '../desktopApi';

vi.mock('@tauri-apps/api/core');
vi.mock('@tauri-apps/plugin-dialog');
vi.mock('@tauri-apps/plugin-fs');

beforeEach(() => {
  vi.mocked(invoke).mockReset();
  vi.mocked(open).mockReset();
  vi.mocked(save).mockReset();
  vi.mocked(readTextFile).mockReset();
  vi.mocked(writeTextFile).mockReset();
});

// ---------------------------------------------------------------------------
// getPendingFilePaths
// ---------------------------------------------------------------------------
describe('desktopApi.getPendingFilePaths', () => {
  it('returns paths from invoke', async () => {
    vi.mocked(invoke).mockResolvedValue(['/a.md', '/b.md']);
    const result = await desktopApi.getPendingFilePaths();
    expect(result).toEqual(['/a.md', '/b.md']);
    expect(invoke).toHaveBeenCalledWith('get_pending_file_paths_command');
  });

  it('returns empty array on error', async () => {
    vi.mocked(invoke).mockRejectedValue(new Error('fail'));
    const result = await desktopApi.getPendingFilePaths();
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// logToRust
// ---------------------------------------------------------------------------
describe('desktopApi.logToRust', () => {
  it('calls invoke with message', async () => {
    vi.mocked(invoke).mockResolvedValue(undefined);
    await desktopApi.logToRust('hello');
    expect(invoke).toHaveBeenCalledWith('log_from_frontend', { message: 'hello' });
  });

  it('does not throw on error', async () => {
    vi.mocked(invoke).mockRejectedValue(new Error('fail'));
    await expect(desktopApi.logToRust('hello')).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// setFrontendReady
// ---------------------------------------------------------------------------
describe('desktopApi.setFrontendReady', () => {
  it('calls invoke', async () => {
    vi.mocked(invoke).mockResolvedValue(undefined);
    await desktopApi.setFrontendReady();
    expect(invoke).toHaveBeenCalledWith('set_frontend_ready_command');
  });

  it('does not throw on error', async () => {
    vi.mocked(invoke).mockRejectedValue(new Error('fail'));
    await expect(desktopApi.setFrontendReady()).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// openFile
// ---------------------------------------------------------------------------
describe('desktopApi.openFile', () => {
  it('returns file content on success', async () => {
    vi.mocked(open).mockResolvedValue('/test.md');
    vi.mocked(readTextFile).mockResolvedValue('# Hello');

    const result = await desktopApi.openFile();
    expect(result).toEqual({ content: '# Hello', filePath: '/test.md' });
  });

  it('returns error when no file selected', async () => {
    vi.mocked(open).mockResolvedValue(null);
    const result = await desktopApi.openFile();
    expect(result.error).toBe('No file selected');
  });

  it('returns error when open returns array', async () => {
    vi.mocked(open).mockResolvedValue(['/a.md', '/b.md'] as unknown as string);
    const result = await desktopApi.openFile();
    expect(result.error).toBe('No file selected');
  });

  it('returns error message on exception', async () => {
    vi.mocked(open).mockRejectedValue(new Error('dialog crashed'));
    const result = await desktopApi.openFile();
    expect(result.error).toBe('dialog crashed');
    expect(result.content).toBe('');
  });

  it('returns generic error for non-Error exception', async () => {
    vi.mocked(open).mockRejectedValue('string error');
    const result = await desktopApi.openFile();
    expect(result.error).toBe('Failed to open file');
  });
});

// ---------------------------------------------------------------------------
// saveFile
// ---------------------------------------------------------------------------
describe('desktopApi.saveFile', () => {
  it('saves content to selected path', async () => {
    vi.mocked(save).mockResolvedValue('/out.md');
    vi.mocked(writeTextFile).mockResolvedValue(undefined);

    const result = await desktopApi.saveFile('content', '/current.md');
    expect(result).toEqual({ success: true, filePath: '/out.md' });
    expect(writeTextFile).toHaveBeenCalledWith('/out.md', 'content');
  });

  it('returns error when user cancels', async () => {
    vi.mocked(save).mockResolvedValue(null);
    const result = await desktopApi.saveFile('content');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Save cancelled by user');
  });

  it('returns error on write failure', async () => {
    vi.mocked(save).mockResolvedValue('/out.md');
    vi.mocked(writeTextFile).mockRejectedValue(new Error('write failed'));
    const result = await desktopApi.saveFile('content');
    expect(result.success).toBe(false);
    expect(result.error).toBe('write failed');
  });

  it('returns generic error for non-Error exception', async () => {
    vi.mocked(save).mockRejectedValue(42);
    const result = await desktopApi.saveFile('content');
    expect(result.error).toBe('Failed to save file');
  });
});

// ---------------------------------------------------------------------------
// saveFileAs
// ---------------------------------------------------------------------------
describe('desktopApi.saveFileAs', () => {
  it('saves and returns path', async () => {
    vi.mocked(save).mockResolvedValue('/new.md');
    vi.mocked(writeTextFile).mockResolvedValue(undefined);

    const result = await desktopApi.saveFileAs('content');
    expect(result).toEqual({ success: true, filePath: '/new.md' });
  });

  it('returns error when no location selected', async () => {
    vi.mocked(save).mockResolvedValue(null);
    const result = await desktopApi.saveFileAs('content');
    expect(result.error).toBe('No save location selected');
  });
});

// ---------------------------------------------------------------------------
// readFileByPath
// ---------------------------------------------------------------------------
describe('desktopApi.readFileByPath', () => {
  it('returns content via invoke', async () => {
    vi.mocked(invoke).mockResolvedValue('file content');
    const result = await desktopApi.readFileByPath('/file.md');
    expect(result).toEqual({ content: 'file content', filePath: '/file.md' });
    expect(invoke).toHaveBeenCalledWith('read_file', { path: '/file.md' });
  });

  it('returns error on failure', async () => {
    vi.mocked(invoke).mockRejectedValue(new Error('not found'));
    const result = await desktopApi.readFileByPath('/missing.md');
    expect(result.error).toBe('not found');
    expect(result.content).toBe('');
  });

  it('stringifies non-Error rejection', async () => {
    vi.mocked(invoke).mockRejectedValue('raw error string');
    const result = await desktopApi.readFileByPath('/missing.md');
    expect(result.error).toBe('raw error string');
  });
});

// ---------------------------------------------------------------------------
// readFileFromPath
// ---------------------------------------------------------------------------
describe('desktopApi.readFileFromPath', () => {
  it('reads via readTextFile', async () => {
    vi.mocked(readTextFile).mockResolvedValue('content');
    const result = await desktopApi.readFileFromPath('/file.md');
    expect(result).toBe('content');
  });

  it('rethrows on error', async () => {
    vi.mocked(readTextFile).mockRejectedValue(new Error('read error'));
    await expect(desktopApi.readFileFromPath('/file.md')).rejects.toThrow('read error');
  });
});

// ---------------------------------------------------------------------------
// saveFileToPath
// ---------------------------------------------------------------------------
describe('desktopApi.saveFileToPath', () => {
  it('writes and returns success', async () => {
    vi.mocked(writeTextFile).mockResolvedValue(undefined);
    const result = await desktopApi.saveFileToPath('/file.md', 'content');
    expect(result).toEqual({ success: true, filePath: '/file.md' });
    expect(writeTextFile).toHaveBeenCalledWith('/file.md', 'content');
  });

  it('returns error on failure', async () => {
    vi.mocked(writeTextFile).mockRejectedValue(new Error('disk full'));
    const result = await desktopApi.saveFileToPath('/file.md', 'content');
    expect(result.success).toBe(false);
    expect(result.error).toBe('disk full');
  });
});

// ---------------------------------------------------------------------------
// openMultipleFiles
// ---------------------------------------------------------------------------
describe('desktopApi.openMultipleFiles', () => {
  it('reads all selected files', async () => {
    vi.mocked(open).mockResolvedValue(['/a.md', '/b.md'] as unknown as string);
    vi.mocked(readTextFile)
      .mockResolvedValueOnce('content A')
      .mockResolvedValueOnce('content B');

    const results = await desktopApi.openMultipleFiles();
    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({ content: 'content A', filePath: '/a.md' });
    expect(results[1]).toEqual({ content: 'content B', filePath: '/b.md' });
  });

  it('returns empty array when no files selected', async () => {
    vi.mocked(open).mockResolvedValue(null);
    const results = await desktopApi.openMultipleFiles();
    expect(results).toEqual([]);
  });

  it('returns empty array when single file returned instead of array', async () => {
    vi.mocked(open).mockResolvedValue('/single.md');
    const results = await desktopApi.openMultipleFiles();
    expect(results).toEqual([]);
  });

  it('includes error for individual file read failures', async () => {
    vi.mocked(open).mockResolvedValue(['/a.md', '/bad.md'] as unknown as string);
    vi.mocked(readTextFile)
      .mockResolvedValueOnce('content A')
      .mockRejectedValueOnce(new Error('permission denied'));

    const results = await desktopApi.openMultipleFiles();
    expect(results[0].content).toBe('content A');
    expect(results[1].error).toBe('permission denied');
    expect(results[1].content).toBe('');
  });

  it('returns empty array on dialog error', async () => {
    vi.mocked(open).mockRejectedValue(new Error('dialog error'));
    const results = await desktopApi.openMultipleFiles();
    expect(results).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getFileHash
// ---------------------------------------------------------------------------
describe('desktopApi.getFileHash', () => {
  it('returns hash info from invoke', async () => {
    const hashInfo = { hash: 'abc', modified_time: 1000, file_size: 512 };
    vi.mocked(invoke).mockResolvedValue(hashInfo);
    const result = await desktopApi.getFileHash('/file.md');
    expect(result).toEqual(hashInfo);
  });

  it('rethrows on error', async () => {
    vi.mocked(invoke).mockRejectedValue(new Error('hash error'));
    await expect(desktopApi.getFileHash('/file.md')).rejects.toThrow('hash error');
  });
});

// ---------------------------------------------------------------------------
// saveHtmlFile
// ---------------------------------------------------------------------------
describe('desktopApi.saveHtmlFile', () => {
  it('saves HTML content', async () => {
    vi.mocked(save).mockResolvedValue('/export.html');
    vi.mocked(writeTextFile).mockResolvedValue(undefined);
    const result = await desktopApi.saveHtmlFile('<html></html>');
    expect(result).toEqual({ success: true, filePath: '/export.html' });
  });

  it('returns error when cancelled', async () => {
    vi.mocked(save).mockResolvedValue(null);
    const result = await desktopApi.saveHtmlFile('<html></html>');
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// exportSettingsFile / importSettingsFile
// ---------------------------------------------------------------------------
describe('desktopApi.exportSettingsFile', () => {
  it('saves JSON settings', async () => {
    vi.mocked(save).mockResolvedValue('/settings.json');
    vi.mocked(writeTextFile).mockResolvedValue(undefined);
    const result = await desktopApi.exportSettingsFile('{"key":"value"}');
    expect(result).toEqual({ success: true, filePath: '/settings.json' });
  });

  it('returns error when cancelled', async () => {
    vi.mocked(save).mockResolvedValue(null);
    const result = await desktopApi.exportSettingsFile('{}');
    expect(result.success).toBe(false);
  });
});

describe('desktopApi.importSettingsFile', () => {
  it('reads JSON settings file', async () => {
    vi.mocked(open).mockResolvedValue('/settings.json');
    vi.mocked(readTextFile).mockResolvedValue('{"key":"value"}');
    const result = await desktopApi.importSettingsFile();
    expect(result).toEqual({ content: '{"key":"value"}', filePath: '/settings.json' });
  });

  it('returns error when no file selected', async () => {
    vi.mocked(open).mockResolvedValue(null);
    const result = await desktopApi.importSettingsFile();
    expect(result.error).toBe('No file selected');
  });
});

// ---------------------------------------------------------------------------
// saveYamlFile / openYamlFile
// ---------------------------------------------------------------------------
describe('desktopApi.saveYamlFile', () => {
  it('saves YAML with default filename', async () => {
    vi.mocked(save).mockResolvedValue('/vars.yaml');
    vi.mocked(writeTextFile).mockResolvedValue(undefined);
    const result = await desktopApi.saveYamlFile('key: val');
    expect(result).toEqual({ success: true, filePath: '/vars.yaml' });
  });

  it('returns error when cancelled', async () => {
    vi.mocked(save).mockResolvedValue(null);
    const result = await desktopApi.saveYamlFile('key: val');
    expect(result.success).toBe(false);
  });
});

describe('desktopApi.openYamlFile', () => {
  it('reads YAML file', async () => {
    vi.mocked(open).mockResolvedValue('/vars.yaml');
    vi.mocked(readTextFile).mockResolvedValue('key: val');
    const result = await desktopApi.openYamlFile();
    expect(result).toEqual({ content: 'key: val', filePath: '/vars.yaml' });
  });

  it('returns error when cancelled', async () => {
    vi.mocked(open).mockResolvedValue(null);
    const result = await desktopApi.openYamlFile();
    expect(result.error).toBeTruthy();
  });

  it('returns error on read failure', async () => {
    vi.mocked(open).mockResolvedValue('/vars.yaml');
    vi.mocked(readTextFile).mockRejectedValue(new Error('read error'));
    const result = await desktopApi.openYamlFile();
    expect(result.error).toBe('read error');
  });
});

// ---------------------------------------------------------------------------
// openFolder
// ---------------------------------------------------------------------------
describe('desktopApi.openFolder', () => {
  it('returns selected directory path', async () => {
    vi.mocked(open).mockResolvedValue('/home/user/docs');
    const result = await desktopApi.openFolder();
    expect(result).toBe('/home/user/docs');
  });

  it('returns null when no folder selected', async () => {
    vi.mocked(open).mockResolvedValue(null);
    const result = await desktopApi.openFolder();
    expect(result).toBeNull();
  });

  it('returns null on error', async () => {
    vi.mocked(open).mockRejectedValue(new Error('fail'));
    const result = await desktopApi.openFolder();
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// renameFile
// ---------------------------------------------------------------------------
describe('desktopApi.renameFile', () => {
  it('calls invoke with correct params and returns success', async () => {
    vi.mocked(invoke).mockResolvedValue(undefined);
    const result = await desktopApi.renameFile('/old.md', '/new.md');
    expect(result).toEqual({ success: true, filePath: '/new.md' });
    expect(invoke).toHaveBeenCalledWith('rename_file', { oldPath: '/old.md', newPath: '/new.md' });
  });

  it('returns error on failure', async () => {
    vi.mocked(invoke).mockRejectedValue(new Error('permission denied'));
    const result = await desktopApi.renameFile('/old.md', '/new.md');
    expect(result.success).toBe(false);
    expect(result.error).toBe('permission denied');
  });

  it('stringifies non-Error rejection', async () => {
    vi.mocked(invoke).mockRejectedValue('raw error');
    const result = await desktopApi.renameFile('/old.md', '/new.md');
    expect(result.success).toBe(false);
    expect(result.error).toBe('raw error');
  });
});

// ---------------------------------------------------------------------------
// readDirectory
// ---------------------------------------------------------------------------
describe('desktopApi.readDirectory', () => {
  it('returns directory entries', async () => {
    const entries = [
      { name: 'file.md', path: '/dir/file.md', is_directory: false },
      { name: 'sub', path: '/dir/sub', is_directory: true },
    ];
    vi.mocked(invoke).mockResolvedValue(entries);
    const result = await desktopApi.readDirectory('/dir', false);
    expect(result).toEqual(entries);
    expect(invoke).toHaveBeenCalledWith('read_directory', { path: '/dir', showAllFiles: false });
  });

  it('returns empty array on error', async () => {
    vi.mocked(invoke).mockRejectedValue(new Error('fail'));
    const result = await desktopApi.readDirectory('/dir', true);
    expect(result).toEqual([]);
  });
});
