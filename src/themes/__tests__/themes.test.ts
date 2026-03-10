import { describe, it, expect, beforeEach } from 'vitest';
import {
  getThemeByName,
  getThemeDisplayName,
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
  it('contains exactly 5 themes', () => {
    expect(themes).toHaveLength(5);
  });

  it('each entry has name, displayName, and theme', () => {
    for (const config of themes) {
      expect(config.name).toBeTruthy();
      expect(config.displayName).toBeTruthy();
      expect(config.theme).toBeDefined();
    }
  });
});
