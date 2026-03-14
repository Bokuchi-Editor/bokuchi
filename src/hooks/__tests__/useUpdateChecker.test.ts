import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../../api/updaterApi', () => ({
  updaterApi: {
    checkForUpdate: vi.fn().mockResolvedValue({
      info: { available: false },
      update: null,
    }),
    downloadAndInstall: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@tauri-apps/plugin-updater', () => ({}));

import { useUpdateChecker } from '../useUpdateChecker';
import { updaterApi } from '../../api/updaterApi';
import type { UpdateInfo } from '../../api/updaterApi';
import { asMock } from '../../test-utils';

describe('useUpdateChecker', () => {
  let setSnackbar: ReturnType<typeof vi.fn>;
  const t = (key: string) => key;

  beforeEach(() => {
    setSnackbar = vi.fn();
    vi.clearAllMocks();
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
});
