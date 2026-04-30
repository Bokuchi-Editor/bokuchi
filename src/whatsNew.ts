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
  version: '0.8.1',
  changes: [
    {
      type: 'fix',
      titleKey: 'whatsNew.changes.marpFullscreenSlide.title',
      descriptionKey: 'whatsNew.changes.marpFullscreenSlide.description',
    },
    {
      type: 'fix',
      titleKey: 'whatsNew.changes.marpPreviewScrollbar.title',
      descriptionKey: 'whatsNew.changes.marpPreviewScrollbar.description',
    },
    {
      type: 'fix',
      titleKey: 'whatsNew.changes.marpExternalLinks.title',
      descriptionKey: 'whatsNew.changes.marpExternalLinks.description',
    },
    {
      type: 'fix',
      titleKey: 'whatsNew.changes.windowsSaveReliability.title',
      descriptionKey: 'whatsNew.changes.windowsSaveReliability.description',
    },
    {
      type: 'fix',
      titleKey: 'whatsNew.changes.editorRapidTyping.title',
      descriptionKey: 'whatsNew.changes.editorRapidTyping.description',
    },
  ],
};
