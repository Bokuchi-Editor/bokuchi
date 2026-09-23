import { useState, useEffect, useCallback, useRef } from 'react';
import { openUrl } from '@tauri-apps/plugin-opener';
import { storeApi } from '../api/storeApi';
import { whatsNewContent } from '../whatsNew';
import {
  StarPromptState,
  DEFAULT_STAR_PROMPT_STATE,
  STAR_PROMPT_REPO_URL,
  STAR_PROMPT_SHOW_DELAY_MS,
  STAR_PROMPT_MIN_DAYS_USED,
  recordStarPromptSave,
  getStarPromptBlockReason,
  declineStarPrompt,
  completeStarPrompt,
} from '../utils/starPrompt';

/** True while any dialog or menu is open; the card must never pop up behind or beside one. */
const isModalUiOpen = (): boolean =>
  document.querySelector('.MuiDialog-root, .MuiPopover-root') !== null;

export interface UseStarPromptParams {
  isInitialized: boolean;
  isSettingsLoaded: boolean;
  /** Caller-known reasons to stay quiet (e.g. 臨 focus mode). Re-checked right before showing. */
  blocked: boolean;
}

/**
 * Drives the "star Bokuchi on GitHub" card.
 *
 * Call `notifyManualSave()` after every successful manual save. The hook
 * counts usage, and once the thresholds in utils/starPrompt.ts are met it
 * shows the card shortly after the save confirmation — a natural pause, the
 * one moment the user is not mid-thought.
 */
export const useStarPrompt = ({ isInitialized, isSettingsLoaded, blocked }: UseStarPromptParams) => {
  const [starPromptVisible, setStarPromptVisible] = useState(false);
  // True once the user has declined before: the card then also offers "Don't show again".
  const [starPromptShowNever, setStarPromptShowNever] = useState(false);

  // The persisted state lives in a ref: saves must not re-render the app, and
  // handlers always need the latest value regardless of when they were created.
  const stateRef = useRef<StarPromptState | null>(null);
  const updatedThisSessionRef = useRef(false);
  const visibleRef = useRef(false);
  const blockedRef = useRef(blocked);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    blockedRef.current = blocked;
  }, [blocked]);

  const persist = useCallback((next: StarPromptState) => {
    stateRef.current = next;
    void storeApi.saveStarPromptState(next);
  }, []);

  const show = useCallback(() => {
    visibleRef.current = true;
    setStarPromptShowNever((stateRef.current?.declineCount ?? 0) >= 1);
    setStarPromptVisible(true);
  }, []);

  const hide = useCallback(() => {
    visibleRef.current = false;
    setStarPromptVisible(false);
  }, []);

  // Load once on startup and detect "first session after an update".
  useEffect(() => {
    if (!isInitialized || !isSettingsLoaded) return;
    let cancelled = false;

    const load = async () => {
      const loaded = await storeApi.loadStarPromptState();
      if (cancelled) return;
      const currentVersion = whatsNewContent.version;
      // Why: What's New owns the first session after an update. A null
      // version is a fresh profile, not an update.
      updatedThisSessionRef.current = loaded.appVersion !== null && loaded.appVersion !== currentVersion;
      if (loaded.appVersion !== currentVersion) {
        persist({ ...loaded, appVersion: currentVersion });
      } else {
        stateRef.current = loaded;
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [isInitialized, isSettingsLoaded, persist]);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const notifyManualSave = useCallback(() => {
    const current = stateRef.current;
    // Not loaded yet, or nothing left to do: skip the store write entirely.
    if (!current || current.completed) return;

    const next = recordStarPromptSave(current, Date.now());
    persist(next);

    if (visibleRef.current) return;
    if (getStarPromptBlockReason(next, Date.now(), updatedThisSessionRef.current) !== null) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      const latest = stateRef.current;
      if (!latest || visibleRef.current) return;
      // Why: re-check after the quiet delay — the user may have opened a
      // dialog or entered focus mode meanwhile. A skipped prompt simply
      // retries on the next save.
      if (blockedRef.current || isModalUiOpen()) return;
      if (getStarPromptBlockReason(latest, Date.now(), updatedThisSessionRef.current) !== null) return;
      show();
    }, STAR_PROMPT_SHOW_DELAY_MS);
  }, [persist, show]);

  const handleStarPromptStar = useCallback(async () => {
    try {
      await openUrl(STAR_PROMPT_REPO_URL);
    } catch (error) {
      // Why: keep the card up so the user can retry; nothing was achieved yet.
      console.error('Failed to open the GitHub repository:', error);
      return;
    }
    hide();
    persist(completeStarPrompt(stateRef.current ?? DEFAULT_STAR_PROMPT_STATE));
  }, [hide, persist]);

  const handleStarPromptLater = useCallback(() => {
    hide();
    persist(declineStarPrompt(stateRef.current ?? DEFAULT_STAR_PROMPT_STATE, Date.now()));
  }, [hide, persist]);

  const handleStarPromptNever = useCallback(() => {
    hide();
    persist(completeStarPrompt(stateRef.current ?? DEFAULT_STAR_PROMPT_STATE));
  }, [hide, persist]);

  // Dev-only console helpers so the card can be checked without five days of saves:
  //   __bokuchiStarPrompt.show()   force the card
  //   __bokuchiStarPrompt.arm()    make the very next manual save eligible
  //   __bokuchiStarPrompt.reset()  wipe the persisted state
  //   __bokuchiStarPrompt.state()  inspect the persisted state
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const w = window as unknown as { __bokuchiStarPrompt?: unknown };
    w.__bokuchiStarPrompt = {
      show,
      reset: () => {
        hide();
        updatedThisSessionRef.current = false;
        persist({ ...DEFAULT_STAR_PROMPT_STATE, appVersion: whatsNewContent.version });
      },
      arm: () => {
        hide();
        updatedThisSessionRef.current = false;
        const base = stateRef.current ?? DEFAULT_STAR_PROMPT_STATE;
        persist({
          ...base,
          completed: false,
          deferredUntil: null,
          daysUsed: Math.max(base.daysUsed, STAR_PROMPT_MIN_DAYS_USED),
          saveBaseline: Math.max(base.saveCount - base.saveThreshold + 1, 0),
          saveCount: Math.max(base.saveCount, base.saveThreshold - 1),
          appVersion: whatsNewContent.version,
        });
      },
      state: () => stateRef.current,
    };
    return () => {
      delete w.__bokuchiStarPrompt;
    };
  }, [show, hide, persist]);

  return {
    starPromptVisible,
    starPromptShowNever,
    notifyManualSave,
    handleStarPromptStar,
    handleStarPromptLater,
    handleStarPromptNever,
  };
};
