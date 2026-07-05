import { createTheme, Theme } from '@mui/material/styles';
import {
  CustomTheme,
  CustomThemeColors,
  buildMuiThemeFromCustom,
  createCustomThemeId,
  deriveCssVariablesFromCustom,
  isCustomThemeId,
} from './customTheme';

export type ThemeName = 'default' | 'dark' | 'pastel' | 'vivid' | 'dawn' | 'twilight' | 'silk' | 'ink' | 'darcula' | 'as400';

/**
 * Identifier accepted wherever a theme is referenced: either a preset
 * ThemeName or a custom theme id (`custom:<uuid>`). Kept as `string` because
 * custom ids are open-ended; helpers below resolve both kinds.
 */
export type ThemeId = string;

export interface ThemeConfig {
  name: ThemeName;
  displayName: string;
  theme: Theme;
  hidden?: boolean;
}

// Default Theme (Light)
const defaultTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#ffffff',
      paper: '#ffffff',
    },
    text: {
      primary: '#000000',
      secondary: '#666666',
    },
  },
});

// Dark Theme
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#90caf9',
    },
    secondary: {
      main: '#f48fb1',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
    text: {
      primary: '#ffffff',
      secondary: '#cccccc',
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          // Disable Paper overlay effect
          backgroundImage: 'none',
          '&::before': {
            display: 'none',
          },
        },
      },
    },
  },
});

// Pastel Theme (Soft, gentle colors)
const pastelTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#a8d5ba', // Soft mint green
    },
    secondary: {
      main: '#f7cac9', // Soft pink
    },
    background: {
      default: '#fefefe',
      paper: '#fafafa',
    },
    text: {
      primary: '#5a5a5a',
      secondary: '#8a8a8a',
    },
    divider: '#e8e8e8',
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#e8f5e8',
          color: '#5a5a5a',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#fafafa',
          border: '1px solid #e8e8e8',
        },
      },
    },
  },
  // Improve code syntax highlight visibility with custom CSS variables
  shape: {
    borderRadius: 8,
  },
});

// Vivid Theme (Bold, vibrant colors)
const vividTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#ff6b35', // Vibrant orange
    },
    secondary: {
      main: '#7209b7', // Vibrant purple
    },
    background: {
      default: '#ffffff',
      paper: '#ffffff',
    },
    text: {
      primary: '#2d3748',
      secondary: '#4a5568',
    },
    divider: '#e2e8f0',
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(45deg, #ff6b35 30%, #f7931e 90%)',
          color: '#ffffff',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          textTransform: 'none',
          fontWeight: 600,
        },
        contained: {
          boxShadow: '0 4px 8px rgba(255, 107, 53, 0.3)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        },
      },
    },
  },
  // Improve code syntax highlight visibility with custom CSS variables
  shape: {
    borderRadius: 12,
  },
});

// Dawn Theme (Akatsuki - Light with subtle warm/terracotta tint)
const dawnTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#785e4f',
    },
    secondary: {
      main: '#977e71',
    },
    background: {
      default: '#faf6f4',
      paper: '#f4edea',
    },
    text: {
      primary: '#39312d',
      secondary: '#796b64',
    },
    divider: '#e6dad2',
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          '&::before': {
            display: 'none',
          },
        },
      },
    },
  },
});

// Twilight Theme (Tasogare - Dark with subtle warm yellow tint)
const twilightTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#c8be9c',
    },
    secondary: {
      main: '#9a9078',
    },
    background: {
      default: '#25231d',
      paper: '#2d2a23',
    },
    text: {
      primary: '#e0dccc',
      secondary: '#aaa590',
    },
    divider: '#3a362e',
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          '&::before': {
            display: 'none',
          },
        },
      },
    },
  },
});

// Silk Theme (Kinu - Light monotone with faint blue tint)
const silkTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#6b6b72',
    },
    secondary: {
      main: '#7c7c81',
    },
    background: {
      default: '#f3f3f8',
      paper: '#ededf2',
    },
    text: {
      primary: '#2a2a2f',
      secondary: '#6c6c71',
    },
    divider: '#d8d8dd',
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          '&::before': {
            display: 'none',
          },
        },
      },
    },
  },
});

// Ink Theme (Sumi - Dark monotone with faint blue tint)
const inkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#a3a3ae',
    },
    secondary: {
      main: '#86868d',
    },
    background: {
      default: '#1f1f26',
      paper: '#292930',
    },
    text: {
      primary: '#dcdce3',
      secondary: '#a0a0a7',
    },
    divider: '#35353c',
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          '&::before': {
            display: 'none',
          },
        },
      },
    },
  },
});

// Darcula Theme (JetBrains IDE inspired)
const darculaTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#CC7832', // Orange-brown for keywords
    },
    secondary: {
      main: '#6A8759', // Muted green for strings
    },
    background: {
      default: '#2B2B2B', // Dark charcoal background
      paper: '#3C3F41', // Slightly lighter for cards
    },
    text: {
      primary: '#bac5d1', // Soft light blue-gray for plain text
      secondary: '#A0A0A0', // Medium gray for comments
    },
    divider: '#323232',
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#3C3F41',
          color: '#A9B7C6',
          borderBottom: '1px solid #323232',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#3C3F41',
          border: '1px solid #323232',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
        },
        contained: {
          backgroundColor: '#CC7832',
          color: '#2B2B2B',
          '&:hover': {
            backgroundColor: '#D18F4A',
          },
        },
        outlined: {
          borderColor: '#CC7832',
          color: '#CC7832',
          '&:hover': {
            backgroundColor: 'rgba(204, 120, 50, 0.1)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: '#3C3F41',
            '& fieldset': {
              borderColor: '#323232',
            },
            '&:hover fieldset': {
              borderColor: '#CC7832',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#CC7832',
            },
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          // Disable Paper overlay effect
          backgroundImage: 'none',
          '&::before': {
            display: 'none',
          },
        },
      },
    },
  },
  shape: {
    borderRadius: 4,
  },
});

// AS/400 Theme (IBM Green Screen / 5250 Terminal)
const as400Theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00FF00',
    },
    secondary: {
      main: '#33FF33',
    },
    background: {
      default: '#000000',
      paper: '#0a0a0a',
    },
    text: {
      primary: '#00FF00',
      secondary: '#00CC00',
    },
    divider: '#003300',
  },
  typography: {
    fontFamily: '"IBM Plex Mono", "Courier New", Courier, monospace',
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#001a00',
          color: '#00FF00',
          borderBottom: '1px solid #003300',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          '&::before': {
            display: 'none',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          fontFamily: '"IBM Plex Mono", "Courier New", Courier, monospace',
        },
        contained: {
          backgroundColor: '#003300',
          color: '#00FF00',
          '&:hover': {
            backgroundColor: '#004d00',
          },
        },
        outlined: {
          borderColor: '#00FF00',
          color: '#00FF00',
          '&:hover': {
            backgroundColor: 'rgba(0, 255, 0, 0.1)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: '#0a0a0a',
            fontFamily: '"IBM Plex Mono", "Courier New", Courier, monospace',
            '& fieldset': {
              borderColor: '#003300',
            },
            '&:hover fieldset': {
              borderColor: '#00FF00',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#00FF00',
            },
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#0a0a0a',
          border: '1px solid #003300',
        },
      },
    },
  },
  shape: {
    borderRadius: 0,
  },
});

export const themes: ThemeConfig[] = [
  {
    name: 'default',
    displayName: 'Default',
    theme: defaultTheme,
  },
  {
    name: 'dark',
    displayName: 'Dark',
    theme: darkTheme,
  },
  {
    name: 'pastel',
    displayName: 'Pastel',
    theme: pastelTheme,
  },
  {
    name: 'vivid',
    displayName: 'Vivid',
    theme: vividTheme,
  },
  {
    name: 'dawn',
    displayName: 'Dawn',
    theme: dawnTheme,
  },
  {
    name: 'twilight',
    displayName: 'Twilight',
    theme: twilightTheme,
  },
  {
    name: 'silk',
    displayName: 'Silk',
    theme: silkTheme,
  },
  {
    name: 'ink',
    displayName: 'Ink',
    theme: inkTheme,
  },
  {
    name: 'darcula',
    displayName: 'Darcula',
    theme: darculaTheme,
  },
  {
    name: 'as400',
    displayName: 'AS/400',
    theme: as400Theme,
    hidden: true,
  },
];

export const getVisibleThemes = (unlockedSecretThemes: ThemeName[] = []): ThemeConfig[] => {
  return themes.filter(t => !t.hidden || unlockedSecretThemes.includes(t.name));
};

// ---------------------------------------------------------------------------
// Custom theme registry
//
// User-created themes are loaded from the store at startup and re-registered
// on every change (useSettings owns the React state; this module-level mirror
// lets the existing helpers — getThemeByName / isDarkTheme / exportStyles —
// resolve custom ids without threading the list through every call site).
// ---------------------------------------------------------------------------

let registeredCustomThemes: CustomTheme[] = [];
// Built MUI themes are cached per id + content so repeated renders don't
// re-run createTheme; edits change the cache key and rebuild lazily.
const customMuiThemeCache = new Map<string, { key: string; theme: Theme }>();

export const registerCustomThemes = (customs: CustomTheme[]): void => {
  registeredCustomThemes = customs;
  const ids = new Set(customs.map(c => c.id));
  for (const cachedId of customMuiThemeCache.keys()) {
    if (!ids.has(cachedId)) customMuiThemeCache.delete(cachedId);
  }
};

export const getRegisteredCustomThemes = (): CustomTheme[] => registeredCustomThemes;

export const getCustomThemeById = (id: ThemeId): CustomTheme | undefined =>
  registeredCustomThemes.find(c => c.id === id);

const getCustomMuiTheme = (custom: CustomTheme): Theme => {
  const key = JSON.stringify([custom.mode, custom.colors]);
  const cached = customMuiThemeCache.get(custom.id);
  if (cached && cached.key === key) return cached.theme;
  const theme = buildMuiThemeFromCustom(custom);
  customMuiThemeCache.set(custom.id, { key, theme });
  return theme;
};

/**
 * Extract the 7 customizable tokens from any theme's MUI palette.
 * Used to seed duplicated themes and to render palette strips for presets.
 */
export const getThemeColorTokens = (id: ThemeId): CustomThemeColors => {
  const palette = getThemeByName(id).palette;
  return {
    backgroundDefault: palette.background.default,
    backgroundPaper: palette.background.paper,
    textPrimary: palette.text.primary,
    textSecondary: palette.text.secondary,
    primaryMain: palette.primary.main,
    secondaryMain: palette.secondary.main,
    divider: palette.divider,
  };
};

/**
 * Create a new custom theme by duplicating an existing theme (preset or
 * custom). The 7 tokens are read from the source's MUI palette so the copy
 * starts pixel-identical; `baseTheme` records the underlying preset for
 * "reset colors to base".
 */
export const createCustomThemeFrom = (sourceId: ThemeId, name: string): CustomTheme => {
  const sourceCustom = getCustomThemeById(sourceId);
  return {
    id: createCustomThemeId(),
    name,
    baseTheme: sourceCustom ? sourceCustom.baseTheme : sourceId,
    mode: sourceCustom ? sourceCustom.mode : getThemeByName(sourceId).palette.mode,
    colors: sourceCustom ? { ...sourceCustom.colors } : getThemeColorTokens(sourceId),
  };
};

export const getThemeByName = (name: ThemeId): Theme => {
  if (isCustomThemeId(name)) {
    const custom = getCustomThemeById(name);
    if (custom) return getCustomMuiTheme(custom);
    return defaultTheme;
  }
  const themeConfig = themes.find(t => t.name === name);
  return themeConfig ? themeConfig.theme : defaultTheme;
};

export const getThemeDisplayName = (name: ThemeId): string => {
  if (isCustomThemeId(name)) {
    const custom = getCustomThemeById(name);
    return custom ? custom.name : 'Default';
  }
  const themeConfig = themes.find(t => t.name === name);
  return themeConfig ? themeConfig.displayName : 'Default';
};

export const isDarkTheme = (name: ThemeId): boolean => {
  if (isCustomThemeId(name)) {
    const custom = getCustomThemeById(name);
    return custom ? custom.mode === 'dark' : false;
  }
  const themeConfig = themes.find(t => t.name === name);
  return themeConfig ? themeConfig.theme.palette.mode === 'dark' : false;
};

// Every CSS variable a custom theme injects; also the clear-list when
// switching back to a preset. Sourced from the derivation so the two can't
// drift apart.
const CUSTOM_THEME_CSS_VARIABLE_NAMES = Object.keys(
  deriveCssVariablesFromCustom({
    id: 'custom:template',
    name: 'template',
    baseTheme: 'default',
    mode: 'light',
    colors: {
      backgroundDefault: '#ffffff',
      backgroundPaper: '#ffffff',
      textPrimary: '#000000',
      textSecondary: '#666666',
      primaryMain: '#1976d2',
      secondaryMain: '#dc004e',
      divider: '#e0e0e0',
    },
  }),
);

/**
 * Apply a theme to the document.
 *
 * Presets keep the historical behavior: `data-theme="<name>"` selects the
 * matching block in variables.css. Custom themes get a mode-generic attribute
 * (`custom-dark` / `custom-light`, referenced by the dark-only rules in
 * markdown.css / syntax.css) and their variables injected as inline properties
 * on <html>, which override the `:root` defaults without a stylesheet block.
 */
export const applyThemeToDocument = (themeName: ThemeId): void => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  if (isCustomThemeId(themeName)) {
    const custom = getCustomThemeById(themeName);
    if (!custom) {
      // Unknown custom id (e.g. deleted theme still referenced) → safe default.
      applyThemeToDocument('default');
      return;
    }
    root.setAttribute('data-theme', custom.mode === 'dark' ? 'custom-dark' : 'custom-light');
    const variables = deriveCssVariablesFromCustom(custom);
    for (const [key, value] of Object.entries(variables)) {
      root.style.setProperty(key, value);
    }
    return;
  }

  root.setAttribute('data-theme', themeName);
  for (const key of CUSTOM_THEME_CSS_VARIABLE_NAMES) {
    root.style.removeProperty(key);
  }
};
