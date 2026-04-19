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
  version: '0.8.0',
  changes: [
    {
      type: 'feature',
      titleKey: 'whatsNew.changes.marpPreview.title',
      descriptionKey: 'whatsNew.changes.marpPreview.description',
    },
    {
      type: 'feature',
      titleKey: 'whatsNew.changes.tabContextMenu.title',
      descriptionKey: 'whatsNew.changes.tabContextMenu.description',
    },
    {
      type: 'feature',
      titleKey: 'whatsNew.changes.tabPinning.title',
      descriptionKey: 'whatsNew.changes.tabPinning.description',
    },
    {
      type: 'feature',
      titleKey: 'whatsNew.changes.tabRename.title',
      descriptionKey: 'whatsNew.changes.tabRename.description',
    },
    {
      type: 'feature',
      titleKey: 'whatsNew.changes.tabUnsavedTitle.title',
      descriptionKey: 'whatsNew.changes.tabUnsavedTitle.description',
    },
    {
      type: 'feature',
      titleKey: 'whatsNew.changes.tabCloseButtonPosition.title',
      descriptionKey: 'whatsNew.changes.tabCloseButtonPosition.description',
    },
    {
      type: 'feature',
      titleKey: 'whatsNew.changes.scrollSyncMode.title',
      descriptionKey: 'whatsNew.changes.scrollSyncMode.description',
    },
    {
      type: 'fix',
      titleKey: 'whatsNew.changes.previewExternalChange.title',
      descriptionKey: 'whatsNew.changes.previewExternalChange.description',
    },
  ],
};
