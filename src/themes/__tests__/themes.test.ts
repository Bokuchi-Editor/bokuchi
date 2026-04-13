import { describe, it, expect, beforeEach } from 'vitest';
import {
  getThemeByName,
  getThemeDisplayName,
  getVisibleThemes,
  applyThemeToDocument,
  themes,
  ThemeName,
} from '../index';

describe('getThemeByName', () => {
  it('returns correct theme for each known name', () => {
    const knownNames: ThemeName[] = ['default', 'dark', 'pastel', 'vivid', 'darcula'];
    for (const name of knownNames) {
      const theme = getThemeByName(name);
      expect(theme).toBeDefined();
      expect(theme.palette).toBeDefined();
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
  it('returns correct display name for each theme', () => {
    for (const config of themes) {
      expect(getThemeDisplayName(config.name)).toBe(config.displayName);
    }
  });

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
  it('contains exactly 6 themes', () => {
    expect(themes).toHaveLength(6);
  });

  it('each entry has name, displayName, and theme', () => {
    for (const config of themes) {
      expect(config.name).toBeTruthy();
      expect(config.displayName).toBeTruthy();
      expect(config.theme).toBeDefined();
    }
  });

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

  // T-TH-03: all 6 theme names are present
  it('T-TH-03: contains all expected theme names', () => {
    const names = themes.map(t => t.name);
    expect(names).toEqual(['default', 'dark', 'pastel', 'vivid', 'darcula', 'as400']);
  });
});

describe('getVisibleThemes', () => {
  // T-TH-04: without unlock returns 5 themes (excludes hidden)
  it('T-TH-04: returns only non-hidden themes by default', () => {
    const visible = getVisibleThemes();
    expect(visible).toHaveLength(5);
    expect(visible.find(t => t.name === 'as400')).toBeUndefined();
  });

  // T-TH-05: with as400 unlocked returns all 6 themes
  it('T-TH-05: includes unlocked secret themes', () => {
    const visible = getVisibleThemes(['as400']);
    expect(visible).toHaveLength(6);
    expect(visible.find(t => t.name === 'as400')).toBeDefined();
  });

  // T-TH-06: empty unlock array still excludes hidden
  it('T-TH-06: empty unlock array excludes hidden themes', () => {
    const visible = getVisibleThemes([]);
    expect(visible).toHaveLength(5);
  });
});
