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
  version: '0.7.1',
  changes: [
    {
      type: 'fix',
      titleKey: 'whatsNew.changes.undoRedoIsolation.title',
      descriptionKey: 'whatsNew.changes.undoRedoIsolation.description',
    },
    {
      type: 'fix',
      titleKey: 'whatsNew.changes.katexTableCell.title',
      descriptionKey: 'whatsNew.changes.katexTableCell.description',
    },
    {
      type: 'fix',
      titleKey: 'whatsNew.changes.imageLinkHandling.title',
      descriptionKey: 'whatsNew.changes.imageLinkHandling.description',
    },
  ],
};
