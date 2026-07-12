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
  version: '1.0.0',
  changes: [
    {
      type: 'feature',
      titleKey: 'whatsNew.changes.pdfExport.title',
      descriptionKey: 'whatsNew.changes.pdfExport.description',
    },
    {
      type: 'feature',
      titleKey: 'whatsNew.changes.customThemes.title',
      descriptionKey: 'whatsNew.changes.customThemes.description',
    },
    {
      type: 'feature',
      titleKey: 'whatsNew.changes.dragDropImages.title',
      descriptionKey: 'whatsNew.changes.dragDropImages.description',
    },
    {
      type: 'feature',
      titleKey: 'whatsNew.changes.listContinuation.title',
      descriptionKey: 'whatsNew.changes.listContinuation.description',
    },
    {
      type: 'improvement',
      titleKey: 'whatsNew.changes.marpOfflineFonts.title',
      descriptionKey: 'whatsNew.changes.marpOfflineFonts.description',
    },
    {
      type: 'improvement',
      titleKey: 'whatsNew.changes.dependencyUpdates.title',
      descriptionKey: 'whatsNew.changes.dependencyUpdates.description',
    },
  ],
};
