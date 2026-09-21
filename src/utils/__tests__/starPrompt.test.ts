import { describe, it, expect } from 'vitest';
import {
  DEFAULT_STAR_PROMPT_STATE,
  STAR_PROMPT_COOLDOWN_DAYS,
  STAR_PROMPT_INITIAL_SAVE_THRESHOLD,
  STAR_PROMPT_MAX_DECLINES,
  STAR_PROMPT_MIN_DAYS_USED,
  StarPromptState,
  completeStarPrompt,
  declineStarPrompt,
  getStarPromptBlockReason,
  normalizeStarPromptState,
  recordStarPromptSave,
  toLocalDayKey,
} from '../starPrompt';

const DAY = 24 * 60 * 60 * 1000;
const T0 = new Date(2026, 8, 20, 10, 0, 0).getTime();

const eligible = (overrides: Partial<StarPromptState> = {}): StarPromptState => ({
  ...DEFAULT_STAR_PROMPT_STATE,
  daysUsed: STAR_PROMPT_MIN_DAYS_USED,
  saveCount: STAR_PROMPT_INITIAL_SAVE_THRESHOLD,
  ...overrides,
});

describe('starPrompt', () => {
  describe('recordStarPromptSave', () => {
    it('T-SP-01: counts a save and the first day of use', () => {
      const next = recordStarPromptSave(DEFAULT_STAR_PROMPT_STATE, T0);
      expect(next.saveCount).toBe(1);
      expect(next.daysUsed).toBe(1);
      expect(next.lastUsedDay).toBe(toLocalDayKey(T0));
    });

    it('T-SP-02: several saves on the same day count as one day', () => {
      let s = recordStarPromptSave(DEFAULT_STAR_PROMPT_STATE, T0);
      s = recordStarPromptSave(s, T0 + 60_000);
      expect(s.saveCount).toBe(2);
      expect(s.daysUsed).toBe(1);
    });

    it('T-SP-03: a save on another day adds a day', () => {
      let s = recordStarPromptSave(DEFAULT_STAR_PROMPT_STATE, T0);
      s = recordStarPromptSave(s, T0 + DAY);
      expect(s.daysUsed).toBe(2);
    });
  });

  describe('getStarPromptBlockReason', () => {
    it('T-SP-04: allows the prompt once both thresholds are met', () => {
      expect(getStarPromptBlockReason(eligible(), T0, false)).toBeNull();
    });

    it('T-SP-05: blocks on too few days, then on too few saves', () => {
      expect(getStarPromptBlockReason(eligible({ daysUsed: STAR_PROMPT_MIN_DAYS_USED - 1 }), T0, false)).toBe('days');
      expect(getStarPromptBlockReason(eligible({ saveCount: STAR_PROMPT_INITIAL_SAVE_THRESHOLD - 1 }), T0, false)).toBe('saves');
    });

    it('T-SP-06: blocks in the first session after an update', () => {
      expect(getStarPromptBlockReason(eligible(), T0, true)).toBe('updated-session');
    });

    it('T-SP-07: blocks during the cooldown and releases afterwards', () => {
      const s = eligible({ deferredUntil: T0 + DAY });
      expect(getStarPromptBlockReason(s, T0, false)).toBe('cooldown');
      expect(getStarPromptBlockReason(s, T0 + DAY, false)).toBeNull();
    });

    it('T-SP-08: a completed prompt never shows', () => {
      expect(getStarPromptBlockReason(eligible({ completed: true }), T0, false)).toBe('completed');
    });
  });

  describe('declineStarPrompt', () => {
    it('T-SP-09: starts a cooldown, doubles the threshold and re-baselines saves', () => {
      const s = declineStarPrompt(eligible({ saveCount: 42 }), T0);
      expect(s.declineCount).toBe(1);
      expect(s.saveThreshold).toBe(STAR_PROMPT_INITIAL_SAVE_THRESHOLD * 2);
      expect(s.saveBaseline).toBe(42);
      expect(s.deferredUntil).toBe(T0 + STAR_PROMPT_COOLDOWN_DAYS * DAY);
      expect(s.completed).toBe(false);
      // After the cooldown the doubled save count is still required.
      expect(getStarPromptBlockReason(s, s.deferredUntil!, false)).toBe('saves');
    });

    it('T-SP-10: retires the prompt after the maximum number of declines', () => {
      let s = eligible();
      for (let i = 0; i < STAR_PROMPT_MAX_DECLINES; i++) s = declineStarPrompt(s, T0);
      expect(s.completed).toBe(true);
      expect(s.deferredUntil).toBeNull();
    });
  });

  it('T-SP-11: completeStarPrompt marks completion and clears the cooldown', () => {
    const s = completeStarPrompt(eligible({ deferredUntil: T0 + DAY }));
    expect(s.completed).toBe(true);
    expect(s.deferredUntil).toBeNull();
  });

  describe('normalizeStarPromptState', () => {
    it('T-SP-12: falls back to defaults for missing or non-object input', () => {
      expect(normalizeStarPromptState(null)).toEqual(DEFAULT_STAR_PROMPT_STATE);
      expect(normalizeStarPromptState('nope')).toEqual(DEFAULT_STAR_PROMPT_STATE);
    });

    it('T-SP-13: repairs corrupt fields instead of trusting them', () => {
      const s = normalizeStarPromptState({
        completed: 'yes', daysUsed: -3, saveCount: 10, saveBaseline: 99, saveThreshold: 0, deferredUntil: 'soon',
      });
      expect(s.completed).toBe(false);
      expect(s.daysUsed).toBe(0);
      expect(s.saveBaseline).toBe(10);
      expect(s.saveThreshold).toBe(1);
      expect(s.deferredUntil).toBeNull();
    });
  });
});
