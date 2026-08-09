/**
 * Font stacks and helpers for the user-selectable editor/preview fonts (#471).
 *
 * A setting value of '' (empty string) means "Default": the editor passes no
 * fontFamily to Monaco (platform monospace default) and the preview/export use
 * the stacks below — the exact values that were hardcoded before the setting
 * existed, so existing documents render unchanged.
 */

/** Preview / HTML export body stack (previous hardcoded value). */
export const DEFAULT_PREVIEW_FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

/** Fallback appended after a user-chosen editor font (Monaco's macOS default stack). */
export const EDITOR_FONT_FALLBACK_STACK = 'Menlo, Monaco, "Courier New", monospace';

/**
 * Build a CSS font-family value from a user-chosen family name, falling back to
 * `fallbackStack` when the name is empty ("Default") or the font is missing on
 * this machine (settings imported from another OS keep working — the browser
 * skips unknown families and uses the fallback).
 */
export function buildFontFamilyCss(family: string | undefined, fallbackStack: string): string {
  const trimmed = family?.trim();
  if (!trimmed) return fallbackStack;
  return `"${trimmed.replace(/"/g, '\\"')}", ${fallbackStack}`;
}
