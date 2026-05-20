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
  version: '0.8.4',
  changes: [
    {
      type: 'fix',
      titleKey: 'whatsNew.changes.marpPreviewScroll.title',
      descriptionKey: 'whatsNew.changes.marpPreviewScroll.description',
    },
    {
      type: 'fix',
      titleKey: 'whatsNew.changes.editorModeShortcut.title',
      descriptionKey: 'whatsNew.changes.editorModeShortcut.description',
    },
    {
      type: 'improvement',
      titleKey: 'whatsNew.changes.batchCloseUnsavedPrompt.title',
      descriptionKey: 'whatsNew.changes.batchCloseUnsavedPrompt.description',
    },
  ],
};
