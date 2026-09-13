import type { PreviewDirection } from '../types/settings';

// UI languages written right-to-left. Only 'ar' is currently among the
// supported UI languages; the others are listed so a future locale addition
// inherits the RTL preview default for free (#499).
const RTL_UI_LANGUAGES = new Set(['ar', 'he', 'fa', 'ur']);

/**
 * Resolves the effective preview text direction (#499).
 *
 * An explicitly stored choice always wins. When the user has never touched the
 * setting, RTL UI languages (Arabic) default to 'rtl' so the preview works
 * out of the box with no extra click; everyone else gets 'auto', which renders
 * LTR documents exactly as before while still detecting fully-RTL documents.
 */
export function resolvePreviewDirection(
  stored: PreviewDirection | undefined,
  uiLanguage: string | undefined,
): PreviewDirection {
  if (stored) return stored;
  const base = (uiLanguage ?? '').toLowerCase().split('-')[0];
  return RTL_UI_LANGUAGES.has(base) ? 'rtl' : 'auto';
}
