import hljs from 'highlight.js';
import type { RenderingSettings } from '../types/settings';

/** Languages handled by post-processors — skip syntax highlighting */
const POST_PROCESSED_LANGS = new Set(['mermaid']);

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
  const langClass = lang ? ` language-${lang}` : '';
  const highlighted = hljs.highlightAuto(text).value;
  return `<pre><code class="hljs${langClass}">${highlighted}</code></pre>`;
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

/**
 * Process KaTeX math expressions in markdown.
 * Returns the processed markdown with math rendered to HTML.
 * Code blocks are protected from processing.
 */
export async function processKatex(markdown: string): Promise<string> {
  const katex = await getKatex();

  // Protect code blocks
  const codeBlocks: string[] = [];
  let result = markdown.replace(CODE_BLOCK_RE, (match) => {
    codeBlocks.push(match);
    return `%%CODEBLOCK_${codeBlocks.length - 1}%%`;
  });

  // Process display math ($$...$$) first
  result = result.replace(DISPLAY_MATH_RE, (_match, tex: string) => {
    try {
      return katex.renderToString(tex.trim(), { displayMode: true, throwOnError: false }).replace(/\n/g, '');
    } catch {
      return `<span class="katex-error" style="color:red;">${tex}</span>`;
    }
  });

  // Process inline math ($...$)
  result = result.replace(INLINE_MATH_RE, (_match, tex: string) => {
    try {
      return katex.renderToString(tex.trim(), { displayMode: false, throwOnError: false }).replace(/\n/g, '');
    } catch {
      return `<span class="katex-error" style="color:red;">${tex}</span>`;
    }
  });

  // Restore code blocks
  result = result.replace(/%%CODEBLOCK_(\d+)%%/g, (_match, index: string) => {
    return codeBlocks[parseInt(index)];
  });

  return result;
}

let mermaidCounter = 0;

// Serialize mermaid renders to prevent concurrent DOM manipulation
let mermaidLock: Promise<void> = Promise.resolve();

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
    releaseLock!();
  }
}

async function processMermaidBlocksInternal(html: string, dark?: boolean): Promise<string> {
  const mermaid = await getMermaid(dark);

  // Find mermaid diagram placeholders in the HTML
  // After marked processes ```mermaid blocks, they become <pre><code class="...mermaid...">
  const mermaidHtmlRe = /<pre><code class="[^"]*(?:language-mermaid|mermaid)[^"]*">([\s\S]*?)<\/code><\/pre>/g;

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

/**
 * Process markdown content with optional KaTeX and Mermaid rendering.
 * Only loads libraries when the feature is enabled AND the content uses them.
 */
export async function processRenderingExtensions(
  markdown: string,
  html: string,
  settings: RenderingSettings,
  darkMode: boolean,
): Promise<{ processedMarkdown: string; processedHtml: string }> {
  let processedMarkdown = markdown;
  let processedHtml = html;

  // KaTeX: process markdown before marked
  if (settings.enableKatex && contentHasKatex(markdown)) {
    processedMarkdown = await processKatex(markdown);
  }

  // Mermaid: process HTML after marked (will be called separately)
  if (settings.enableMermaid && contentHasMermaid(markdown)) {
    reinitializeMermaid(darkMode);
    processedHtml = await processMermaidBlocks(html, darkMode);
  }

  return { processedMarkdown, processedHtml };
}
