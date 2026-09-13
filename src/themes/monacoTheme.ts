import type { editor } from 'monaco-editor';
import { blendHex, normalizeHex } from '../utils/colorUtils';
import { getThemeColorTokens, isDarkTheme, type ThemeId } from './index';

/**
 * Monaco theme derived from the app theme's 7 palette tokens.
 *
 * Historically the editor pane only switched between Monaco's built-in
 * `vs` / `vs-dark` skins, so every theme except Default/Dark showed a
 * noticeably different editor background from the surrounding UI (#525).
 * We keep the built-in skin as the *base* (token/syntax colors, selection,
 * widgets) and override only the surface colors that are visible at a
 * glance — background, foreground, gutter, cursor, guides — so the editor
 * blends into the theme without exposing Monaco's palette as settings.
 *
 * The theme is always registered under one fixed name and re-defined when the
 * app theme changes; Monaco refreshes the active theme on redefinition.
 */
export const MONACO_THEME_NAME = 'bokuchi';

export function buildMonacoThemeData(themeId: ThemeId): editor.IStandaloneThemeData {
  const dark = isDarkTheme(themeId);
  const c = getThemeColorTokens(themeId);
  // Monaco only parses hex colors; presets that leave a token to MUI's default
  // (e.g. Default's divider = rgba(0,0,0,0.12)) must be normalized or derived.
  const bg = normalizeHex(c.backgroundDefault) ?? (dark ? '#1e1e1e' : '#fffffe');
  const fg = normalizeHex(c.textPrimary) ?? (dark ? '#d4d4d4' : '#000000');
  const paper = normalizeHex(c.backgroundPaper) ?? bg;
  const secondary = normalizeHex(c.textSecondary) ?? blendHex(fg, bg, 0.4);
  const divider = normalizeHex(c.divider) ?? blendHex(bg, fg, 0.12);

  return {
    base: dark ? 'vs-dark' : 'vs',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': bg,
      'editor.foreground': fg,
      'editorGutter.background': bg,
      'editorCursor.foreground': fg,
      'editorLineNumber.foreground': secondary,
      'editorLineNumber.activeForeground': fg,
      // Subtle current-line frame in the same hue family as the background.
      'editor.lineHighlightBackground': blendHex(bg, fg, 0.04),
      'editor.lineHighlightBorder': blendHex(bg, fg, 0.1),
      'editorIndentGuide.background1': blendHex(bg, fg, 0.15),
      'editorIndentGuide.activeBackground1': blendHex(bg, fg, 0.35),
      'editorWhitespace.foreground': blendHex(bg, fg, 0.3),
      // Floating widgets (hover / suggest / context) sit on the paper surface.
      'editorWidget.background': paper,
      'editorWidget.border': divider,
      'editorHoverWidget.background': paper,
      'editorHoverWidget.border': divider,
      'editorSuggestWidget.background': paper,
      'editorSuggestWidget.border': divider,
      'minimap.background': bg,
    },
  };
}

/** Minimal slice of the Monaco namespace this module needs (keeps tests free of the real bundle). */
export interface MonacoThemeHost {
  editor: {
    defineTheme: (name: string, data: editor.IStandaloneThemeData) => void;
    setTheme: (name: string) => void;
  };
}

/**
 * (Re)define the app's Monaco theme for `themeId` and make it active.
 * Safe to call before any editor instance exists — the definition is global
 * and picked up when `@monaco-editor/react` calls setTheme on mount.
 */
export function applyMonacoTheme(monaco: MonacoThemeHost, themeId: ThemeId): void {
  monaco.editor.defineTheme(MONACO_THEME_NAME, buildMonacoThemeData(themeId));
  monaco.editor.setTheme(MONACO_THEME_NAME);
}
