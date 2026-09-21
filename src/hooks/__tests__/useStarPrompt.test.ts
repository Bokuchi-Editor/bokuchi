import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

vi.mock('../../api/storeApi', () => ({
  storeApi: {
    loadStarPromptState: vi.fn(),
    saveStarPromptState: vi.fn().mockResolvedValue(undefined),
  },
}));
vi.mock('@tauri-apps/plugin-opener', () => ({
  openUrl: vi.fn().mockResolvedValue(undefined),
}));

import { useStarPrompt } from '../useStarPrompt';
import { storeApi } from '../../api/storeApi';
import { openUrl } from '@tauri-apps/plugin-opener';
import { whatsNewContent } from '../../whatsNew';
import {
  DEFAULT_STAR_PROMPT_STATE,
  STAR_PROMPT_INITIAL_SAVE_THRESHOLD,
  STAR_PROMPT_MIN_DAYS_USED,
  STAR_PROMPT_REPO_URL,
  STAR_PROMPT_SHOW_DELAY_MS,
  StarPromptState,
} from '../../utils/starPrompt';

// One save short of the threshold, so the next manual save makes the prompt eligible.
const almostEligible = (overrides: Partial<StarPromptState> = {}): StarPromptState => ({
  ...DEFAULT_STAR_PROMPT_STATE,
  daysUsed: STAR_PROMPT_MIN_DAYS_USED,
  lastUsedDay: null,
  saveCount: STAR_PROMPT_INITIAL_SAVE_THRESHOLD - 1,
  appVersion: whatsNewContent.version,
  ...overrides,
});

const lastSaved = (): StarPromptState => {
  const calls = vi.mocked(storeApi.saveStarPromptState).mock.calls;
  return calls[calls.length - 1][0];
};

/** Render, wait for the startup load, then switch to fake timers for the show delay. */
const setup = async (state: StarPromptState, blocked = false) => {
  vi.mocked(storeApi.loadStarPromptState).mockResolvedValue(state);
  const hook = renderHook(
    (props: { blocked: boolean }) => useStarPrompt({ isInitialized: true, isSettingsLoaded: true, blocked: props.blocked }),
    { initialProps: { blocked } },
  );
  await waitFor(() => expect(storeApi.loadStarPromptState).toHaveBeenCalled());
  await act(async () => { await Promise.resolve(); });
  vi.useFakeTimers();
  return hook;
};

const saveAndWait = (result: { current: ReturnType<typeof useStarPrompt> }) => {
  act(() => { result.current.notifyManualSave(); });
  act(() => { vi.advanceTimersByTime(STAR_PROMPT_SHOW_DELAY_MS); });
};

describe('useStarPrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(storeApi.saveStarPromptState).mockResolvedValue(undefined);
    vi.mocked(openUrl).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('T-USP-01: shows the card after the delay once a save crosses the thresholds', async () => {
    const { result } = await setup(almostEligible());
    act(() => { result.current.notifyManualSave(); });
    expect(result.current.starPromptVisible).toBe(false);
    act(() => { vi.advanceTimersByTime(STAR_PROMPT_SHOW_DELAY_MS); });
    expect(result.current.starPromptVisible).toBe(true);
    expect(result.current.starPromptShowNever).toBe(false);
    expect(lastSaved().saveCount).toBe(STAR_PROMPT_INITIAL_SAVE_THRESHOLD);
  });

  it('T-USP-02: counts the save but stays hidden below the thresholds', async () => {
    const { result } = await setup(almostEligible({ saveCount: 0 }));
    saveAndWait(result);
    expect(result.current.starPromptVisible).toBe(false);
    expect(lastSaved().saveCount).toBe(1);
  });

  it('T-USP-03: stays hidden for the whole first session after an update', async () => {
    const { result } = await setup(almostEligible({ appVersion: '0.0.1' }));
    // The new version is recorded right away so the next session is a normal one.
    expect(lastSaved().appVersion).toBe(whatsNewContent.version);
    saveAndWait(result);
    expect(result.current.starPromptVisible).toBe(false);
  });

  it('T-USP-04: a fresh profile (no recorded version) is not treated as an update', async () => {
    const { result } = await setup(almostEligible({ appVersion: null }));
    saveAndWait(result);
    expect(result.current.starPromptVisible).toBe(true);
  });

  it('T-USP-05: skips while blocked and retries on the next save', async () => {
    const { result, rerender } = await setup(almostEligible(), true);
    saveAndWait(result);
    expect(result.current.starPromptVisible).toBe(false);
    rerender({ blocked: false });
    saveAndWait(result);
    expect(result.current.starPromptVisible).toBe(true);
  });

  it('T-USP-06: skips when a dialog opened during the quiet delay', async () => {
    const { result } = await setup(almostEligible());
    act(() => { result.current.notifyManualSave(); });
    const dialog = document.createElement('div');
    dialog.className = 'MuiDialog-root';
    document.body.appendChild(dialog);
    act(() => { vi.advanceTimersByTime(STAR_PROMPT_SHOW_DELAY_MS); });
    expect(result.current.starPromptVisible).toBe(false);
  });

  it('T-USP-07: Star opens the repository and completes the prompt', async () => {
    const { result } = await setup(almostEligible());
    saveAndWait(result);
    await act(async () => { await result.current.handleStarPromptStar(); });
    expect(openUrl).toHaveBeenCalledWith(STAR_PROMPT_REPO_URL);
    expect(result.current.starPromptVisible).toBe(false);
    expect(lastSaved().completed).toBe(true);
  });

  it('T-USP-08: keeps the card up when the browser could not be opened', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(openUrl).mockRejectedValue(new Error('nope'));
    const { result } = await setup(almostEligible());
    saveAndWait(result);
    await act(async () => { await result.current.handleStarPromptStar(); });
    expect(result.current.starPromptVisible).toBe(true);
    expect(lastSaved().completed).toBe(false);
  });

  it('T-USP-09: Later hides the card and starts the backoff', async () => {
    const { result } = await setup(almostEligible());
    saveAndWait(result);
    act(() => { result.current.handleStarPromptLater(); });
    expect(result.current.starPromptVisible).toBe(false);
    expect(lastSaved().declineCount).toBe(1);
    expect(lastSaved().deferredUntil).not.toBeNull();
    expect(lastSaved().completed).toBe(false);
  });

  it('T-USP-10: offers "Don\'t show again" once the user has declined before, and it completes the prompt', async () => {
    const { result } = await setup(almostEligible({ declineCount: 1 }));
    saveAndWait(result);
    expect(result.current.starPromptShowNever).toBe(true);
    act(() => { result.current.handleStarPromptNever(); });
    expect(result.current.starPromptVisible).toBe(false);
    expect(lastSaved().completed).toBe(true);
  });

  it('T-USP-11: a completed prompt no longer writes to the store on save', async () => {
    const { result } = await setup(almostEligible({ completed: true }));
    saveAndWait(result);
    expect(storeApi.saveStarPromptState).not.toHaveBeenCalled();
    expect(result.current.starPromptVisible).toBe(false);
  });
});
