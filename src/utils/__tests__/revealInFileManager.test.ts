import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tauri-apps/plugin-opener', () => ({
  revealItemInDir: vi.fn().mockResolvedValue(undefined),
}));

import { revealItemInDir } from '@tauri-apps/plugin-opener';
import { getRevealMenuLabelKey, revealInFileManager } from '../revealInFileManager';

describe('getRevealMenuLabelKey', () => {
  it('returns the Finder label key on macOS', () => {
    expect(getRevealMenuLabelKey('mac')).toBe('tabs.revealInFinder');
  });

  it('returns the File Explorer label key on Windows', () => {
    expect(getRevealMenuLabelKey('windows')).toBe('tabs.revealInFileExplorer');
  });

  it('returns the neutral label key on Linux and unknown platforms', () => {
    expect(getRevealMenuLabelKey('linux')).toBe('tabs.openContainingFolder');
    expect(getRevealMenuLabelKey('unknown')).toBe('tabs.openContainingFolder');
  });
});

describe('revealInFileManager', () => {
  beforeEach(() => {
    vi.mocked(revealItemInDir).mockClear();
  });

  it('delegates to the opener plugin with the given path', async () => {
    await revealInFileManager('/docs/Saved.md');
    expect(revealItemInDir).toHaveBeenCalledWith('/docs/Saved.md');
  });

  it('propagates plugin failures to the caller', async () => {
    vi.mocked(revealItemInDir).mockRejectedValueOnce(new Error('no such file'));
    await expect(revealInFileManager('/gone.md')).rejects.toThrow('no such file');
  });
});
