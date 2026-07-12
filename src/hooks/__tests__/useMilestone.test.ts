import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../../api/storeApi', () => ({
  storeApi: {
    loadSeenMilestones: vi.fn().mockResolvedValue([]),
    saveSeenMilestones: vi.fn().mockResolvedValue(undefined),
  },
}));

import { useMilestone } from '../useMilestone';
import { storeApi } from '../../api/storeApi';
import { milestoneContent } from '../../milestone';

describe('useMilestone', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(storeApi.loadSeenMilestones).mockResolvedValue([]);
    vi.mocked(storeApi.saveSeenMilestones).mockResolvedValue(undefined);
  });

  it('stays pending and closed until initialization completes', () => {
    const { result } = renderHook(() => useMilestone(false, false));
    expect(result.current.milestoneOpen).toBe(false);
    // Pending defaults to true so What's New never races ahead of the greeting.
    expect(result.current.milestonePending).toBe(true);
  });

  it('opens the greeting when this milestone has not been seen', async () => {
    const { result } = renderHook(() => useMilestone(true, true));
    await waitFor(() => expect(result.current.milestoneOpen).toBe(true));
    // While the greeting is open, What's New must remain blocked.
    expect(result.current.milestonePending).toBe(true);
  });

  it('does not open and clears pending when already seen', async () => {
    vi.mocked(storeApi.loadSeenMilestones).mockResolvedValue([milestoneContent.id]);
    const { result } = renderHook(() => useMilestone(true, true));
    await waitFor(() => expect(result.current.milestonePending).toBe(false));
    expect(result.current.milestoneOpen).toBe(false);
  });

  it('persists the milestone id and clears pending on close', async () => {
    const { result } = renderHook(() => useMilestone(true, true));
    await waitFor(() => expect(result.current.milestoneOpen).toBe(true));

    await act(async () => {
      await result.current.handleMilestoneClose();
    });

    expect(result.current.milestoneOpen).toBe(false);
    expect(result.current.milestonePending).toBe(false);
    expect(storeApi.saveSeenMilestones).toHaveBeenCalledWith([milestoneContent.id]);
  });

  it('does not duplicate an already-recorded milestone id on close', async () => {
    vi.mocked(storeApi.loadSeenMilestones).mockResolvedValue([milestoneContent.id]);
    const { result } = renderHook(() => useMilestone(true, true));
    await waitFor(() => expect(result.current.milestonePending).toBe(false));

    await act(async () => {
      await result.current.handleMilestoneClose();
    });

    expect(storeApi.saveSeenMilestones).not.toHaveBeenCalled();
  });
});
