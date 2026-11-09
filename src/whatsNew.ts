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
  version: '1.2.1',
  changes: [
    {
      type: 'feature',
      titleKey: 'whatsNew.changes.plantuml.title',
      descriptionKey: 'whatsNew.changes.plantuml.description',
    },
    {
      type: 'improvement',
      titleKey: 'whatsNew.changes.tableColumnWrapping.title',
      descriptionKey: 'whatsNew.changes.tableColumnWrapping.description',
    },
    {
      type: 'fix',
      titleKey: 'whatsNew.changes.nestedTaskLists.title',
      descriptionKey: 'whatsNew.changes.nestedTaskLists.description',
    },
    {
      type: 'fix',
      titleKey: 'whatsNew.changes.pdfDiagramTheme.title',
      descriptionKey: 'whatsNew.changes.pdfDiagramTheme.description',
    },
    {
      type: 'fix',
      titleKey: 'whatsNew.changes.searchShortcutFocus.title',
      descriptionKey: 'whatsNew.changes.searchShortcutFocus.description',
    },
    {
      type: 'improvement',
      titleKey: 'whatsNew.changes.starOnGitHub.title',
      descriptionKey: 'whatsNew.changes.starOnGitHub.description',
    },
    {
      type: 'improvement',
      titleKey: 'whatsNew.changes.libraryUpdates.title',
      descriptionKey: 'whatsNew.changes.libraryUpdates.description',
    },
  ],
};
