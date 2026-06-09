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
 *
 * This is the ONLY place user Markdown is sanitized for the standard preview and
 * HTML export. The Marp path does NOT go through here — Marp renders via
 * marp-core into a sandboxed iframe — so the CSS restrictions below intentionally
 * do not affect Marp slide styling.
 */

// CSS `position` values that take an element out of normal flow so it can paint
// over the rest of the UI — the primitive behind a full-screen overlay / fake
// dialog (clickjacking / phishing) built from `style` alone, with no script.
// `relative` / `static` stay in flow and are harmless, so they are kept.
const OVERLAY_POSITION = /^(fixed|absolute|sticky)$/i;

/**
 * Remove overlay-enabling `position` from an inline style value while preserving
 * everything else. Uses the CSSOM to parse robustly (handles `!important`, odd
 * casing, and `url(data:…;base64,…)` values that a naive `;` split would corrupt),
 * and also drops a `position` that is fed through `var()` indirection, which the
 * CSSOM can't resolve at parse time.
 */
function stripOverlayPositioning(style: string): string {
  if (!/position/i.test(style)) return style;

  // `var()` indirection (e.g. `--p:fixed; position:var(--p)`) can't be resolved
  // here, so treat any var()-driven position as unsafe and drop it.
  const positionUsesVar = /position\s*:\s*[^;]*var\s*\(/i.test(style);

  if (typeof document === 'undefined') {
    // No DOM (SSR/edge): best-effort string strip.
    return style.replace(/position\s*:\s*(fixed|absolute|sticky)\b[^;]*;?/gi, '');
  }

  const el = document.createElement('div');
  el.style.cssText = style;
  const value = el.style.position.trim().toLowerCase();
  if (OVERLAY_POSITION.test(value) || positionUsesVar) {
    el.style.removeProperty('position');
  }
  return el.style.cssText;
}

function stripOverlayStyleHook(_node: Element, data: { attrName: string; attrValue: string }): void {
  if (data.attrName === 'style' && data.attrValue) {
    data.attrValue = stripOverlayPositioning(data.attrValue);
  }
}

export function sanitizeUserHtml(html: string): string {
  // `style` and `target` are kept so legitimate inline styling and
  // `<a target="_blank">` in user Markdown keep working (event handlers and
  // `<script>` are removed regardless). `<style>` blocks are forbidden so CSS
  // rules can't be used for the same overlay attack the inline-style hook below
  // defends against.
  //
  // The hook is registered only around our own synchronous sanitize() call and
  // removed immediately, so it never leaks into other DOMPurify users that share
  // this singleton (e.g. Mermaid's internal sanitization).
  DOMPurify.addHook('uponSanitizeAttribute', stripOverlayStyleHook);
  try {
    return DOMPurify.sanitize(html, {
      ADD_ATTR: ['style', 'target'],
      FORBID_TAGS: ['style'],
    });
  } finally {
    DOMPurify.removeHook('uponSanitizeAttribute');
  }
}
