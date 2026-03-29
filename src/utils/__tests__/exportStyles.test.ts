import { describe, it, expect } from 'vitest';
import {
  getExportThemeColors,
  getHighlightStyleDataUri,
  generateExportCSS,
  buildExportHTML,
} from '../exportStyles';

describe('getExportThemeColors', () => {
  it('returns light theme colors by default', () => {
    const colors = getExportThemeColors(false);
    expect(colors.backgroundColor).toBe('#ffffff');
    expect(colors.textColor).toBe('#333333');
    expect(colors.linkColor).toBe('#0366d6');
  });

  it('returns dark theme colors when darkMode=true', () => {
    const colors = getExportThemeColors(true);
    expect(colors.backgroundColor).toBe('#1a1a1a');
    expect(colors.textColor).toBe('#e0e0e0');
    expect(colors.linkColor).toBe('#58a6ff');
  });

  it('returns darcula theme colors', () => {
    const colors = getExportThemeColors(false, 'darcula');
    expect(colors.backgroundColor).toBe('#2B2B2B');
    expect(colors.textColor).toBe('#A9B7C6');
  });
});

describe('getHighlightStyleDataUri', () => {
  it('returns a data URI for light mode', () => {
    const uri = getHighlightStyleDataUri(false);
    expect(uri).toMatch(/^data:text\/css;base64,/);
    const css = atob(uri.replace('data:text/css;base64,', ''));
    expect(css).toContain('#24292f');
  });

  it('returns a data URI for dark mode', () => {
    const uri = getHighlightStyleDataUri(true);
    const css = atob(uri.replace('data:text/css;base64,', ''));
    expect(css).toContain('#e6edf3');
  });
});

describe('generateExportCSS', () => {
  it('includes theme colors in CSS output', () => {
    const colors = getExportThemeColors(false);
    const css = generateExportCSS(colors);
    expect(css).toContain(colors.backgroundColor);
    expect(css).toContain(colors.textColor);
    expect(css).toContain(colors.borderColor);
    expect(css).toContain(colors.linkColor);
    expect(css).toContain('font-family');
  });

  it('constrains images to fit within parent element', () => {
    const colors = getExportThemeColors(false);
    const css = generateExportCSS(colors);
    expect(css).toContain('img');
    expect(css).toContain('max-width: 100%');
    expect(css).toContain('height: auto');
  });
});

describe('buildExportHTML', () => {
  it('returns a full HTML document with body content', () => {
    const html = buildExportHTML('<p>Hello</p>', false);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<p>Hello</p>');
    expect(html).toContain('Markdown Export');
    expect(html).toContain('highlightAll');
  });

  it('uses dark theme colors when darkMode=true', () => {
    const html = buildExportHTML('<p>Dark</p>', true);
    expect(html).toContain('#1a1a1a');
    expect(html).toContain('#e0e0e0');
  });

  it('uses darcula theme colors', () => {
    const html = buildExportHTML('<p>Darcula</p>', false, 'darcula');
    expect(html).toContain('#2B2B2B');
    expect(html).toContain('#A9B7C6');
  });
});
