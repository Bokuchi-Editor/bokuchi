import { describe, it, expect } from 'vitest';
import {
  getExportThemeColors,
  getHighlightStyleDataUri,
  generateExportCSS,
  generateTableLayoutCSS,
  buildExportHTML,
} from '../exportStyles';

describe('getExportThemeColors', () => {
  it('returns default theme palette when no theme specified', () => {
    const colors = getExportThemeColors();
    expect(colors.backgroundColor).toBe('#ffffff');
    expect(colors.textColor).toBe('#000000');
    expect(colors.linkColor).toBe('#1976d2');
  });

  it('returns dark theme palette for theme="dark"', () => {
    const colors = getExportThemeColors('dark');
    expect(colors.backgroundColor).toBe('#121212');
    expect(colors.textColor).toBe('#ffffff');
    expect(colors.linkColor).toBe('#90caf9');
  });

  it('resolves each non-default theme to its own palette (no exact hex pins — free to tune design)', () => {
    const defaults = getExportThemeColors();
    for (const theme of ['darcula', 'dawn', 'ink'] as const) {
      const colors = getExportThemeColors(theme);
      expect(colors.backgroundColor, theme).not.toBe(defaults.backgroundColor);
      expect(colors.linkColor, theme).not.toBe(defaults.linkColor);
    }
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
    const colors = getExportThemeColors();
    const css = generateExportCSS(colors);
    expect(css).toContain(colors.backgroundColor);
    expect(css).toContain(colors.textColor);
    expect(css).toContain(colors.borderColor);
    expect(css).toContain(colors.linkColor);
    expect(css).toContain('font-family');
  });

  it('constrains images to fit within parent element', () => {
    const colors = getExportThemeColors();
    const css = generateExportCSS(colors);
    expect(css).toContain('img');
    expect(css).toContain('max-width: 100%');
    expect(css).toContain('height: auto');
  });

  it('uses auto-wrap as the default table layout', () => {
    const colors = getExportThemeColors();
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

  it('uses dark theme palette colors', () => {
    const html = buildExportHTML('<p>Dark</p>', true, 'dark');
    expect(html).toContain('#121212');
    expect(html).toContain('#ffffff');
  });

  it('honors an explicit tableLayout argument', () => {
    const equal = buildExportHTML('<p>x</p>', false, undefined, 'equal');
    expect(equal).toContain('table-layout: fixed');

    const scroll = buildExportHTML('<p>x</p>', false, undefined, 'auto-scroll');
    expect(scroll).toContain('display: block');
    expect(scroll).toContain('overflow-x: auto');
  });

  // forPrint drives the PDF export path (print -> "Save as PDF"), which was
  // previously untested end to end at this level.
  describe('forPrint option (PDF export path)', () => {
    const forPrint = (body: string) =>
      buildExportHTML(body, false, undefined, undefined, undefined, { forPrint: true });

    it('injects the print-media CSS (@page box and fragmentation hints)', () => {
      const html = forPrint('<p>x</p>');
      expect(html).toContain('@media print');
      expect(html).toContain('@page { margin: 20mm; }');
      expect(html).toContain('break-inside: avoid');
      expect(html).toContain('.page-break { break-before: page; height: 0; }');
      // Plain HTML export must stay free of print CSS.
      expect(buildExportHTML('<p>x</p>', false)).not.toContain('@page');
    });

    it('turns <!-- pagebreak --> markers into .page-break divs (case/whitespace tolerant)', () => {
      const html = forPrint(
        '<p>a</p><!-- pagebreak --><p>b</p><!--PAGEBREAK--><p>c</p><!--  PageBreak  --><p>d</p>',
      );
      expect(html.match(/<div class="page-break"><\/div>/g)?.length).toBe(3);
      expect(html).not.toContain('pagebreak');
      expect(html).not.toContain('PAGEBREAK');
      // Without forPrint the marker passes through untouched (clean HTML export).
      const plain = buildExportHTML('<p>a</p><!-- pagebreak --><p>b</p>', false);
      expect(plain).toContain('<!-- pagebreak -->');
      expect(plain).not.toContain('page-break');
    });

    it('forces the Default theme and light mode regardless of the on-screen theme', () => {
      // Documented in the buildExportHTML docstring: PDF is always exported
      // with the Default (white bg, black text) theme so printed pages stay
      // readable and margins stay white.
      const html = buildExportHTML('<p>x</p>', true, 'dark', undefined, undefined, {
        forPrint: true,
      });
      const defaults = getExportThemeColors();
      const dark = getExportThemeColors('dark');
      expect(html).toContain(defaults.backgroundColor);
      expect(html).not.toContain(dark.backgroundColor);
      // Highlight.js CSS is the light variant even though darkMode=true was passed.
      expect(html).toContain(getHighlightStyleDataUri(false));
      expect(html).not.toContain(getHighlightStyleDataUri(true));
    });
  });
});
