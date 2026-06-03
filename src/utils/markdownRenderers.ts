import hljs from 'highlight.js';
import type { Token, Tokens } from 'marked';

/** Languages handled by post-processors — skip syntax highlighting */
const POST_PROCESSED_LANGS = new Set(['mermaid']);

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

/**
 * Custom code renderer for marked that applies syntax highlighting
 * and preserves post-processed language blocks (e.g. mermaid).
 */
export function renderCode({ text, lang }: { text: string; lang?: string; escaped?: boolean }): string {
  // Post-processed languages: output raw text with language class preserved
  if (lang && POST_PROCESSED_LANGS.has(lang)) {
    const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<pre><code class="language-${lang}">${escaped}</code></pre>`;
  }
  if (lang && hljs.getLanguage(lang)) {
    try {
      const highlighted = hljs.highlight(text, { language: lang }).value;
      return `<pre><code class="hljs language-${lang}">${highlighted}</code></pre>`;
    } catch (err) {
      console.warn('Highlight.js error:', err);
    }
  }
  // No language (or unknown language): do not auto-detect. Emit plain,
  // HTML-escaped code so the user's intent (unspecified = no highlighting)
  // is respected.
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const langClass = lang ? ` language-${lang}` : '';
  return `<pre><code class="hljs${langClass}">${escaped}</code></pre>`;
}

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
const CODE_BLOCK_RE = /```[\s\S]*?```|`[^`\n]+`/g;
const DISPLAY_MATH_RE = /\$\$([\s\S]*?)\$\$/g;
const INLINE_MATH_RE = /(?<!\$)\$(?!\$)((?:[^$\\]|\\.)+)\$(?!\$)/g;

/** Check whether content contains KaTeX syntax (outside code blocks) */
export function contentHasKatex(content: string): boolean {
  const stripped = content.replace(CODE_BLOCK_RE, '');
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

  // Protect code blocks
  const codeBlocks: string[] = [];
  let result = markdown.replace(CODE_BLOCK_RE, (match) => {
    codeBlocks.push(match);
    return `%%CODEBLOCK_${codeBlocks.length - 1}%%`;
  });

  const renderedMath: string[] = [];
  const renderMath = (tex: string, displayMode: boolean): string => {
    let html: string;
    try {
      html = katex.renderToString(tex.trim(), { displayMode, throwOnError: false }).replace(/\n/g, '');
    } catch {
      html = `<span class="katex-error" style="color:red;">${tex}</span>`;
    }
    const placeholder = makeKatexPlaceholder(renderedMath.length);
    renderedMath.push(html);
    return placeholder;
  };

  // Process display math ($$...$$) first, then inline ($...$).
  result = result.replace(DISPLAY_MATH_RE, (_match, tex: string) => renderMath(tex, true));
  result = result.replace(INLINE_MATH_RE, (_match, tex: string) => renderMath(tex, false));

  // Restore code blocks
  result = result.replace(/%%CODEBLOCK_(\d+)%%/g, (_match, index: string) => {
    return codeBlocks[parseInt(index)];
  });

  const restore = (html: string): string =>
    html.replace(KATEX_PLACEHOLDER_RE, (_match, index: string) => renderedMath[parseInt(index)] ?? '');

  return { markdown: result, restore };
}

let mermaidCounter = 0;

// Serialize mermaid renders to prevent concurrent DOM manipulation
let mermaidLock: Promise<void> = Promise.resolve();

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
export async function processMermaidBlocks(html: string, dark?: boolean): Promise<string> {
  // Wait for any in-flight mermaid render to complete
  const previousLock = mermaidLock;
  let releaseLock: () => void;
  mermaidLock = new Promise<void>((resolve) => { releaseLock = resolve; });
  await previousLock;

  try {
    return await processMermaidBlocksInternal(html, dark);
  } finally {
    cleanupMermaidArtifacts();
    releaseLock!();
  }
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
    // Decode HTML entities that marked may have introduced
    const decoded = m.code
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    try {
      const id = `mermaid-${Date.now()}-${mermaidCounter++}`;
      const { svg } = await mermaid.render(id, decoded);
      result = result.replace(m.full, `<div class="mermaid-diagram">${svg}</div>`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      result = result.replace(
        m.full,
        `<div class="mermaid-error" style="color:red;border:1px solid red;padding:8px;border-radius:4px;"><strong>Mermaid Error:</strong> ${errorMsg}</div>`
      );
    }
  }

  return result;
}
