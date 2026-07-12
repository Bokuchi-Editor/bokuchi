/**
 * One-time milestone / thank-you message.
 *
 * Unlike What's New (which lists per-version changes), this is a celebratory
 * greeting shown once when a milestone release is first launched. It is gated
 * by `storeApi.loadSeenMilestones()` / `saveSeenMilestones()` using `id`.
 *
 * How to update for a future milestone:
 * 1. Change `id` to a new, never-before-used identifier (e.g. '2.0.0').
 * 2. Update `versionLabel` and the i18n keys under `milestone.*` in every locale.
 *    A new `id` guarantees the dialog shows again exactly once.
 */

export interface MilestoneContent {
  /** Unique id used to remember that this milestone was already shown. */
  id: string;
  /** Version label shown as a chip (not translated). */
  versionLabel: string;
  /** i18n key for the heading. */
  titleKey: string;
  /** i18n keys for the body paragraphs, in display order. */
  bodyKeys: string[];
}

// ============================================================
// Edit this object for each milestone release
// ============================================================
export const milestoneContent: MilestoneContent = {
  id: '1.0.0',
  versionLabel: '1.0.0',
  titleKey: 'milestone.thankYou.title',
  bodyKeys: [
    'milestone.thankYou.body1',
    'milestone.thankYou.body2',
    'milestone.thankYou.body3',
    'milestone.thankYou.body4',
    'milestone.thankYou.body5',
  ],
};
