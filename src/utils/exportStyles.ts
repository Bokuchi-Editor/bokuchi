import { TableLayoutMode, DEFAULT_PREVIEW_SETTINGS } from '../types/settings';

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
 */
export function getExportThemeColors(darkMode: boolean, theme?: string): ExportThemeColors {
  const isDark = darkMode || theme === 'darcula';
  return {
    backgroundColor: theme === 'darcula' ? '#2B2B2B' : (isDark ? '#1a1a1a' : '#ffffff'),
    textColor: theme === 'darcula' ? '#A9B7C6' : (isDark ? '#e0e0e0' : '#333333'),
    codeBackground: theme === 'darcula' ? '#2d2d2d' : (isDark ? '#2d2d2d' : '#f6f8fa'),
    borderColor: theme === 'darcula' ? '#404040' : (isDark ? '#404040' : '#eaecef'),
    linkColor: theme === 'darcula' ? '#58a6ff' : (isDark ? '#58a6ff' : '#0366d6'),
    blockquoteColor: theme === 'darcula' ? '#a0a0a0' : (isDark ? '#a0a0a0' : '#6a737d'),
    inlineCodeBackground: theme === 'darcula' ? 'rgba(255,255,255,0.1)' : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(27,31,35,0.05)'),
  };
}

const HLJS_DARK_CSS = `.hljs{display:block;overflow-x:auto;padding:0.5em;color:#e6edf3;background:#0d1117}.hljs-comment,.hljs-quote{color:#7d8590;font-style:italic}.hljs-addition,.hljs-keyword,.hljs-selector-tag{color:#ff7b72}.hljs-doctag,.hljs-literal,.hljs-meta,.hljs-number,.hljs-regexp,.hljs-string{color:#a5d6ff}.hljs-name,.hljs-section,.hljs-selector-class,.hljs-selector-id,.hljs-title{color:#d2a8ff;font-weight:700}.hljs-attr,.hljs-attribute,.hljs-class .hljs-title,.hljs-template-variable,.hljs-type,.hljs-variable{color:#79c0ff}.hljs-bullet,.hljs-link,.hljs-meta .hljs-keyword,.hljs-selector-attr,.hljs-selector-pseudo,.hljs-symbol,.hljs-title.class_{color:#f2cc60}.hljs-built_in,.hljs-deletion,.hljs-formula,.hljs-function .hljs-title,.hljs-title.function_{color:#d2a8ff}.hljs-emphasis{font-style:italic}.hljs-strong{font-weight:700}.hljs-link{text-decoration:underline}`;

const HLJS_LIGHT_CSS = `.hljs{display:block;overflow-x:auto;padding:0.5em;color:#24292f;background:#f6f8fa}.hljs-doctag,.hljs-keyword,.hljs-meta .hljs-keyword,.hljs-template-tag,.hljs-template-variable,.hljs-type,.hljs-variable.language_{color:#d73a49}.hljs-title,.hljs-title.class_,.hljs-title.class_.inherited__,.hljs-title.function_{color:#6f42c1}.hljs-attr,.hljs-attribute,.hljs-literal,.hljs-meta,.hljs-number,.hljs-operator,.hljs-selector-attr,.hljs-selector-class,.hljs-selector-id,.hljs-variable{color:#005cc5}.hljs-meta .hljs-string,.hljs-regexp,.hljs-string{color:#032f62}.hljs-built_in,.hljs-symbol{color:#e36209}.hljs-code,.hljs-comment,.hljs-formula{color:#6a737d}.hljs-name,.hljs-quote,.hljs-selector-pseudo,.hljs-selector-tag{color:#22863a}.hljs-subst{color:#24292f}.hljs-section{color:#005cc5;font-weight:700}.hljs-bullet{color:#735c0f}.hljs-emphasis{color:#24292f;font-style:italic}.hljs-strong{color:#24292f;font-weight:700}.hljs-addition{color:#22863a;background-color:#f0fff4}.hljs-deletion{color:#b31d28;background-color:#ffeef0}`;

/**
 * Get a data URI for highlight.js CSS based on theme.
 */
export function getHighlightStyleDataUri(darkMode: boolean, theme?: string): string {
  const isDark = darkMode || theme === 'darcula';
  const css = isDark ? HLJS_DARK_CSS : HLJS_LIGHT_CSS;
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

        .hljs {
            background: ${colors.codeBackground} !important;
        }`;
}

/**
 * Build a complete standalone HTML document for export.
 */
export function buildExportHTML(
  bodyHtml: string,
  darkMode: boolean,
  theme?: string,
  tableLayout: TableLayoutMode = DEFAULT_PREVIEW_SETTINGS.tableLayout,
): string {
  const colors = getExportThemeColors(darkMode, theme);
  const css = generateExportCSS(colors, tableLayout);
  const highlightStyle = getHighlightStyleDataUri(darkMode, theme);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Markdown Export</title>
    <style>${css}
    </style>
    <link rel="stylesheet" href="${highlightStyle}">
</head>
<body>
    ${bodyHtml}
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
