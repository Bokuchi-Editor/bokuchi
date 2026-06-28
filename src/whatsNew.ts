/**
 * What's New content for each version.
 *
 * How to update:
 * 1. Change `version` to the new version string (must match package.json)
 * 2. Update the `changes` array with the new features/fixes/improvements
 * 3. That's it — the modal will automatically show on first launch after update
 */

export interface WhatsNewChange {
  /** 'feature' | 'fix' | 'improvement' */
  type: 'feature' | 'fix' | 'improvement';
  /** i18n key for the title (under whatsNew.changes.*) */
  titleKey: string;
  /** i18n key for the description (under whatsNew.changes.*) */
  descriptionKey?: string;
}

export interface WhatsNewContent {
  version: string;
  changes: WhatsNewChange[];
}

// ============================================================
// Edit this object for each release
// ============================================================
export const whatsNewContent: WhatsNewContent = {
  version: '0.9.4',
  changes: [
    {
      type: 'feature',
      titleKey: 'whatsNew.changes.outlineOff.title',
      descriptionKey: 'whatsNew.changes.outlineOff.description',
    },
    {
      type: 'feature',
      titleKey: 'whatsNew.changes.raspberryPiBuild.title',
      descriptionKey: 'whatsNew.changes.raspberryPiBuild.description',
    },
    {
      type: 'improvement',
      titleKey: 'whatsNew.changes.viewModePersistence.title',
      descriptionKey: 'whatsNew.changes.viewModePersistence.description',
    },
    {
      type: 'fix',
      titleKey: 'whatsNew.changes.cjkEmphasis.title',
      descriptionKey: 'whatsNew.changes.cjkEmphasis.description',
    },
    {
      type: 'fix',
      titleKey: 'whatsNew.changes.externalImages.title',
      descriptionKey: 'whatsNew.changes.externalImages.description',
    },
    {
      type: 'improvement',
      titleKey: 'whatsNew.changes.dependencyUpdates.title',
      descriptionKey: 'whatsNew.changes.dependencyUpdates.description',
    },
  ],
};
