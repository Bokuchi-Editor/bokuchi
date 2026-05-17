import { describe, it, expect } from 'vitest';
import {
  getExportThemeColors,
  getHighlightStyleDataUri,
  generateExportCSS,
  generateTableLayoutCSS,
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

  it('uses auto-wrap as the default table layout', () => {
    const colors = getExportThemeColors(false);
    const css = generateExportCSS(colors);
    expect(css).toContain('table-layout: auto');
    expect(css).not.toContain('table-layout: fixed');
  });
});

describe('generateTableLayoutCSS', () => {
  // Why these are exhaustive: each mode has a different combination of CSS rules
  // (table-layout, max-width on cells, display:block for scrolling) and getting any of
  // them wrong produces visually broken tables. The asserts pin the mode-defining rules
  // so a future refactor can't silently swap behavior between modes.
  it('emits fixed-width layout with cell max-width: 0 for "equal"', () => {
    const css = generateTableLayoutCSS('equal', '', '#ccc', '#fff');
    expect(css).toContain('table-layout: fixed');
    expect(css).toContain('width: 100%');
    expect(css).toContain('max-width: 0');
  });

  it('emits auto layout with cell wrapping (no max-width: 0) for "auto-wrap"', () => {
    const css = generateTableLayoutCSS('auto-wrap', '', '#ccc', '#fff');
    expect(css).toContain('table-layout: auto');
    expect(css).toContain('width: 100%');
    expect(css).toContain('word-break: break-word');
    expect(css).not.toContain('max-width: 0');
  });

  it('emits display:block + overflow-x:auto + white-space:nowrap for "auto-scroll"', () => {
    // white-space: nowrap is what actually triggers the horizontal overflow. Without
    // it cells just wrap at spaces and the table never gets wide enough to scroll.
    const css = generateTableLayoutCSS('auto-scroll', '', '#ccc', '#fff');
    expect(css).toContain('display: block');
    expect(css).toContain('overflow-x: auto');
    expect(css).toContain('table-layout: auto');
    expect(css).toContain('white-space: nowrap');
    expect(css).not.toContain('word-break: break-word');
  });

  it('adds the .markdown-preview wildcard override only when scoped to the preview', () => {
    // The wildcard `.markdown-preview * { max-width: 100%; word-break: break-word }`
    // would (a) clamp the table to the pane and (b) break long words so cells wrap
    // instead of growing. Auto-scroll mode must override BOTH for the preview,
    // otherwise the scrollbar appears but barely scrolls. The export document has
    // no such wildcard so the override would be dead weight.
    const previewCss = generateTableLayoutCSS('auto-scroll', '.markdown-preview ', '#ccc', '#fff');
    expect(previewCss).toContain('.markdown-preview table, .markdown-preview table *');
    expect(previewCss).toContain('max-width: none');
    expect(previewCss).toContain('word-break: normal');
    expect(previewCss).toContain('overflow-wrap: normal');

    const exportCss = generateTableLayoutCSS('auto-scroll', '', '#ccc', '#fff');
    expect(exportCss).not.toContain('max-width: none');
    expect(exportCss).not.toContain('word-break: normal');
  });

  it('scopes selectors with the given prefix', () => {
    const css = generateTableLayoutCSS('equal', '.markdown-preview ', '#ccc', '#fff');
    expect(css).toContain('.markdown-preview table');
    expect(css).toContain('.markdown-preview th');
    expect(css).toContain('.markdown-preview td');
  });
});

describe('buildExportHTML', () => {
  it('returns a full HTML document with correct structure', () => {
    const html = buildExportHTML('<p>Hello</p>', false);
    // Document structure
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('<head>');
    expect(html).toContain('</head>');
    expect(html).toContain('<body>');
    expect(html).toContain('</body>');
    // Meta tags
    expect(html).toContain('<meta charset="UTF-8">');
    expect(html).toContain('<meta name="viewport"');
    expect(html).toContain('<title>Markdown Export</title>');
    // Body content embedded
    expect(html).toContain('<p>Hello</p>');
    // Embedded CSS (not CDN)
    expect(html).toContain('<style>');
    // Highlight.js CSS as data URI in link tag
    expect(html).toContain('<link rel="stylesheet" href="data:text/css;base64,');
    // Embedded highlight.js script (self-contained, no CDN)
    expect(html).toContain('<script>');
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

  it('honors an explicit tableLayout argument', () => {
    const equal = buildExportHTML('<p>x</p>', false, undefined, 'equal');
    expect(equal).toContain('table-layout: fixed');

    const scroll = buildExportHTML('<p>x</p>', false, undefined, 'auto-scroll');
    expect(scroll).toContain('display: block');
    expect(scroll).toContain('overflow-x: auto');
  });
});
