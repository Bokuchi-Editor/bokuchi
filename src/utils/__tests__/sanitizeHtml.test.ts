import { describe, it, expect } from 'vitest';
import { sanitizeUserHtml } from '../sanitizeHtml';

/**
 * Regression for the Markdown-preview XSS hole: marked() passes raw HTML in the
 * source straight through, so an `.md` file like `<img src=x onerror=alert(1)>`
 * executed arbitrary JS once injected via dangerouslySetInnerHTML.
 *
 * sanitizeUserHtml() runs on marked's RAW output — BEFORE the app splices in its
 * own trusted HTML (rendered KaTeX, Mermaid SVG, blob-URL images). These tests
 * lock in both halves of the contract:
 *   1. script-injection vectors are stripped, and
 *   2. the markup the app injects/relies on is NOT stripped — which is exactly
 *      why sanitization must happen here and not on the fully-assembled HTML
 *      (DOMPurify's default profile removes MathML `<semantics>`/`<annotation>`,
 *      SVG `<foreignObject>` and `blob:` URLs).
 */
describe('sanitizeUserHtml', () => {
  it('strips event-handler attributes', () => {
    const out = sanitizeUserHtml('<img src="x" onerror="alert(1)">');
    expect(out).toContain('<img');
    expect(out.toLowerCase()).not.toContain('onerror');
    expect(out).not.toContain('alert(1)');
  });

  it('strips <script> tags', () => {
    const out = sanitizeUserHtml('<p>hi</p><script>alert(1)</script>');
    expect(out).toContain('<p>hi</p>');
    expect(out.toLowerCase()).not.toContain('<script');
  });

  it('strips javascript: URLs from links', () => {
    const out = sanitizeUserHtml('<a href="javascript:alert(1)">x</a>');
    expect(out.toLowerCase()).not.toContain('javascript:');
  });

  it('keeps task-list checkboxes (marked output) intact', () => {
    const out = sanitizeUserHtml('<li><input type="checkbox" disabled checked> done</li>');
    expect(out).toContain('type="checkbox"');
  });

  it('keeps easter-egg data-effect blocks', () => {
    const out = sanitizeUserHtml('<div class="ee-block ee-shake" data-effect="shake">x</div>');
    expect(out).toContain('data-effect="shake"');
  });

  it('keeps relative image src so blob resolution can run afterwards', () => {
    // Local images are rewritten to blob: URLs AFTER sanitization; the relative
    // path must survive here (a blob: URL would itself be stripped by default).
    const out = sanitizeUserHtml('<img src="images/diagram.png" alt="d">');
    expect(out).toContain('src="images/diagram.png"');
  });

  it('keeps inline style and link target attributes', () => {
    const out = sanitizeUserHtml('<a href="https://x.test" target="_blank" style="color:red">x</a>');
    expect(out).toContain('target="_blank"');
    expect(out).toContain('style="color:red"');
  });
});
