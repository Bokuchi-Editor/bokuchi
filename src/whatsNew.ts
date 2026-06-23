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
  version: '0.9.3',
  changes: [
    {
      type: 'improvement',
      titleKey: 'whatsNew.changes.marpImageMemory.title',
      descriptionKey: 'whatsNew.changes.marpImageMemory.description',
    },
    {
      type: 'fix',
      titleKey: 'whatsNew.changes.outlineJumpPreview.title',
      descriptionKey: 'whatsNew.changes.outlineJumpPreview.description',
    },
    {
      type: 'fix',
      titleKey: 'whatsNew.changes.rinEscapePriority.title',
      descriptionKey: 'whatsNew.changes.rinEscapePriority.description',
    },
    {
      type: 'fix',
      titleKey: 'whatsNew.changes.htmlExportCodeBlock.title',
      descriptionKey: 'whatsNew.changes.htmlExportCodeBlock.description',
    },
    {
      type: 'improvement',
      titleKey: 'whatsNew.changes.rinButtonPlacement.title',
      descriptionKey: 'whatsNew.changes.rinButtonPlacement.description',
    },
    {
      type: 'improvement',
      titleKey: 'whatsNew.changes.dependencyUpdates.title',
      descriptionKey: 'whatsNew.changes.dependencyUpdates.description',
    },
  ],
};
