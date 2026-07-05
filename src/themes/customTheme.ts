import { createTheme, Theme } from '@mui/material/styles';
import { blendHex, hexToRgba, normalizeHex } from '../utils/colorUtils';

/**
 * User-defined custom theme.
 *
 * A custom theme is always created by duplicating a preset (or another custom
 * theme) and carries exactly the 7 palette tokens the UI exposes. The Monaco
 * editor pane cannot be recolored per-token — it only switches between the
 * built-in `vs` / `vs-dark` skins — so `mode` doubles as the editor skin
 * selector and the dark/light switch for mode-dependent styles.
 */
export interface CustomThemeColors {
  backgroundDefault: string;
  backgroundPaper: string;
  textPrimary: string;
  textSecondary: string;
  primaryMain: string;
  secondaryMain: string;
  divider: string;
}

export interface CustomTheme {
  /** Unique id, always `custom:<uuid>`. Stored in settings.appearance.theme when active. */
  id: string;
  name: string;
  /** Preset this theme was (transitively) duplicated from; target of "reset colors to base". */
  baseTheme: string;
  mode: 'light' | 'dark';
  colors: CustomThemeColors;
}

export const CUSTOM_THEME_ID_PREFIX = 'custom:';

export function isCustomThemeId(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith(CUSTOM_THEME_ID_PREFIX);
}

export function createCustomThemeId(): string {
  return CUSTOM_THEME_ID_PREFIX + crypto.randomUUID();
}

export const CUSTOM_THEME_COLOR_KEYS: (keyof CustomThemeColors)[] = [
  'backgroundDefault',
  'backgroundPaper',
  'textPrimary',
  'textSecondary',
  'primaryMain',
  'secondaryMain',
  'divider',
];

/** Build the MUI theme for a custom theme. Mirrors how the preset themes are defined. */
export function buildMuiThemeFromCustom(custom: CustomTheme): Theme {
  return createTheme({
    palette: {
      mode: custom.mode,
      primary: {
        main: custom.colors.primaryMain,
      },
      secondary: {
        main: custom.colors.secondaryMain,
      },
      background: {
        default: custom.colors.backgroundDefault,
        paper: custom.colors.backgroundPaper,
      },
      text: {
        primary: custom.colors.textPrimary,
        secondary: custom.colors.textSecondary,
      },
      divider: custom.colors.divider,
    },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            // Disable Paper overlay effect (same as the preset dark themes)
            backgroundImage: 'none',
            '&::before': {
              display: 'none',
            },
          },
        },
      },
    },
  });
}

// Syntax / search-highlight defaults per mode. These mirror the values the
// preset themes use in variables.css (`:root` for light, `[data-theme="dark"]`
// for dark) — custom themes derive them from `mode` instead of exposing 20+
// extra pickers. The comment color follows text-secondary like the newer
// presets (Dawn / Twilight / Silk / Ink) do.
const LIGHT_MODE_DERIVED = {
  syntaxKeyword: '#d73a49',
  syntaxString: '#032f62',
  syntaxNumber: '#005cc5',
  syntaxFunction: '#6f42c1',
  syntaxVariable: '#e36209',
  syntaxType: '#005cc5',
  searchHighlight: '#ffeb3b',
  searchHighlightText: '#000000',
  searchCurrentHighlight: '#ff9800',
  searchCurrentHighlightText: '#000000',
  codeBackgroundAlpha: 0.08,
};

const DARK_MODE_DERIVED = {
  syntaxKeyword: '#ff7b72',
  syntaxString: '#a5d6ff',
  syntaxNumber: '#79c0ff',
  syntaxFunction: '#d2a8ff',
  syntaxVariable: '#ffa657',
  syntaxType: '#79c0ff',
  searchHighlight: '#ffd54f',
  searchHighlightText: '#000000',
  searchCurrentHighlight: '#ff9800',
  searchCurrentHighlightText: '#000000',
  codeBackgroundAlpha: 0.1,
};

/**
 * Derive the full variables.css set for a custom theme from its 7 tokens +
 * mode. Injected as inline properties on <html> by applyThemeToDocument, so
 * they override the `:root` light defaults without needing a generated
 * `[data-theme=...]` stylesheet block.
 */
export function deriveCssVariablesFromCustom(custom: CustomTheme): Record<string, string> {
  const { colors, mode } = custom;
  const derived = mode === 'dark' ? DARK_MODE_DERIVED : LIGHT_MODE_DERIVED;
  return {
    '--color-primary': colors.primaryMain,
    '--color-primary-hover': blendHex(colors.primaryMain, '#000000', 0.15),
    '--color-background': colors.backgroundDefault,
    '--color-surface': colors.backgroundPaper,
    '--color-text': colors.textPrimary,
    '--color-text-secondary': colors.textSecondary,
    '--color-border': colors.divider,
    '--color-border-light': blendHex(colors.divider, colors.backgroundDefault, 0.5),

    '--color-code-background': hexToRgba(colors.textPrimary, derived.codeBackgroundAlpha),
    '--color-code-text': colors.textPrimary,
    '--color-pre-background': colors.backgroundPaper,
    '--color-pre-text': colors.textPrimary,

    '--color-syntax-comment': colors.textSecondary,
    '--color-syntax-keyword': derived.syntaxKeyword,
    '--color-syntax-string': derived.syntaxString,
    '--color-syntax-number': derived.syntaxNumber,
    '--color-syntax-function': derived.syntaxFunction,
    '--color-syntax-variable': derived.syntaxVariable,
    '--color-syntax-type': derived.syntaxType,

    '--color-search-highlight': derived.searchHighlight,
    '--color-search-highlight-text': derived.searchHighlightText,
    '--color-search-current-highlight': derived.searchCurrentHighlight,
    '--color-search-current-highlight-text': derived.searchCurrentHighlightText,

    '--color-status-background': colors.backgroundPaper,
    '--color-status-text': colors.textSecondary,
  };
}

/**
 * Validate and normalize a value loaded from persistent storage.
 * Returns the sanitized CustomTheme, or null when the entry is unusable
 * (corrupt store entries are dropped instead of crashing startup).
 */
export function validateCustomTheme(value: unknown): CustomTheme | null {
  if (typeof value !== 'object' || value === null) return null;
  const candidate = value as Record<string, unknown>;

  if (typeof candidate.id !== 'string' || !isCustomThemeId(candidate.id)) return null;
  if (typeof candidate.name !== 'string' || candidate.name.trim() === '') return null;
  if (candidate.mode !== 'light' && candidate.mode !== 'dark') return null;

  const baseTheme = typeof candidate.baseTheme === 'string' ? candidate.baseTheme : 'default';

  if (typeof candidate.colors !== 'object' || candidate.colors === null) return null;
  const rawColors = candidate.colors as Record<string, unknown>;
  const colors = {} as CustomThemeColors;
  for (const key of CUSTOM_THEME_COLOR_KEYS) {
    const raw = rawColors[key];
    const normalized = typeof raw === 'string' ? normalizeHex(raw) : null;
    if (!normalized) return null;
    colors[key] = normalized;
  }

  return {
    id: candidate.id,
    name: candidate.name.trim(),
    baseTheme,
    mode: candidate.mode,
    colors,
  };
}
