import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../../api/storeApi', () => ({
  storeApi: {
    loadLastSeenVersion: vi.fn().mockResolvedValue(null),
    saveLastSeenVersion: vi.fn().mockResolvedValue(undefined),
  },
}));

import { useWhatsNew } from '../useWhatsNew';
import { storeApi } from '../../api/storeApi';
import { whatsNewContent } from '../../whatsNew';

describe('useWhatsNew', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // null = fresh install / never seen, so auto-open is normally due.
    vi.mocked(storeApi.loadLastSeenVersion).mockResolvedValue(null);
    vi.mocked(storeApi.saveLastSeenVersion).mockResolvedValue(undefined);
  });

  // T-WN-01: before init/settings are ready the version check must not even
  // run — opening a modal over a half-loaded app would flash or mis-theme it.
  it('T-WN-01: does not check or open before initialization completes', () => {
    const { result } = renderHook(() => useWhatsNew(false, false));
    expect(result.current.whatsNewOpen).toBe(false);
    expect(storeApi.loadLastSeenVersion).not.toHaveBeenCalled();
  });

  // T-WN-02: version never seen (null) differs from the current version, so
  // What's New auto-opens once the app is ready.
  it('T-WN-02: auto-opens when the stored version differs from the current one', async () => {
    const { result } = renderHook(() => useWhatsNew(true, true));
    await waitFor(() => expect(result.current.whatsNewOpen).toBe(true));
  });

  // T-WN-03: a stored version equal to whatsNewContent.version means the user
  // already saw this release's notes — no auto-open.
  it('T-WN-03: does not auto-open when the stored version matches the current one', async () => {
    vi.mocked(storeApi.loadLastSeenVersion).mockResolvedValue(whatsNewContent.version);

    const { result } = renderHook(() => useWhatsNew(true, true));

    // Wait until the async check has actually run, then assert it kept closed.
    await waitFor(() => expect(storeApi.loadLastSeenVersion).toHaveBeenCalled());
    expect(result.current.whatsNewOpen).toBe(false);
  });

  // T-WN-04: while a milestone greeting is pending (blockAutoOpen=true) the
  // modal must stay closed so the two dialogs never stack; when the block
  // flips to false the effect re-runs and What's New finally opens.
  it('T-WN-04: blockAutoOpen suppresses auto-open until it flips to false', async () => {
    const { result, rerender } = renderHook(
      ({ block }) => useWhatsNew(true, true, block),
      { initialProps: { block: true } }
    );

    // Blocked: the check must not fire at all, not merely stay closed.
    expect(storeApi.loadLastSeenVersion).not.toHaveBeenCalled();
    expect(result.current.whatsNewOpen).toBe(false);

    rerender({ block: false });
    await waitFor(() => expect(result.current.whatsNewOpen).toBe(true));
  });

  // T-WN-05: closing persists the current version so the modal does not
  // auto-open again on every launch of this release.
  it('T-WN-05: close hides the modal and saves the current version as seen', async () => {
    const { result } = renderHook(() => useWhatsNew(true, true));
    await waitFor(() => expect(result.current.whatsNewOpen).toBe(true));

    await act(async () => {
      await result.current.handleWhatsNewClose();
    });

    expect(result.current.whatsNewOpen).toBe(false);
    expect(storeApi.saveLastSeenVersion).toHaveBeenCalledWith(whatsNewContent.version);
  });

  // T-WN-06: the menu entry must always be able to open the modal manually,
  // even when the auto-open check decided against showing it.
  it('T-WN-06: handleWhatsNewOpen opens the modal even when already seen', async () => {
    vi.mocked(storeApi.loadLastSeenVersion).mockResolvedValue(whatsNewContent.version);

    const { result } = renderHook(() => useWhatsNew(true, true));
    await waitFor(() => expect(storeApi.loadLastSeenVersion).toHaveBeenCalled());
    expect(result.current.whatsNewOpen).toBe(false);

    act(() => {
      result.current.handleWhatsNewOpen();
    });

    expect(result.current.whatsNewOpen).toBe(true);
  });
});
