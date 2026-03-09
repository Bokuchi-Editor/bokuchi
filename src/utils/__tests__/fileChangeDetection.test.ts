import { describe, it, expect, vi, beforeEach } from 'vitest';
import { detectFileChange } from '../fileChangeDetection';
import { Tab } from '../../types/tab';

vi.mock('../../api/desktopApi', () => ({
  desktopApi: {
    getFileHash: vi.fn(),
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
      file_size: 1024, // different
    });
    const tab = createTab();
    expect(await detectFileChange(tab)).toBe(true);
  });

  // T-FC-03
  it('returns true when modified time differs', async () => {
    vi.mocked(desktopApi.getFileHash).mockResolvedValue({
      hash: 'abc123',
      modified_time: 2000, // different
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
});
