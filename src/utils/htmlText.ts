/**
 * Small text helpers shared by the HTML post-processors (code blocks, Mermaid,
 * PlantUML, easter-egg blocks). This module has no imports so it can be a leaf
 * dependency of both `markdownRenderers.ts` and `plantumlRenderer.ts` without
 * creating an import cycle.
 */

/**
 * Escape HTML-significant characters in untrusted text. Used for content that is
 * spliced into the preview HTML *after* DOMPurify has run (code blocks, and the
 * KaTeX/Mermaid/PlantUML error branches that echo raw user input), so it can
 * never inject live markup that bypasses sanitization.
 */
export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Undo the entity escaping marked (and Marp's markdown-it) apply to the text of
 * a fenced code block, recovering the author's source for a diagram engine.
 */
export function decodeCodeBlockEntities(code: string): string {
  return code
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/**
 * Replace the first occurrence of `needle` in `html` with `replacement`, taken
 * literally. `String.prototype.replace` with a string replacement interprets
 * `$&`, `` $` ``, `$'`, `$$` and `$n`, so splicing engine output (an SVG whose
 * labels may contain `$`) through it would corrupt the document; a function
 * replacement is never pattern-expanded.
 */
export function replaceFirst(html: string, needle: string, replacement: string): string {
  return html.replace(needle, () => replacement);
}
