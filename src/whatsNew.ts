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
  version: '0.8.3',
  changes: [
    {
      type: 'feature',
      titleKey: 'whatsNew.changes.tableLayoutSetting.title',
      descriptionKey: 'whatsNew.changes.tableLayoutSetting.description',
    },
    {
      type: 'fix',
      titleKey: 'whatsNew.changes.mermaidInMarp.title',
      descriptionKey: 'whatsNew.changes.mermaidInMarp.description',
    },
    {
      type: 'improvement',
      titleKey: 'whatsNew.changes.darculaCodeContrast.title',
      descriptionKey: 'whatsNew.changes.darculaCodeContrast.description',
    },
  ],
};
