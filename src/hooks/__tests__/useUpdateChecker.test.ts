import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

vi.mock('../../api/updaterApi', () => ({
  updaterApi: {
    checkForUpdate: vi.fn().mockResolvedValue({
      info: { available: false },
      update: null,
    }),
    downloadAndInstall: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../api/storeApi', () => ({
  storeApi: {
    loadLastUpdateCheckAt: vi.fn().mockResolvedValue(null),
    saveLastUpdateCheckAt: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@tauri-apps/plugin-updater', () => ({}));

import { useUpdateChecker } from '../useUpdateChecker';
import { updaterApi } from '../../api/updaterApi';
import { storeApi } from '../../api/storeApi';
import type { UpdateInfo } from '../../api/updaterApi';
import { asMock } from '../../test-utils';

const TICK_INTERVAL_MS = 2 * 60 * 60 * 1000;
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

describe('useUpdateChecker', () => {
  let setSnackbar: ReturnType<typeof vi.fn>;
  const t = (key: string) => key;

  beforeEach(() => {
    setSnackbar = vi.fn();
    vi.clearAllMocks();
    vi.mocked(updaterApi.checkForUpdate).mockResolvedValue({
      info: { available: false },
      update: null,
    });
    vi.mocked(storeApi.loadLastUpdateCheckAt).mockResolvedValue(null);
    vi.mocked(storeApi.saveLastUpdateCheckAt).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const defaultParams = () => ({
    isInitialized: true,
    isSettingsLoaded: true,
    setSnackbar: asMock<(snackbar: { open: boolean; message: string; severity: 'error' | 'success' | 'warning' }) => void>(setSnackbar),
    t,
  });

  // T-UC-01: initial state
  it('T-UC-01: starts with dialog closed', () => {
    const { result } = renderHook(() => useUpdateChecker({ ...defaultParams(), isInitialized: false }));
    expect(result.current.updateDialogOpen).toBe(false);
    expect(result.current.updateInfo).toBeNull();
  });

  // T-UC-02: does not check when not initialized
  it('T-UC-02: does not check for updates when not initialized', () => {
    renderHook(() => useUpdateChecker({ ...defaultParams(), isInitialized: false }));
    expect(updaterApi.checkForUpdate).not.toHaveBeenCalled();
  });

  // T-UC-03: checks for updates when initialized
  it('T-UC-03: checks for updates when initialized and settings loaded', async () => {
    renderHook(() => useUpdateChecker(defaultParams()));
    await waitFor(() => {
      expect(updaterApi.checkForUpdate).toHaveBeenCalledTimes(1);
    });
  });

  // T-UC-04: opens dialog when update is available
  it('T-UC-04: opens dialog when update is available', async () => {
    const mockUpdate = { version: '2.0.0' };
    vi.mocked(updaterApi.checkForUpdate).mockResolvedValue({
      info: { available: true, version: '2.0.0', body: 'New version' } as UpdateInfo,
      update: mockUpdate as import('@tauri-apps/plugin-updater').Update,
    });

    const { result } = renderHook(() => useUpdateChecker(defaultParams()));

    await waitFor(() => {
      expect(result.current.updateDialogOpen).toBe(true);
      expect(result.current.updateInfo).toEqual({ available: true, version: '2.0.0', body: 'New version' });
    });
  });

  // T-UC-05: dismiss closes dialog
  it('T-UC-05: handleDismissUpdate closes dialog', async () => {
    const mockUpdate = { version: '2.0.0' };
    vi.mocked(updaterApi.checkForUpdate).mockResolvedValue({
      info: { available: true, version: '2.0.0', body: '' } as UpdateInfo,
      update: mockUpdate as import('@tauri-apps/plugin-updater').Update,
    });

    const { result } = renderHook(() => useUpdateChecker(defaultParams()));

    await waitFor(() => {
      expect(result.current.updateDialogOpen).toBe(true);
    });

    act(() => {
      result.current.handleDismissUpdate();
    });

    expect(result.current.updateDialogOpen).toBe(false);
  });

  // T-UC-06: handles check failure gracefully
  it('T-UC-06: handles update check failure gracefully', async () => {
    vi.mocked(updaterApi.checkForUpdate).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useUpdateChecker(defaultParams()));

    await waitFor(() => {
      expect(updaterApi.checkForUpdate).toHaveBeenCalled();
    });

    expect(result.current.updateDialogOpen).toBe(false);
  });

  // T-UC-07: saves timestamp on successful check
  it('T-UC-07: saves timestamp after successful check', async () => {
    renderHook(() => useUpdateChecker(defaultParams()));
    await waitFor(() => {
      expect(storeApi.saveLastUpdateCheckAt).toHaveBeenCalledTimes(1);
    });
  });

  // T-UC-08: does not save timestamp when check fails
  it('T-UC-08: does not save timestamp on check failure', async () => {
    vi.mocked(updaterApi.checkForUpdate).mockRejectedValue(new Error('Network error'));

    renderHook(() => useUpdateChecker(defaultParams()));

    await waitFor(() => {
      expect(updaterApi.checkForUpdate).toHaveBeenCalled();
    });

    expect(storeApi.saveLastUpdateCheckAt).not.toHaveBeenCalled();
  });

  // T-UC-09: tick skips check when last check was less than 24h ago
  it('T-UC-09: tick skips check within 24h window', async () => {
    vi.useFakeTimers();
    const now = Date.now();
    vi.setSystemTime(now);
    // Pretend last check happened 1 hour ago
    vi.mocked(storeApi.loadLastUpdateCheckAt).mockResolvedValue(now - 60 * 60 * 1000);

    renderHook(() => useUpdateChecker(defaultParams()));

    // Wait for initial (forced) check to fire
    await vi.waitFor(() => {
      expect(updaterApi.checkForUpdate).toHaveBeenCalledTimes(1);
    });

    // Advance by 2h tick — should NOT trigger another check (within 24h window)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(TICK_INTERVAL_MS);
    });

    expect(updaterApi.checkForUpdate).toHaveBeenCalledTimes(1);
  });

  // T-UC-10: tick triggers check when last check was 24h+ ago
  it('T-UC-10: tick triggers check after 24h elapsed', async () => {
    vi.useFakeTimers();
    const now = Date.now();
    vi.setSystemTime(now);
    // Initial check uses force=true. After it, timestamp gets set to "now".
    // We then simulate time passing past the 24h threshold.
    vi.mocked(storeApi.loadLastUpdateCheckAt).mockImplementation(async () => {
      // Return the most recent saveLastUpdateCheckAt arg, or null
      const calls = vi.mocked(storeApi.saveLastUpdateCheckAt).mock.calls;
      return calls.length > 0 ? (calls[calls.length - 1][0] as number) : null;
    });

    renderHook(() => useUpdateChecker(defaultParams()));

    await vi.waitFor(() => {
      expect(updaterApi.checkForUpdate).toHaveBeenCalledTimes(1);
    });

    // Advance past the 24h threshold (12 ticks of 2h = 24h, plus a bit more)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(CHECK_INTERVAL_MS + TICK_INTERVAL_MS);
    });

    expect(vi.mocked(updaterApi.checkForUpdate).mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  // T-UC-11: tick triggers check when no previous timestamp exists
  it('T-UC-11: tick triggers check when timestamp is null', async () => {
    vi.useFakeTimers();
    // Make initial check fail so timestamp is never saved
    vi.mocked(updaterApi.checkForUpdate).mockRejectedValue(new Error('initial fail'));
    vi.mocked(storeApi.loadLastUpdateCheckAt).mockResolvedValue(null);

    renderHook(() => useUpdateChecker(defaultParams()));

    await vi.waitFor(() => {
      expect(updaterApi.checkForUpdate).toHaveBeenCalledTimes(1);
    });

    // Now succeed for the tick call
    vi.mocked(updaterApi.checkForUpdate).mockResolvedValue({
      info: { available: false },
      update: null,
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(TICK_INTERVAL_MS);
    });

    expect(vi.mocked(updaterApi.checkForUpdate).mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  // T-UC-12: tick is skipped when notification dialog is open
  it('T-UC-12: tick skipped while update dialog is open', async () => {
    vi.useFakeTimers();
    const mockUpdate = { version: '2.0.0' };
    vi.mocked(updaterApi.checkForUpdate).mockResolvedValue({
      info: { available: true, version: '2.0.0', body: '' } as UpdateInfo,
      update: mockUpdate as import('@tauri-apps/plugin-updater').Update,
    });
    vi.mocked(storeApi.loadLastUpdateCheckAt).mockResolvedValue(Date.now() - CHECK_INTERVAL_MS - 1000);

    const { result } = renderHook(() => useUpdateChecker(defaultParams()));

    await vi.waitFor(() => {
      expect(result.current.updateDialogOpen).toBe(true);
    });

    const callsAfterInitial = vi.mocked(updaterApi.checkForUpdate).mock.calls.length;

    await act(async () => {
      await vi.advanceTimersByTimeAsync(TICK_INTERVAL_MS);
    });

    // Dialog still open → tick should not have called the API again
    expect(vi.mocked(updaterApi.checkForUpdate).mock.calls.length).toBe(callsAfterInitial);
  });

  // T-UC-13: interval is cleaned up when init becomes false
  it('T-UC-13: stops tick interval when isInitialized becomes false', async () => {
    vi.useFakeTimers();
    vi.mocked(storeApi.loadLastUpdateCheckAt).mockResolvedValue(Date.now() - CHECK_INTERVAL_MS - 1000);

    const { rerender } = renderHook(
      ({ isInitialized }: { isInitialized: boolean }) =>
        useUpdateChecker({ ...defaultParams(), isInitialized }),
      { initialProps: { isInitialized: true } },
    );

    await vi.waitFor(() => {
      expect(updaterApi.checkForUpdate).toHaveBeenCalledTimes(1);
    });

    rerender({ isInitialized: false });

    const callsBefore = vi.mocked(updaterApi.checkForUpdate).mock.calls.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(TICK_INTERVAL_MS * 3);
    });

    expect(vi.mocked(updaterApi.checkForUpdate).mock.calls.length).toBe(callsBefore);
  });
});
