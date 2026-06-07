import DOMPurify from 'dompurify';

/**
 * Sanitize the HTML that `marked()` produces from user-authored Markdown,
 * stripping script-injection vectors (`<script>`, `onerror=`/`onload=` handlers,
 * `javascript:` URLs, …) while keeping the markup the preview relies on
 * (GFM task-list checkboxes, easter-egg `data-effect` blocks, relative image
 * `src`, links/tables/images).
 *
 * IMPORTANT — call this on marked's RAW output, BEFORE the app splices in its
 * own trusted HTML: rendered KaTeX (including the MathML `<semantics>` /
 * `<annotation>` accessibility layer), Mermaid SVG (whose `<foreignObject>`
 * carries every node label) and blob-URL images. DOMPurify's default profile
 * strips all three, so they must be injected post-sanitize. Sanitizing the
 * fully-assembled HTML instead would silently break math, diagrams and local
 * images — the user content is the only untrusted part, and it is fully present
 * in marked's output (KaTeX/Mermaid are still inert placeholders/code blocks at
 * this point, and `<img src>` is still the original relative path).
 */
export function sanitizeUserHtml(html: string): string {
  // `style` and `target` are kept so legitimate inline styling and
  // `<a target="_blank">` in user Markdown keep working (event handlers and
  // `<script>` are removed regardless).
  return DOMPurify.sanitize(html, { ADD_ATTR: ['style', 'target'] });
}
