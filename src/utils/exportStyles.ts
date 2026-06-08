import { alpha } from '@mui/material/styles';
import { TableLayoutMode, DEFAULT_PREVIEW_SETTINGS } from '../types/settings';
import { getThemeByName, ThemeName } from '../themes';

/** Theme color palette for HTML export */
export interface ExportThemeColors {
  backgroundColor: string;
  textColor: string;
  codeBackground: string;
  borderColor: string;
  linkColor: string;
  blockquoteColor: string;
  inlineCodeBackground: string;
}

/**
 * Compute theme-aware colors for HTML export.
 * Reads the actual MUI palette of the selected theme so all themes (including
 * the new Dawn / Twilight / Silk / Ink) export with their proper colors.
 */
export function getExportThemeColors(theme?: string): ExportThemeColors {
  const themeName = (theme || 'default') as ThemeName;
  const muiTheme = getThemeByName(themeName);
  const { palette } = muiTheme;
  // Code block bg derived from text color so it stays visible even when a
  // theme leaves background.paper === background.default (Default / Vivid).
  const codeBackground = alpha(palette.text.primary, palette.mode === 'dark' ? 0.10 : 0.06);
  return {
    backgroundColor: palette.background.default,
    textColor: palette.text.primary,
    codeBackground,
    borderColor: palette.divider,
    linkColor: palette.primary.main,
    blockquoteColor: palette.text.secondary,
    inlineCodeBackground: alpha(palette.text.primary, 0.08),
  };
}

const HLJS_DARK_CSS = `.hljs{display:block;overflow-x:auto;padding:0.5em;color:#e6edf3;background:#0d1117}.hljs-comment,.hljs-quote{color:#7d8590;font-style:italic}.hljs-addition,.hljs-keyword,.hljs-selector-tag{color:#ff7b72}.hljs-doctag,.hljs-literal,.hljs-meta,.hljs-number,.hljs-regexp,.hljs-string{color:#a5d6ff}.hljs-name,.hljs-section,.hljs-selector-class,.hljs-selector-id,.hljs-title{color:#d2a8ff;font-weight:700}.hljs-attr,.hljs-attribute,.hljs-class .hljs-title,.hljs-template-variable,.hljs-type,.hljs-variable{color:#79c0ff}.hljs-bullet,.hljs-link,.hljs-meta .hljs-keyword,.hljs-selector-attr,.hljs-selector-pseudo,.hljs-symbol,.hljs-title.class_{color:#f2cc60}.hljs-built_in,.hljs-deletion,.hljs-formula,.hljs-function .hljs-title,.hljs-title.function_{color:#d2a8ff}.hljs-emphasis{font-style:italic}.hljs-strong{font-weight:700}.hljs-link{text-decoration:underline}`;

const HLJS_LIGHT_CSS = `.hljs{display:block;overflow-x:auto;padding:0.5em;color:#24292f;background:#f6f8fa}.hljs-doctag,.hljs-keyword,.hljs-meta .hljs-keyword,.hljs-template-tag,.hljs-template-variable,.hljs-type,.hljs-variable.language_{color:#d73a49}.hljs-title,.hljs-title.class_,.hljs-title.class_.inherited__,.hljs-title.function_{color:#6f42c1}.hljs-attr,.hljs-attribute,.hljs-literal,.hljs-meta,.hljs-number,.hljs-operator,.hljs-selector-attr,.hljs-selector-class,.hljs-selector-id,.hljs-variable{color:#005cc5}.hljs-meta .hljs-string,.hljs-regexp,.hljs-string{color:#032f62}.hljs-built_in,.hljs-symbol{color:#e36209}.hljs-code,.hljs-comment,.hljs-formula{color:#6a737d}.hljs-name,.hljs-quote,.hljs-selector-pseudo,.hljs-selector-tag{color:#22863a}.hljs-subst{color:#24292f}.hljs-section{color:#005cc5;font-weight:700}.hljs-bullet{color:#735c0f}.hljs-emphasis{color:#24292f;font-style:italic}.hljs-strong{color:#24292f;font-weight:700}.hljs-addition{color:#22863a;background-color:#f0fff4}.hljs-deletion{color:#b31d28;background-color:#ffeef0}`;

/**
 * Get a data URI for highlight.js CSS based on theme.
 */
export function getHighlightStyleDataUri(darkMode: boolean): string {
  const css = darkMode ? HLJS_DARK_CSS : HLJS_LIGHT_CSS;
  return 'data:text/css;base64,' + btoa(css);
}

/**
 * Build the CSS rules for `<table>` based on the chosen layout mode. Shared by the live
 * preview (via Preview.tsx) and HTML export so both render identically.
 *
 * `prefix` scopes the rules ('' for the standalone export document, '.markdown-preview '
 * for the in-app preview where rules must not leak to the rest of the UI). The auto-scroll
 * preview also needs an override against the wildcard `.markdown-preview * { max-width: 100% }`
 * — without it the table can't grow past its container, so horizontal scroll never triggers.
 */
export function generateTableLayoutCSS(
  mode: TableLayoutMode,
  prefix: string,
  borderColor: string,
  cellBackground: string,
): string {
  const tableSelector = `${prefix}table`;
  const cellSelector = `${prefix}th, ${prefix}td`;
  const headerSelector = `${prefix}th`;

  const headerRule = `
        ${headerSelector} {
            background-color: ${cellBackground};
            font-weight: 600;
        }`;

  if (mode === 'equal') {
    return `
        ${tableSelector} {
            border-collapse: collapse;
            width: 100%;
            margin: 1em 0;
            table-layout: fixed;
            word-break: break-word;
            overflow-wrap: break-word;
        }

        ${cellSelector} {
            border: 1px solid ${borderColor};
            padding: 6px 13px;
            word-break: break-word;
            overflow-wrap: break-word;
            max-width: 0;
        }
${headerRule}`;
  }

  if (mode === 'auto-wrap') {
    return `
        ${tableSelector} {
            border-collapse: collapse;
            width: 100%;
            max-width: 100%;
            margin: 1em 0;
            table-layout: auto;
            word-break: break-word;
            overflow-wrap: break-word;
        }

        ${cellSelector} {
            border: 1px solid ${borderColor};
            padding: 6px 13px;
            word-break: break-word;
            overflow-wrap: break-word;
        }
${headerRule}`;
  }

  // auto-scroll
  // The preview-scope override exists to defeat the wide `.markdown-preview *` rule
  // (max-width: 100% and word-break: break-word). Without these escape hatches the
  // cells would still wrap aggressively and the table would never grow wide enough
  // to overflow, so the scrollbar shows up but barely scrolls.
  const scrollOverride = prefix
    ? `

        ${tableSelector}, ${prefix}table * {
            max-width: none;
            word-break: normal;
            overflow-wrap: normal;
        }`
    : '';

  return `
        ${tableSelector} {
            border-collapse: collapse;
            display: block;
            overflow-x: auto;
            max-width: 100%;
            margin: 1em 0;
            table-layout: auto;
        }${scrollOverride}

        ${cellSelector} {
            border: 1px solid ${borderColor};
            padding: 6px 13px;
            white-space: nowrap;
        }
${headerRule}`;
}

/**
 * Generate the full CSS block for HTML export.
 */
export function generateExportCSS(
  colors: ExportThemeColors,
  tableLayout: TableLayoutMode = DEFAULT_PREVIEW_SETTINGS.tableLayout,
): string {
  const tableCSS = generateTableLayoutCSS(
    tableLayout,
    '',
    colors.borderColor,
    colors.codeBackground,
  );
  return `
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: ${colors.backgroundColor};
            color: ${colors.textColor};
            word-break: break-word;
            overflow-wrap: break-word;
            hyphens: auto;
        }

        h1:first-child,
        h2:first-child,
        h3:first-child,
        h4:first-child,
        h5:first-child,
        h6:first-child {
            margin-top: 0 !important;
        }

        h1, h2, h3, h4, h5, h6 {
            margin-top: 1.5em;
            margin-bottom: 0.5em;
            font-weight: 600;
        }

        h1 { font-size: 2em; border-bottom: 1px solid ${colors.borderColor}; padding-bottom: 0.3em; }
        h2 { font-size: 1.5em; border-bottom: 1px solid ${colors.borderColor}; padding-bottom: 0.3em; }

        p { margin-bottom: 1em; }

        ul, ol { margin-bottom: 1em; padding-left: 2em; }
        li { margin-bottom: 0.25em; }

        blockquote {
            border-left: 4px solid ${colors.borderColor};
            padding-left: 1em;
            margin: 1em 0;
            color: ${colors.blockquoteColor};
        }

        code {
            background-color: ${colors.inlineCodeBackground};
            padding: 0.2em 0.4em;
            border-radius: 3px;
            font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
            font-size: 85%;
            line-height: 1.2;
        }

        pre {
            background-color: ${colors.codeBackground};
            border-radius: 3px;
            padding: 16px;
            overflow: auto;
            margin: 1em 0;
            word-break: break-word;
            overflow-wrap: break-word;
            white-space: pre-wrap;
            line-height: 1.4;
        }

        pre code {
            background-color: transparent;
            padding: 0;
            word-break: break-word;
            overflow-wrap: break-word;
            white-space: pre-wrap;
            line-height: 1.4;
        }
${tableCSS}

        a {
            color: ${colors.linkColor};
            text-decoration: none;
        }

        a:hover {
            text-decoration: underline;
        }

        img {
            max-width: 100%;
            height: auto;
        }

        /* The enclosing <pre> already paints the code background. Keep the
           highlighted <code class="hljs"> itself transparent — codeBackground is
           semi-transparent, so painting it on both <pre> and <code> stacked the
           alpha and produced a darker inner box (visible in PDF export). */
        .hljs {
            background: transparent !important;
        }`;
}

/**
 * Print-media CSS for PDF export. The layout engine flows the document across
 * pages on its own — we only define the page box and add fragmentation hints so
 * blocks that shouldn't be split mid-page (code, tables, images, equations,
 * Mermaid diagrams) stay intact, and keep headings attached to their content.
 *
 * `.page-break` is the rendered form of a `<!-- pagebreak -->` marker, letting
 * the author force a page break wherever they want.
 *
 * print-color-adjust: exact keeps theme/syntax-highlight backgrounds in the PDF
 * so the output matches the on-screen preview.
 */
/**
 * Print-media CSS for PDF export. PDF is always exported with the Default
 * (white background, black text) theme regardless of the on-screen theme, so a
 * plain @page margin is enough — the white margin band blends with the white
 * page, with no visible boundary to fill.
 */
const PRINT_CSS = `
        @media print {
            /* Page size comes from the native print settings; WebKit takes the
               margin from the CSS @page box (native margin is kept at 0). */
            @page { margin: 20mm; }
            html, body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            body { max-width: none; margin: 0; padding: 0; }
            pre, blockquote, table, figure, img,
            .mermaid-diagram, .katex-display {
                break-inside: avoid;
            }
            tr, td, th { break-inside: avoid; }
            h1, h2, h3, h4, h5, h6 { break-after: avoid; }
            .page-break { break-before: page; height: 0; }
        }`;

/**
 * Build a complete standalone HTML document for export.
 *
 * When `forPrint` is set the document also carries print-media CSS and any
 * `<!-- pagebreak -->` markers in the body are turned into forced page breaks —
 * used by the PDF export path (print → "Save as PDF").
 */
export function buildExportHTML(
  bodyHtml: string,
  darkMode: boolean,
  theme?: string,
  tableLayout: TableLayoutMode = DEFAULT_PREVIEW_SETTINGS.tableLayout,
  katexCss?: string,
  options: { forPrint?: boolean } = {},
): string {
  // PDF export always uses the Default theme (white background, black text),
  // regardless of the on-screen theme — code/Mermaid colors follow suit. This
  // keeps printed output readable and avoids colored page margins. Marp slides
  // are exported WYSIWYG and never go through this path.
  const effectiveTheme = options.forPrint ? 'default' : theme;
  const effectiveDarkMode = options.forPrint ? false : darkMode;

  const colors = getExportThemeColors(effectiveTheme);
  const css = generateExportCSS(colors, tableLayout);
  const highlightStyle = getHighlightStyleDataUri(effectiveDarkMode);
  // Inject KaTeX's stylesheet (with fonts inlined) only when the document has
  // math — without it the exported render breaks (see katexExportCss.ts). The
  // caller passes it lazily so font-free exports stay small.
  const katexStyle = katexCss ? `\n    <style>${katexCss}</style>` : '';

  const printStyle = options.forPrint ? `\n    <style>${PRINT_CSS}</style>` : '';
  // Turn the explicit page-break marker into a styleable element. Scoped to the
  // print path so plain HTML export keeps a clean body.
  const body = options.forPrint
    ? bodyHtml.replace(/<!--\s*pagebreak\s*-->/gi, '<div class="page-break"></div>')
    : bodyHtml;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Markdown Export</title>
    <style>${css}
    </style>${katexStyle}${printStyle}
    <link rel="stylesheet" href="${highlightStyle}">
</head>
<body>
    ${body}
    <script>
      // Embed highlight.js core functionality (no CDN)
      (function(){
        var hljs = {
          highlightAll: function() {
            var blocks = document.querySelectorAll('pre code');
            blocks.forEach(function(block) {
              if (block.className.indexOf('hljs') === -1) {
                block.className += ' hljs';
              }
            });
          }
        };
        hljs.highlightAll();
      })();
    </script>
</body>
</html>`;
}
