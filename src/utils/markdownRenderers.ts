import hljs from 'highlight.js';
import type { Token, Tokens } from 'marked';
import { maskCodeRegions, stripCodeRegions } from './codeRegions';
import { PLANTUML_LANGS } from './plantumlRenderer';
import { decodeCodeBlockEntities, escapeHtml, replaceFirst } from './htmlText';
import { buildDiagramErrorHtml, createSerialLock } from './diagramCommon';

/** Languages always handled by a post-processor — skip syntax highlighting. */
const ALWAYS_POST_PROCESSED_LANGS = ['mermaid'];

/**
 * Build a custom `marked` table renderer that tags every cell with its source
 * coordinates (`data-bk-table` = Nth table in the document, `data-bk-row` =
 * -1 for the header / 0-based for body rows, `data-bk-col`). These let the
 * preview map a clicked cell back to the Markdown source for inline editing.
 *
 * A fresh renderer is created per parse so the table counter resets. Assign the
 * returned function to `renderer.table`; marked binds `this` to the renderer
 * (which exposes `parser.parseInline` for rendering cell content).
 */
export function createTableRenderer() {
  let tableIndex = 0;
  return function (this: { parser: { parseInline: (tokens: Token[]) => string } }, token: Tokens.Table): string {
    const ti = tableIndex++;
    const parser = this.parser;
    const aligns = token.align || [];

    const renderCell = (cell: Tokens.TableCell, tag: 'th' | 'td', row: number, col: number): string => {
      const align = aligns[col];
      const alignAttr = align ? ` align="${align}"` : '';
      const content = parser.parseInline(cell.tokens);
      return `<${tag}${alignAttr} data-bk-table="${ti}" data-bk-row="${row}" data-bk-col="${col}">${content}</${tag}>`;
    };

    let header = '';
    token.header.forEach((cell, col) => {
      header += renderCell(cell, 'th', -1, col);
    });

    let body = '';
    token.rows.forEach((rowCells, row) => {
      let tr = '';
      rowCells.forEach((cell, col) => {
        tr += renderCell(cell, 'td', row, col);
      });
      body += `<tr>\n${tr}</tr>\n`;
    });

    return (
      `<table>\n<thead>\n<tr>\n${header}</tr>\n</thead>\n` +
      (body ? `<tbody>\n${body}</tbody>\n` : '') +
      `</table>\n`
    );
  };
}

/** Language + optional filename parsed from a fenced code block's info string. */
export interface CodeFenceInfo {
  /** Language identifier to feed the highlighter (undefined = none given). */
  lang?: string;
  /** Filename label to show above the block (undefined = none given). */
  filename?: string;
}

/**
 * Parse a fenced code block's info string (marked hands the whole trimmed info
 * string over as `lang`).
 *
 * Only the first whitespace-delimited word is significant, matching marked's
 * default renderer and CommonMark practice (`js extra words` → `js`). Within
 * that word, a Qiita-style `language:filename` pair is split at the FIRST
 * colon so paths keep any later colons (`ts:src/index.ts`, `:README` for a
 * filename-only block). An empty half is dropped (`rb:` → language only).
 * Issue #534.
 */
export function parseCodeFenceInfo(info?: string): CodeFenceInfo {
  const word = (info ?? '').trim().split(/\s+/)[0] ?? '';
  if (!word) return {};
  const colon = word.indexOf(':');
  if (colon === -1) return { lang: word };
  const lang = word.slice(0, colon);
  const filename = word.slice(colon + 1);
  return {
    lang: lang || undefined,
    filename: filename || undefined,
  };
}

/**
 * Filename label rendered as the first child of `<pre>` so it inherits every
 * theme's `pre` colors (syntax.css overrides them per theme with !important)
 * and travels with the block into HTML/PDF export unchanged. Styled by
 * `.code-filename` in previewStyles.ts / exportStyles.ts. The text is user
 * input, so it is HTML-escaped.
 */
function renderFilenameLabel(filename?: string): string {
  return filename ? `<span class="code-filename">${escapeHtml(filename)}</span>` : '';
}

export interface CodeRendererOptions {
  /**
   * Treat PlantUML fences as post-processed blocks. When the PlantUML setting
   * is off the blocks are never replaced by a diagram, so they must stay
   * ordinary code blocks (hljs styling, copy button, filename label) exactly
   * as before the feature existed.
   */
  enablePlantUml?: boolean;
}

type CodeToken = { text: string; lang?: string; escaped?: boolean };

/**
 * Build the custom code renderer for marked: applies syntax highlighting and
 * preserves post-processed language blocks (mermaid, and PlantUML when
 * enabled) as bare `<pre><code class="language-…">` for the diagram engines.
 *
 * Supports the `language:filename` info-string syntax (#534): only the
 * language half reaches highlight.js, and the filename is emitted as a label
 * inside the `<pre>` (see {@link parseCodeFenceInfo}).
 */
export function createCodeRenderer({ enablePlantUml = false }: CodeRendererOptions = {}): (token: CodeToken) => string {
  const postProcessedLangs = new Set<string>(
    enablePlantUml ? [...ALWAYS_POST_PROCESSED_LANGS, ...PLANTUML_LANGS] : ALWAYS_POST_PROCESSED_LANGS,
  );

  return function renderCode({ text, lang: info }: CodeToken): string {
    const { lang, filename } = parseCodeFenceInfo(info);
    // Post-processed languages: output raw text with language class preserved.
    // A filename is dropped here — the block is replaced by a rendered diagram.
    if (lang && postProcessedLangs.has(lang)) {
      const escaped = escapeHtml(text);
      return `<pre><code class="language-${lang}">${escaped}</code></pre>`;
    }
    const label = renderFilenameLabel(filename);
    if (lang && hljs.getLanguage(lang)) {
      try {
        const highlighted = hljs.highlight(text, { language: lang }).value;
        return `<pre>${label}<code class="hljs language-${lang}">${highlighted}</code></pre>`;
      } catch (err) {
        console.warn('Highlight.js error:', err);
      }
    }
    // No language (or unknown language): do not auto-detect. Emit plain,
    // HTML-escaped code so the user's intent (unspecified = no highlighting)
    // is respected.
    const escaped = escapeHtml(text);
    const langClass = lang ? ` language-${lang}` : '';
    return `<pre>${label}<code class="hljs${langClass}">${escaped}</code></pre>`;
  };
}

/** Code renderer with every diagram post-processor enabled. */
export const renderCode = createCodeRenderer({ enablePlantUml: true });

// Lazy-loaded module caches
let katexModule: typeof import('katex') | null = null;
let mermaidModule: typeof import('mermaid') | null = null;
let mermaidInitialized = false;

async function getKatex() {
  if (!katexModule) {
    katexModule = await import('katex');
    await import('katex/dist/katex.min.css');
  }
  return katexModule.default;
}

async function getMermaid(dark?: boolean) {
  if (!mermaidModule) {
    mermaidModule = await import('mermaid');
    if (!mermaidInitialized) {
      mermaidModule.default.initialize({
        startOnLoad: false,
        theme: dark ? 'dark' : 'default',
        securityLevel: 'strict',
        // Mermaid 11.14.0 leaks the bomb-icon SVG into document.body on parse
        // failure (throw happens before removeTempElements). We render our own
        // error UI in processMermaidBlocks, so suppress Mermaid's built-in one.
        suppressErrorRendering: true,
      });
      mermaidInitialized = true;
    }
  }
  return mermaidModule.default;
}

/** Re-initialize mermaid with the given theme (call when dark mode changes) */
export function reinitializeMermaid(dark: boolean) {
  if (mermaidModule && mermaidInitialized) {
    mermaidModule.default.initialize({
      startOnLoad: false,
      theme: dark ? 'dark' : 'default',
      securityLevel: 'strict',
      suppressErrorRendering: true,
    });
  }
}

// Regex patterns
// Detection patterns (no 'g' flag — .test() on global regex is stateful and
// would skip matches on alternating calls due to lastIndex advancing)
const DISPLAY_MATH_DETECT_RE = /\$\$([\s\S]*?)\$\$/;
const INLINE_MATH_DETECT_RE = /(?<!\$)\$(?!\$)((?:[^$\\]|\\.)+)\$(?!\$)/;
const MERMAID_BLOCK_DETECT_RE = /```mermaid\s*\n([\s\S]*?)```/;

// Processing patterns (with 'g' flag for replace/exec loops)
const DISPLAY_MATH_RE = /\$\$([\s\S]*?)\$\$/g;
const INLINE_MATH_RE = /(?<!\$)\$(?!\$)((?:[^$\\]|\\.)+)\$(?!\$)/g;

/** Check whether content contains KaTeX syntax (outside code blocks) */
export function contentHasKatex(content: string): boolean {
  const stripped = stripCodeRegions(content);
  return DISPLAY_MATH_DETECT_RE.test(stripped) || INLINE_MATH_DETECT_RE.test(stripped);
}

/** Check whether content contains a mermaid fenced block */
export function contentHasMermaid(content: string): boolean {
  return MERMAID_BLOCK_DETECT_RE.test(content);
}

/** Result of {@link processKatex}: placeholder-laden markdown plus a restore step. */
export interface ProcessedKatex {
  /** Markdown where each math expression is replaced by an inert placeholder token. */
  markdown: string;
  /** Swaps the placeholder tokens back to rendered KaTeX HTML (call after marked). */
  restore: (html: string) => string;
}

// Placeholder token wrapping the math index. Intentionally pure [A-Za-z0-9] so
// marked treats it as a plain word and never transforms it.
const KATEX_PLACEHOLDER_RE = /KaTeXmathPLACEHOLDER(\d+)END/g;
const makeKatexPlaceholder = (index: number) => `KaTeXmathPLACEHOLDER${index}END`;

/**
 * Render KaTeX math expressions in markdown, but DON'T inline the HTML — replace
 * each expression with an inert placeholder and return a `restore()` that swaps
 * the rendered HTML back in AFTER marked has run.
 *
 * Why placeholders instead of inlining the HTML before marked:
 * KaTeX's output contains characters that are markdown-significant — most
 * notably a literal tilde for accents (`\tilde` -> `<span class="mord">~</span>`,
 * in both HTML and MathML output). When two such expressions share a document,
 * marked's GFM strikethrough (`~...~`) pairs the tildes across expressions and
 * injects unbalanced `<del>` tags INTO the rendered KaTeX markup, corrupting the
 * DOM so the whole preview renders blank (issue #354). Keeping the rendered HTML
 * out of marked's input entirely is the robust fix: marked only ever sees the
 * alphanumeric placeholders, so no KaTeX output can collide with markdown syntax.
 *
 * Code blocks are protected so `$...$` inside them is left untouched.
 */
export async function processKatex(markdown: string): Promise<ProcessedKatex> {
  const katex = await getKatex();

  // Protect code blocks and inline code spans (lexer-accurate; issue #468)
  const { masked, restore: restoreCode } = maskCodeRegions(markdown);
  let result = masked;

  const renderedMath: string[] = [];
  const renderMath = (tex: string, displayMode: boolean): string => {
    let html: string;
    try {
      html = katex.renderToString(tex.trim(), { displayMode, throwOnError: false }).replace(/\n/g, '');
    } catch {
      // tex is raw user input and this HTML is restored AFTER DOMPurify, so it
      // must be escaped to avoid an XSS that bypasses sanitization.
      html = `<span class="katex-error" style="color:red;">${escapeHtml(tex)}</span>`;
    }
    const placeholder = makeKatexPlaceholder(renderedMath.length);
    renderedMath.push(html);
    return placeholder;
  };

  // Process display math ($$...$$) first, then inline ($...$).
  result = result.replace(DISPLAY_MATH_RE, (_match, tex: string) => renderMath(tex, true));
  result = result.replace(INLINE_MATH_RE, (_match, tex: string) => renderMath(tex, false));

  // Restore code blocks
  result = restoreCode(result);

  const restore = (html: string): string =>
    html.replace(KATEX_PLACEHOLDER_RE, (_match, index: string) => renderedMath[parseInt(index)] ?? '');

  return { markdown: result, restore };
}

let mermaidCounter = 0;

// Serialize mermaid renders to prevent concurrent DOM manipulation
const mermaidLock = createSerialLock();

/**
 * Remove DOM elements that mermaid leaks into <body>.
 *
 * mermaid renders into a temp <div id="d${id}"> appended to document.body, and
 * several diagram renderers also append measurement helpers straight to <body>:
 * a bare <svg> (calculateTextDimensions), <div id="cy"> (layout engines) and
 * <div class="mermaidTooltip">. The text-measurement <svg> is the worst
 * offender — calculateTextDimensions throws "svg element not in render tree"
 * *before* it removes its own <svg> whenever getBBox() returns 0×0 (which
 * happens during window/fullscreen layout transitions), so the stray <svg>
 * stays in <body> and shows up as a mystery element at the bottom of the app.
 *
 * suppressErrorRendering only suppresses mermaid's own bomb overlay; it does
 * not clean these up. We sweep them ourselves after every render pass. A bare
 * <svg> / #cy / .mermaidTooltip as a direct child of <body> is never something
 * this app produces (React mounts under #root, MUI portals are <div>s), so
 * removing them is safe.
 */
function cleanupMermaidArtifacts(): void {
  if (typeof document === 'undefined' || !document.body) return;
  const strays = document.body.querySelectorAll(
    ':scope > svg, :scope > div#cy, :scope > div.mermaidTooltip, ' +
    ':scope > [id^="dmermaid-"], :scope > [id^="mermaid-"]'
  );
  strays.forEach((el) => el.remove());
}

/**
 * Process mermaid code blocks in HTML (after marked parsing).
 * Replaces ```mermaid blocks with rendered SVG.
 * Serialized to prevent concurrent mermaid.render() calls which conflict.
 */
export function processMermaidBlocks(html: string, dark?: boolean): Promise<string> {
  return mermaidLock.run(async () => {
    try {
      return await processMermaidBlocksInternal(html, dark);
    } finally {
      cleanupMermaidArtifacts();
    }
  });
}

async function processMermaidBlocksInternal(html: string, dark?: boolean): Promise<string> {
  const mermaid = await getMermaid(dark);

  // Find mermaid diagram placeholders in the HTML
  // After marked processes ```mermaid blocks, they become <pre><code class="...mermaid...">
  // Marp emits <pre is="marp-pre" data-auto-scaling="..."><code class="language-mermaid">,
  // so allow attributes on <pre> (matches both forms).
  const mermaidHtmlRe = /<pre[^>]*><code class="[^"]*(?:language-mermaid|mermaid)[^"]*">([\s\S]*?)<\/code><\/pre>/g;

  const matches: { full: string; code: string }[] = [];
  let match;
  while ((match = mermaidHtmlRe.exec(html)) !== null) {
    matches.push({ full: match[0], code: match[1] });
  }

  if (matches.length === 0) return html;

  let result = html;
  for (const m of matches) {
    const decoded = decodeCodeBlockEntities(m.code);

    try {
      const id = `mermaid-${Date.now()}-${mermaidCounter++}`;
      const { svg } = await mermaid.render(id, decoded);
      result = replaceFirst(result, m.full, `<div class="mermaid-diagram">${svg}</div>`);
    } catch (err) {
      // Mermaid's parse-error message echoes the offending source line verbatim,
      // so it can carry attacker-controlled markup (e.g. `<img onerror>`). This
      // HTML is spliced in AFTER DOMPurify has run; buildDiagramErrorHtml
      // escapes it to prevent an XSS that bypasses sanitization.
      result = replaceFirst(result, m.full, buildDiagramErrorHtml('mermaid-error', 'Mermaid Error', err));
    }
  }

  return result;
}
