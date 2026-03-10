import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  detectFileChange,
  checkFileChangeAndReload,
  detectMultipleFileChanges,
} from '../fileChangeDetection';
import { Tab } from '../../types/tab';

vi.mock('../../api/desktopApi', () => ({
  desktopApi: {
    getFileHash: vi.fn(),
    readFileFromPath: vi.fn(),
  },
}));

import { desktopApi } from '../../api/desktopApi';

function createTab(overrides: Partial<Tab> = {}): Tab {
  return {
    id: 'tab-1',
    title: 'test.md',
    content: '# Hello',
    isModified: false,
    isNew: false,
    filePath: '/path/to/test.md',
    fileHashInfo: {
      hash: 'abc123',
      modified_time: 1000,
      file_size: 512,
    },
    ...overrides,
  };
}

describe('detectFileChange', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // T-FC-01
  it('returns false when all fields match', async () => {
    vi.mocked(desktopApi.getFileHash).mockResolvedValue({
      hash: 'abc123',
      modified_time: 1000,
      file_size: 512,
    });
    const tab = createTab();
    expect(await detectFileChange(tab)).toBe(false);
  });

  // T-FC-02
  it('returns true when file size differs', async () => {
    vi.mocked(desktopApi.getFileHash).mockResolvedValue({
      hash: 'abc123',
      modified_time: 1000,
      file_size: 1024,
    });
    const tab = createTab();
    expect(await detectFileChange(tab)).toBe(true);
  });

  // T-FC-03
  it('returns true when modified time differs', async () => {
    vi.mocked(desktopApi.getFileHash).mockResolvedValue({
      hash: 'abc123',
      modified_time: 2000,
      file_size: 512,
    });
    const tab = createTab();
    expect(await detectFileChange(tab)).toBe(true);
  });

  // T-FC-04
  it('returns true when hash differs', async () => {
    vi.mocked(desktopApi.getFileHash).mockResolvedValue({
      hash: 'different_hash',
      modified_time: 1000,
      file_size: 512,
    });
    const tab = createTab();
    expect(await detectFileChange(tab)).toBe(true);
  });

  // T-FC-05
  it('returns false for new file (isNew=true)', async () => {
    const tab = createTab({ isNew: true });
    expect(await detectFileChange(tab)).toBe(false);
    expect(desktopApi.getFileHash).not.toHaveBeenCalled();
  });

  // T-FC-06
  it('returns false when no fileHashInfo', async () => {
    const tab = createTab({ fileHashInfo: undefined });
    expect(await detectFileChange(tab)).toBe(false);
    expect(desktopApi.getFileHash).not.toHaveBeenCalled();
  });

  // T-FC-07
  it('returns false on API error', async () => {
    vi.mocked(desktopApi.getFileHash).mockRejectedValue(new Error('API error'));
    const tab = createTab();
    expect(await detectFileChange(tab)).toBe(false);
  });

  it('returns false when filePath is undefined', async () => {
    const tab = createTab({ filePath: undefined });
    expect(await detectFileChange(tab)).toBe(false);
    expect(desktopApi.getFileHash).not.toHaveBeenCalled();
  });
});

describe('checkFileChangeAndReload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns false when file has not changed', async () => {
    vi.mocked(desktopApi.getFileHash).mockResolvedValue({
      hash: 'abc123',
      modified_time: 1000,
      file_size: 512,
    });
    const tab = createTab();
    const onReload = vi.fn();
    const onCancel = vi.fn();

    const result = await checkFileChangeAndReload(tab, onReload, onCancel);

    expect(result).toBe(false);
    expect(onReload).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('calls onReload with new content when user confirms reload', async () => {
    vi.mocked(desktopApi.getFileHash).mockResolvedValue({
      hash: 'changed',
      modified_time: 2000,
      file_size: 1024,
    });
    vi.mocked(desktopApi.readFileFromPath).mockResolvedValue('new content');

    // Intercept the CustomEvent and auto-confirm reload
    const listener = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      detail.onReload();
    };
    window.addEventListener('fileChangeDetected', listener);

    const tab = createTab();
    const onReload = vi.fn();
    const onCancel = vi.fn();

    const result = await checkFileChangeAndReload(tab, onReload, onCancel);

    expect(result).toBe(true);
    expect(onReload).toHaveBeenCalledWith('new content');
    expect(onCancel).not.toHaveBeenCalled();

    window.removeEventListener('fileChangeDetected', listener);
  });

  it('calls onCancel when user declines reload', async () => {
    vi.mocked(desktopApi.getFileHash).mockResolvedValue({
      hash: 'changed',
      modified_time: 2000,
      file_size: 1024,
    });

    const listener = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      detail.onCancel();
    };
    window.addEventListener('fileChangeDetected', listener);

    const tab = createTab();
    const onReload = vi.fn();
    const onCancel = vi.fn();

    const result = await checkFileChangeAndReload(tab, onReload, onCancel);

    expect(result).toBe(false);
    expect(onReload).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalled();

    window.removeEventListener('fileChangeDetected', listener);
  });

  it('calls onCancel when readFileFromPath fails', async () => {
    vi.mocked(desktopApi.getFileHash).mockResolvedValue({
      hash: 'changed',
      modified_time: 2000,
      file_size: 1024,
    });
    vi.mocked(desktopApi.readFileFromPath).mockRejectedValue(new Error('read failed'));

    const listener = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      detail.onReload();
    };
    window.addEventListener('fileChangeDetected', listener);

    const tab = createTab();
    const onReload = vi.fn();
    const onCancel = vi.fn();

    const result = await checkFileChangeAndReload(tab, onReload, onCancel);

    expect(result).toBe(false);
    expect(onCancel).toHaveBeenCalled();

    window.removeEventListener('fileChangeDetected', listener);
  });
});

describe('detectMultipleFileChanges', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns IDs of all changed tabs', async () => {
    vi.mocked(desktopApi.getFileHash)
      .mockResolvedValueOnce({ hash: 'changed', modified_time: 2000, file_size: 1024 })
      .mockResolvedValueOnce({ hash: 'abc123', modified_time: 1000, file_size: 512 })
      .mockResolvedValueOnce({ hash: 'also_changed', modified_time: 3000, file_size: 256 });

    const tabs = [
      createTab({ id: 'tab-1' }),
      createTab({ id: 'tab-2' }),
      createTab({ id: 'tab-3' }),
    ];

    const changed = await detectMultipleFileChanges(tabs);
    expect(changed).toContain('tab-1');
    expect(changed).not.toContain('tab-2');
    expect(changed).toContain('tab-3');
  });

  it('returns empty array when no tabs have changed', async () => {
    vi.mocked(desktopApi.getFileHash).mockResolvedValue({
      hash: 'abc123',
      modified_time: 1000,
      file_size: 512,
    });

    const tabs = [createTab({ id: 'tab-1' }), createTab({ id: 'tab-2' })];
    const changed = await detectMultipleFileChanges(tabs);
    expect(changed).toEqual([]);
  });

  it('returns empty array for empty input', async () => {
    const changed = await detectMultipleFileChanges([]);
    expect(changed).toEqual([]);
  });
});
