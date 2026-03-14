import { describe, it, expect, vi, beforeEach } from 'vitest';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { updaterApi } from '../updaterApi';

vi.mock('@tauri-apps/plugin-updater');
vi.mock('@tauri-apps/plugin-process');

beforeEach(() => {
  vi.mocked(check).mockReset();
  vi.mocked(relaunch).mockReset().mockResolvedValue(undefined);
});

describe('updaterApi.checkForUpdate', () => {
  // T-UA-01: returns update info when update available
  it('T-UA-01: returns update info when update is available', async () => {
    const mockUpdate = {
      version: '2.0.0',
      body: 'New features',
      date: '2026-01-01',
      downloadAndInstall: vi.fn(),
    };
    vi.mocked(check).mockResolvedValue(mockUpdate as never);

    const result = await updaterApi.checkForUpdate();
    expect(result.info.available).toBe(true);
    expect(result.info.version).toBe('2.0.0');
    expect(result.info.body).toBe('New features');
    expect(result.update).toBe(mockUpdate);
  });

  // T-UA-02: returns no update when none available
  it('T-UA-02: returns available=false when no update', async () => {
    vi.mocked(check).mockResolvedValue(null as never);

    const result = await updaterApi.checkForUpdate();
    expect(result.info.available).toBe(false);
    expect(result.update).toBeNull();
  });

  // T-UA-03: handles null body and date
  it('T-UA-03: handles null body and date gracefully', async () => {
    const mockUpdate = {
      version: '2.0.0',
      body: null,
      date: null,
      downloadAndInstall: vi.fn(),
    };
    vi.mocked(check).mockResolvedValue(mockUpdate as never);

    const result = await updaterApi.checkForUpdate();
    expect(result.info.body).toBeUndefined();
    expect(result.info.date).toBeUndefined();
  });

  // T-UA-04: throws on check error
  it('T-UA-04: throws when check fails', async () => {
    vi.mocked(check).mockRejectedValue(new Error('Network error'));
    await expect(updaterApi.checkForUpdate()).rejects.toThrow('Network error');
  });
});

describe('updaterApi.downloadAndInstall', () => {
  // T-UA-05: calls downloadAndInstall and relaunch
  it('T-UA-05: downloads, installs, and relaunches', async () => {
    const mockDownloadAndInstall = vi.fn().mockResolvedValue(undefined);
    const mockUpdate = { downloadAndInstall: mockDownloadAndInstall } as never;

    await updaterApi.downloadAndInstall(mockUpdate);

    expect(mockDownloadAndInstall).toHaveBeenCalled();
    expect(relaunch).toHaveBeenCalled();
  });

  // T-UA-06: calls onProgress with Started event
  it('T-UA-06: calls onProgress callback for Started event', async () => {
    const onProgress = vi.fn();
    const mockDownloadAndInstall = vi.fn().mockImplementation(async (cb: (event: { event: string; data: Record<string, number | null> }) => void) => {
      cb({ event: 'Started', data: { contentLength: 5000 } });
    });
    const mockUpdate = { downloadAndInstall: mockDownloadAndInstall } as never;

    await updaterApi.downloadAndInstall(mockUpdate, onProgress);

    expect(onProgress).toHaveBeenCalledWith({
      contentLength: 5000,
      downloaded: 0,
    });
  });

  // T-UA-07: calls onProgress with Progress events (accumulates downloaded)
  it('T-UA-07: accumulates downloaded bytes across Progress events', async () => {
    const onProgress = vi.fn();
    const mockDownloadAndInstall = vi.fn().mockImplementation(async (cb: (event: { event: string; data: Record<string, number | null> }) => void) => {
      cb({ event: 'Started', data: { contentLength: 1000 } });
      cb({ event: 'Progress', data: { chunkLength: 300 } });
      cb({ event: 'Progress', data: { chunkLength: 200 } });
      cb({ event: 'Finished', data: {} });
    });
    const mockUpdate = { downloadAndInstall: mockDownloadAndInstall } as never;

    await updaterApi.downloadAndInstall(mockUpdate, onProgress);

    expect(onProgress).toHaveBeenCalledTimes(3); // Started + 2x Progress
    expect(onProgress).toHaveBeenNthCalledWith(2, { downloaded: 300 });
    expect(onProgress).toHaveBeenNthCalledWith(3, { downloaded: 500 });
  });

  // T-UA-08: throws on download error
  it('T-UA-08: throws when download fails', async () => {
    const mockDownloadAndInstall = vi.fn().mockRejectedValue(new Error('Download failed'));
    const mockUpdate = { downloadAndInstall: mockDownloadAndInstall } as never;

    await expect(updaterApi.downloadAndInstall(mockUpdate)).rejects.toThrow('Download failed');
  });

  // T-UA-09: handles null contentLength in Started event
  it('T-UA-09: handles null contentLength in Started event', async () => {
    const onProgress = vi.fn();
    const mockDownloadAndInstall = vi.fn().mockImplementation(async (cb: (event: { event: string; data: Record<string, number | null> }) => void) => {
      cb({ event: 'Started', data: { contentLength: null } });
    });
    const mockUpdate = { downloadAndInstall: mockDownloadAndInstall } as never;

    await updaterApi.downloadAndInstall(mockUpdate, onProgress);

    expect(onProgress).toHaveBeenCalledWith({
      contentLength: undefined,
      downloaded: 0,
    });
  });
});
