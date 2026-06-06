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
  version: '0.9.0',
  changes: [
    {
      type: 'feature',
      titleKey: 'whatsNew.changes.newThemes.title',
      descriptionKey: 'whatsNew.changes.newThemes.description',
    },
    {
      type: 'feature',
      titleKey: 'whatsNew.changes.tableEditing.title',
      descriptionKey: 'whatsNew.changes.tableEditing.description',
    },
    {
      type: 'feature',
      titleKey: 'whatsNew.changes.verticalTabHover.title',
      descriptionKey: 'whatsNew.changes.verticalTabHover.description',
    },
    {
      type: 'feature',
      titleKey: 'whatsNew.changes.marpExternalCss.title',
      descriptionKey: 'whatsNew.changes.marpExternalCss.description',
    },
    {
      type: 'feature',
      titleKey: 'whatsNew.changes.newTabButtonPosition.title',
      descriptionKey: 'whatsNew.changes.newTabButtonPosition.description',
    },
    {
      type: 'feature',
      titleKey: 'whatsNew.changes.formattingBarToggle.title',
      descriptionKey: 'whatsNew.changes.formattingBarToggle.description',
    },
    {
      type: 'improvement',
      titleKey: 'whatsNew.changes.statusBarSettings.title',
      descriptionKey: 'whatsNew.changes.statusBarSettings.description',
    },
    {
      type: 'improvement',
      titleKey: 'whatsNew.changes.scrollSyncTwoWay.title',
      descriptionKey: 'whatsNew.changes.scrollSyncTwoWay.description',
    },
    {
      type: 'fix',
      titleKey: 'whatsNew.changes.tabDragFix.title',
      descriptionKey: 'whatsNew.changes.tabDragFix.description',
    },
  ],
};
