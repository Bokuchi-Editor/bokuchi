/**
 * Pure decision logic for the "star Bokuchi on GitHub" prompt card.
 *
 * The card is a small, non-modal ask shown right after a manual save once the
 * user has clearly been using the app for a while. Everything here is a pure
 * function of (state, now) so the rules can be unit-tested without React.
 *
 * Rules:
 * - Show once the user has saved on >= MIN_DAYS_USED distinct days AND made
 *   >= the current save threshold of manual saves since the last baseline.
 * - Declining ("Later" or close) starts a cooldown, doubles the save
 *   threshold, and re-baselines the save count. After MAX_DECLINES the prompt
 *   is retired for good.
 * - Opening GitHub counts as done: we cannot verify a star, and asking again
 *   someone who already starred is worse than missing a few.
 * - Never show in the first session after an app update; What's New owns
 *   that moment.
 */

export const STAR_PROMPT_REPO_URL = 'https://github.com/Bokuchi-Editor/bokuchi';

export const STAR_PROMPT_MIN_DAYS_USED = 5;
export const STAR_PROMPT_INITIAL_SAVE_THRESHOLD = 30;
export const STAR_PROMPT_COOLDOWN_DAYS = 30;
export const STAR_PROMPT_MAX_DECLINES = 3;
/** Quiet delay between the save confirmation and the card appearing. */
export const STAR_PROMPT_SHOW_DELAY_MS = 900;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface StarPromptState {
  /** True once the user opened GitHub, opted out, or declined too often. Never show again. */
  completed: boolean;
  /** Number of distinct local days with at least one manual save. */
  daysUsed: number;
  /** Local date (YYYY-MM-DD) of the most recent counted day. */
  lastUsedDay: string | null;
  /** Lifetime manual save count. */
  saveCount: number;
  /** Value of saveCount when the current countdown started. */
  saveBaseline: number;
  /** Saves since baseline required for the next prompt. */
  saveThreshold: number;
  /** How many times the user declined. */
  declineCount: number;
  /** Epoch ms until which the prompt stays quiet, or null. */
  deferredUntil: number | null;
  /** App version that last recorded a save; a change marks an "updated" session. */
  appVersion: string | null;
}

export const DEFAULT_STAR_PROMPT_STATE: StarPromptState = {
  completed: false,
  daysUsed: 0,
  lastUsedDay: null,
  saveCount: 0,
  saveBaseline: 0,
  saveThreshold: STAR_PROMPT_INITIAL_SAVE_THRESHOLD,
  declineCount: 0,
  deferredUntil: null,
  appVersion: null,
};

const toCount = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : fallback;

/** Coerce whatever came out of the store into a valid state (tolerates missing / corrupt fields). */
export const normalizeStarPromptState = (raw: unknown): StarPromptState => {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_STAR_PROMPT_STATE };
  const r = raw as Record<string, unknown>;
  const saveCount = toCount(r.saveCount, 0);
  return {
    completed: r.completed === true,
    daysUsed: toCount(r.daysUsed, 0),
    lastUsedDay: typeof r.lastUsedDay === 'string' ? r.lastUsedDay : null,
    saveCount,
    saveBaseline: Math.min(toCount(r.saveBaseline, 0), saveCount),
    saveThreshold: Math.max(toCount(r.saveThreshold, STAR_PROMPT_INITIAL_SAVE_THRESHOLD), 1),
    declineCount: toCount(r.declineCount, 0),
    deferredUntil: typeof r.deferredUntil === 'number' && Number.isFinite(r.deferredUntil) ? r.deferredUntil : null,
    appVersion: typeof r.appVersion === 'string' ? r.appVersion : null,
  };
};

/** Local calendar day key, so "a day of use" matches the user's own clock. */
export const toLocalDayKey = (now: number): string => {
  const d = new Date(now);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
};

/** Count one manual save. */
export const recordStarPromptSave = (state: StarPromptState, now: number): StarPromptState => {
  const day = toLocalDayKey(now);
  const isNewDay = state.lastUsedDay !== day;
  return {
    ...state,
    saveCount: state.saveCount + 1,
    daysUsed: isNewDay ? state.daysUsed + 1 : state.daysUsed,
    lastUsedDay: day,
  };
};

export type StarPromptBlockReason = 'completed' | 'updated-session' | 'cooldown' | 'days' | 'saves';

/**
 * Why the prompt must not show right now, or null when it may.
 * `updatedThisSession` is session state owned by the caller.
 */
export const getStarPromptBlockReason = (
  state: StarPromptState,
  now: number,
  updatedThisSession: boolean,
): StarPromptBlockReason | null => {
  if (state.completed) return 'completed';
  if (updatedThisSession) return 'updated-session';
  if (state.deferredUntil !== null && now < state.deferredUntil) return 'cooldown';
  if (state.daysUsed < STAR_PROMPT_MIN_DAYS_USED) return 'days';
  if (state.saveCount - state.saveBaseline < state.saveThreshold) return 'saves';
  return null;
};

/** "Later" or close: back off, or retire the prompt after too many declines. */
export const declineStarPrompt = (state: StarPromptState, now: number): StarPromptState => {
  const declineCount = state.declineCount + 1;
  if (declineCount >= STAR_PROMPT_MAX_DECLINES) {
    return { ...state, declineCount, completed: true, deferredUntil: null };
  }
  return {
    ...state,
    declineCount,
    saveThreshold: state.saveThreshold * 2,
    saveBaseline: state.saveCount,
    deferredUntil: now + STAR_PROMPT_COOLDOWN_DAYS * DAY_MS,
  };
};

/** Opened GitHub or chose "Don't show again". */
export const completeStarPrompt = (state: StarPromptState): StarPromptState => ({
  ...state,
  completed: true,
  deferredUntil: null,
});
