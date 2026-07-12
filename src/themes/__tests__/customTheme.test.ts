import { describe, it, expect } from 'vitest';
import {
  CustomTheme,
  CUSTOM_THEME_COLOR_KEYS,
  buildMuiThemeFromCustom,
  createCustomThemeId,
  deriveCssVariablesFromCustom,
  isCustomThemeId,
  validateCustomTheme,
} from '../customTheme';

const sampleCustomTheme = (overrides: Partial<CustomTheme> = {}): CustomTheme => ({
  id: 'custom:11111111-2222-3333-4444-555555555555',
  name: 'My Theme',
  baseTheme: 'dawn',
  mode: 'light',
  colors: {
    backgroundDefault: '#faf6f4',
    backgroundPaper: '#f4edea',
    textPrimary: '#39312d',
    textSecondary: '#796b64',
    primaryMain: '#785e4f',
    secondaryMain: '#977e71',
    divider: '#e6dad2',
  },
  ...overrides,
});

describe('custom theme ids', () => {
  // T-CT-01: generated ids carry the custom: prefix and are unique
  it('T-CT-01: createCustomThemeId returns unique prefixed ids', () => {
    const a = createCustomThemeId();
    const b = createCustomThemeId();
    expect(a).toMatch(/^custom:/);
    expect(a).not.toBe(b);
  });

  // T-CT-02: isCustomThemeId distinguishes presets from custom ids
  it('T-CT-02: isCustomThemeId detects the prefix', () => {
    expect(isCustomThemeId('custom:abc')).toBe(true);
    expect(isCustomThemeId('default')).toBe(false);
    expect(isCustomThemeId('dark')).toBe(false);
    expect(isCustomThemeId(undefined)).toBe(false);
    expect(isCustomThemeId(null)).toBe(false);
  });
});

describe('buildMuiThemeFromCustom', () => {
  // T-CT-03: the 7 tokens land in the MUI palette
  it('T-CT-03: maps all 7 tokens into the palette', () => {
    const custom = sampleCustomTheme();
    const theme = buildMuiThemeFromCustom(custom);
    expect(theme.palette.mode).toBe('light');
    expect(theme.palette.background.default).toBe(custom.colors.backgroundDefault);
    expect(theme.palette.background.paper).toBe(custom.colors.backgroundPaper);
    expect(theme.palette.text.primary).toBe(custom.colors.textPrimary);
    expect(theme.palette.text.secondary).toBe(custom.colors.textSecondary);
    expect(theme.palette.primary.main).toBe(custom.colors.primaryMain);
    expect(theme.palette.secondary.main).toBe(custom.colors.secondaryMain);
    expect(theme.palette.divider).toBe(custom.colors.divider);
  });

  // T-CT-04: dark mode flows through (drives Monaco vs-dark and isDarkTheme)
  it('T-CT-04: dark mode custom theme has dark palette mode', () => {
    const theme = buildMuiThemeFromCustom(sampleCustomTheme({ mode: 'dark' }));
    expect(theme.palette.mode).toBe('dark');
  });
});

describe('deriveCssVariablesFromCustom', () => {
  // T-CT-05: core variables map straight from the tokens
  it('T-CT-05: maps tokens to the core CSS variables', () => {
    const custom = sampleCustomTheme();
    const vars = deriveCssVariablesFromCustom(custom);
    expect(vars['--color-background']).toBe(custom.colors.backgroundDefault);
    expect(vars['--color-surface']).toBe(custom.colors.backgroundPaper);
    expect(vars['--color-text']).toBe(custom.colors.textPrimary);
    expect(vars['--color-text-secondary']).toBe(custom.colors.textSecondary);
    expect(vars['--color-border']).toBe(custom.colors.divider);
    expect(vars['--color-primary']).toBe(custom.colors.primaryMain);
    expect(vars['--color-status-background']).toBe(custom.colors.backgroundPaper);
    expect(vars['--color-status-text']).toBe(custom.colors.textSecondary);
  });

  // T-CT-06: syntax colors follow the mode defaults, comment follows text-secondary
  it('T-CT-06: derives mode-dependent syntax/search colors', () => {
    const light = deriveCssVariablesFromCustom(sampleCustomTheme({ mode: 'light' }));
    const dark = deriveCssVariablesFromCustom(sampleCustomTheme({ mode: 'dark' }));
    // Same values variables.css uses for light (:root) and dark presets
    expect(light['--color-syntax-keyword']).toBe('#d73a49');
    expect(dark['--color-syntax-keyword']).toBe('#ff7b72');
    expect(light['--color-search-highlight']).toBe('#ffeb3b');
    expect(dark['--color-search-highlight']).toBe('#ffd54f');
    // Comment adapts to the theme's own secondary text (like Dawn/Ink presets)
    expect(light['--color-syntax-comment']).toBe(sampleCustomTheme().colors.textSecondary);
  });

  // T-CT-07: code background is an alpha of the text color
  it('T-CT-07: code background derives from text color with mode alpha', () => {
    const light = deriveCssVariablesFromCustom(sampleCustomTheme({ mode: 'light' }));
    const dark = deriveCssVariablesFromCustom(sampleCustomTheme({ mode: 'dark' }));
    expect(light['--color-code-background']).toBe('rgba(57, 49, 45, 0.08)');
    expect(dark['--color-code-background']).toBe('rgba(57, 49, 45, 0.1)');
  });
});

describe('validateCustomTheme', () => {
  // T-CT-08: a well-formed record round-trips
  it('T-CT-08: accepts a valid record', () => {
    const custom = sampleCustomTheme();
    expect(validateCustomTheme(custom)).toEqual(custom);
  });

  // T-CT-09: colors are normalized (case / shorthand)
  it('T-CT-09: normalizes color values', () => {
    const custom = sampleCustomTheme();
    const raw = {
      ...custom,
      colors: { ...custom.colors, backgroundDefault: '#FAF6F4', primaryMain: 'abc' },
    };
    const validated = validateCustomTheme(raw);
    expect(validated?.colors.backgroundDefault).toBe('#faf6f4');
    expect(validated?.colors.primaryMain).toBe('#aabbcc');
  });

  // T-CT-10: structurally broken records are rejected, not thrown
  it('T-CT-10: rejects invalid records', () => {
    expect(validateCustomTheme(null)).toBeNull();
    expect(validateCustomTheme('nope')).toBeNull();
    expect(validateCustomTheme({})).toBeNull();
    // Wrong id prefix
    expect(validateCustomTheme(sampleCustomTheme({ id: 'default' }))).toBeNull();
    // Empty name
    expect(validateCustomTheme(sampleCustomTheme({ name: '   ' }))).toBeNull();
    // Bad mode
    expect(
      validateCustomTheme({ ...sampleCustomTheme(), mode: 'sepia' as 'light' }),
    ).toBeNull();
    // Missing a color key
    const missingColor = sampleCustomTheme();
    delete (missingColor.colors as unknown as Record<string, unknown>).divider;
    expect(validateCustomTheme(missingColor)).toBeNull();
    // Invalid color value
    const badColor = sampleCustomTheme();
    badColor.colors.textPrimary = 'not-a-color';
    expect(validateCustomTheme(badColor)).toBeNull();
  });

  // T-CT-11: missing baseTheme falls back to 'default' (older records stay loadable)
  it('T-CT-11: defaults baseTheme to "default" when absent', () => {
    const record = sampleCustomTheme() as unknown as Record<string, unknown>;
    delete record.baseTheme;
    expect(validateCustomTheme(record)?.baseTheme).toBe('default');
  });

  // T-CT-12: the color key list matches the CustomThemeColors shape
  it('T-CT-12: CUSTOM_THEME_COLOR_KEYS covers exactly the 7 tokens', () => {
    expect(CUSTOM_THEME_COLOR_KEYS).toHaveLength(7);
    expect(new Set(CUSTOM_THEME_COLOR_KEYS).size).toBe(7);
    expect(Object.keys(sampleCustomTheme().colors).sort()).toEqual(
      [...CUSTOM_THEME_COLOR_KEYS].sort(),
    );
  });
});
