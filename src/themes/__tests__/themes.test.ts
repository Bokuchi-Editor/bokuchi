import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createCustomThemeFrom,
  getThemeByName,
  getThemeColorTokens,
  getThemeDisplayName,
  getVisibleThemes,
  applyThemeToDocument,
  isDarkTheme,
  registerCustomThemes,
  themes,
  ThemeName,
} from '../index';
import { CustomTheme } from '../customTheme';

describe('getThemeByName', () => {
  // Identity check (toBe): getThemeByName falls back to the default theme for
  // unknown names, so a mere toBeDefined() could never fail. Asserting the
  // exact object from the `themes` registry proves each name resolves to its
  // own entry rather than silently hitting the fallback.
  it('returns the exact registry entry for each known name', () => {
    for (const config of themes) {
      expect(getThemeByName(config.name)).toBe(config.theme);
    }
  });

  it('returns default theme for unknown name', () => {
    const defaultTheme = getThemeByName('default');
    const fallback = getThemeByName('nonexistent' as ThemeName);
    expect(fallback).toBe(defaultTheme);
  });

  it('dark theme has dark palette mode', () => {
    const dark = getThemeByName('dark');
    expect(dark.palette.mode).toBe('dark');
  });

  it('default theme has light palette mode', () => {
    const light = getThemeByName('default');
    expect(light.palette.mode).toBe('light');
  });
});

describe('getThemeDisplayName', () => {
  it('returns "Default" for unknown name', () => {
    expect(getThemeDisplayName('nonexistent' as ThemeName)).toBe('Default');
  });
});

describe('applyThemeToDocument', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme');
  });

  it('sets data-theme attribute on document element', () => {
    applyThemeToDocument('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('overwrites previous data-theme value', () => {
    applyThemeToDocument('dark');
    applyThemeToDocument('pastel');
    expect(document.documentElement.getAttribute('data-theme')).toBe('pastel');
  });
});

describe('themes array', () => {
  // T-TH-01: as400 theme is marked as hidden
  it('T-TH-01: as400 theme has hidden: true', () => {
    const as400 = themes.find(t => t.name === 'as400');
    expect(as400).toBeDefined();
    expect(as400!.hidden).toBe(true);
  });

  // T-TH-02: non-secret themes are not hidden
  it('T-TH-02: standard themes do not have hidden: true', () => {
    const standardThemes = themes.filter(t => t.name !== 'as400');
    for (const config of standardThemes) {
      expect(config.hidden).toBeFalsy();
    }
  });

  // T-TH-03: all 10 theme names are present in expected order
  it('T-TH-03: contains all expected theme names', () => {
    const names = themes.map(t => t.name);
    expect(names).toEqual([
      'default', 'dark', 'pastel', 'vivid',
      'dawn', 'twilight', 'silk', 'ink',
      'darcula', 'as400',
    ]);
  });
});

describe('getVisibleThemes', () => {
  // T-TH-04: without unlock returns 9 themes (excludes hidden)
  it('T-TH-04: returns only non-hidden themes by default', () => {
    const visible = getVisibleThemes();
    expect(visible).toHaveLength(9);
    expect(visible.find(t => t.name === 'as400')).toBeUndefined();
  });

  // T-TH-05: with as400 unlocked returns all 10 themes
  it('T-TH-05: includes unlocked secret themes', () => {
    const visible = getVisibleThemes(['as400']);
    expect(visible).toHaveLength(10);
    expect(visible.find(t => t.name === 'as400')).toBeDefined();
  });
});

describe('custom theme registry', () => {
  const sampleCustom: CustomTheme = {
    id: 'custom:test-1',
    name: 'My Dark',
    baseTheme: 'ink',
    mode: 'dark',
    colors: {
      backgroundDefault: '#101018',
      backgroundPaper: '#181820',
      textPrimary: '#e0e0e8',
      textSecondary: '#9090a0',
      primaryMain: '#8888ff',
      secondaryMain: '#666688',
      divider: '#303040',
    },
  };

  beforeEach(() => {
    registerCustomThemes([sampleCustom]);
  });

  afterEach(() => {
    registerCustomThemes([]);
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('style');
  });

  // T-TH-07: getThemeByName resolves a registered custom id to its palette
  it('T-TH-07: resolves registered custom theme ids', () => {
    const theme = getThemeByName('custom:test-1');
    expect(theme.palette.mode).toBe('dark');
    expect(theme.palette.background.default).toBe('#101018');
    expect(theme.palette.primary.main).toBe('#8888ff');
  });

  // T-TH-08: unknown custom id falls back to the default theme
  it('T-TH-08: unknown custom id falls back to default theme', () => {
    expect(getThemeByName('custom:missing')).toBe(getThemeByName('default'));
  });

  // T-TH-09: isDarkTheme / getThemeDisplayName resolve custom ids
  it('T-TH-09: isDarkTheme and display name work for custom ids', () => {
    expect(isDarkTheme('custom:test-1')).toBe(true);
    expect(getThemeDisplayName('custom:test-1')).toBe('My Dark');
    expect(isDarkTheme('custom:missing')).toBe(false);
    expect(getThemeDisplayName('custom:missing')).toBe('Default');
  });

  // T-TH-10: re-registering with edited colors rebuilds the MUI theme (edit flow)
  it('T-TH-10: edited custom theme resolves to new colors', () => {
    registerCustomThemes([
      { ...sampleCustom, colors: { ...sampleCustom.colors, primaryMain: '#ff0000' } },
    ]);
    expect(getThemeByName('custom:test-1').palette.primary.main).toBe('#ff0000');
  });

  // T-TH-11: applying a custom theme sets the mode attribute + injects variables
  it('T-TH-11: applyThemeToDocument injects custom variables', () => {
    applyThemeToDocument('custom:test-1');
    const root = document.documentElement;
    expect(root.getAttribute('data-theme')).toBe('custom-dark');
    expect(root.style.getPropertyValue('--color-background')).toBe('#101018');
    expect(root.style.getPropertyValue('--color-text')).toBe('#e0e0e8');
  });

  // T-TH-12: switching back to a preset clears every injected variable
  it('T-TH-12: preset apply clears injected custom variables', () => {
    applyThemeToDocument('custom:test-1');
    applyThemeToDocument('dark');
    const root = document.documentElement;
    expect(root.getAttribute('data-theme')).toBe('dark');
    expect(root.style.getPropertyValue('--color-background')).toBe('');
    expect(root.style.getPropertyValue('--color-syntax-keyword')).toBe('');
  });

  // T-TH-13: applying an unregistered custom id falls back to default safely
  it('T-TH-13: unknown custom id applies default instead', () => {
    applyThemeToDocument('custom:missing');
    expect(document.documentElement.getAttribute('data-theme')).toBe('default');
  });

  // T-TH-14: light custom theme gets the custom-light attribute
  it('T-TH-14: light custom theme applies custom-light attribute', () => {
    registerCustomThemes([{ ...sampleCustom, mode: 'light' }]);
    applyThemeToDocument('custom:test-1');
    expect(document.documentElement.getAttribute('data-theme')).toBe('custom-light');
  });
});

describe('createCustomThemeFrom / getThemeColorTokens', () => {
  afterEach(() => {
    registerCustomThemes([]);
  });

  // T-TH-15: duplicating a preset copies its palette tokens
  it('T-TH-15: duplicating a preset copies the 7 tokens and mode', () => {
    const copy = createCustomThemeFrom('twilight', 'Twilight Copy');
    expect(copy.id).toMatch(/^custom:/);
    expect(copy.name).toBe('Twilight Copy');
    expect(copy.baseTheme).toBe('twilight');
    expect(copy.mode).toBe('dark');
    expect(copy.colors).toEqual(getThemeColorTokens('twilight'));
    expect(copy.colors.backgroundDefault).toBe('#25231d');
  });

  // T-TH-16: duplicating a custom theme keeps its colors and original base
  it('T-TH-16: duplicating a custom theme preserves colors and base preset', () => {
    const original = createCustomThemeFrom('dawn', 'Mine');
    original.colors.primaryMain = '#123456';
    registerCustomThemes([original]);
    const copy = createCustomThemeFrom(original.id, 'Mine Copy');
    expect(copy.id).not.toBe(original.id);
    expect(copy.colors.primaryMain).toBe('#123456');
    // base points at the underlying preset, not the intermediate custom theme
    expect(copy.baseTheme).toBe('dawn');
    expect(copy.mode).toBe('light');
  });
});
