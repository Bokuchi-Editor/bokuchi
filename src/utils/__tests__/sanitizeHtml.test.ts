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

/**
 * Regression for the CSS-injection UI-redressing hole (GHSA-5qr5-6vh4-6g2j):
 * because `style` is allowed (legitimate inline styling in Markdown), a file
 * could embed a `position:fixed; z-index:99999` overlay built from style alone —
 * no script needed — to cover the whole window with a fake auth dialog and lock
 * the user out of the app. sanitizeUserHtml strips overlay positioning at the
 * source so it never reaches the preview OR the HTML-export output.
 */
describe('sanitizeUserHtml — CSS overlay injection', () => {
  it('strips position:fixed from style while keeping the rest', () => {
    // NB: declaration list kept jsdom-CSSOM-parseable — jsdom's cssstyle drops
    // the whole `cssText` for some shorthand combos (e.g. height%+background),
    // which the real Chromium webview parses fine. The contract under test is:
    // position removed, sibling declarations preserved.
    const out = sanitizeUserHtml(
      '<div style="position:fixed;top:0;z-index:99999;color:red">x</div>',
    );
    expect(out.toLowerCase()).not.toContain('position:fixed');
    expect(out.toLowerCase()).not.toContain('position: fixed');
    // unrelated declarations survive
    expect(out.toLowerCase()).toContain('z-index');
    expect(out.toLowerCase()).toContain('color');
  });

  it('strips position:absolute and position:sticky too', () => {
    const abs = sanitizeUserHtml('<div style="position:absolute;top:0">x</div>');
    const stk = sanitizeUserHtml('<div style="position:sticky;top:0">x</div>');
    expect(abs.toLowerCase()).not.toContain('position');
    expect(stk.toLowerCase()).not.toContain('position');
  });

  it('keeps harmless position:relative / static', () => {
    const out = sanitizeUserHtml('<div style="position:relative">x</div>');
    expect(out.toLowerCase()).toContain('position');
  });

  it('drops position fed through a var() indirection', () => {
    const out = sanitizeUserHtml('<div style="--p:fixed;position:var(--p)">x</div>');
    expect(out.toLowerCase()).not.toContain('position:var');
    expect(out.toLowerCase()).not.toContain('position: var');
  });

  it('is not fooled by !important or odd casing', () => {
    const out = sanitizeUserHtml('<div style="POSITION: FIXED !important">x</div>');
    expect(out.toLowerCase()).not.toContain('fixed');
  });

  it('forbids <style> blocks (overlay via CSS rules)', () => {
    const out = sanitizeUserHtml('<style>body{position:fixed}</style><p>hi</p>');
    expect(out.toLowerCase()).not.toContain('<style');
    expect(out).toContain('<p>hi</p>');
  });

  it('neutralizes the full PoC overlay+fake-dialog payload', () => {
    // Condensed from test_css_phishing.md (the reporter's PoC).
    const poc =
      '<div style="position:fixed;top:0;left:0;z-index:99998;color:red">' +
      '<div style="position:absolute;padding:32px">Authentication Required' +
      '<input type="password" value="hunter2">' +
      '<a href="https://attacker.com/phish" target="_blank">Sign In</a>' +
      '</div></div>';
    const out = sanitizeUserHtml(poc);
    // No overlay positioning survives → cannot cover the window.
    expect(out.toLowerCase()).not.toContain('position:fixed');
    expect(out.toLowerCase()).not.toContain('position: fixed');
    expect(out.toLowerCase()).not.toContain('position:absolute');
    expect(out.toLowerCase()).not.toContain('position: absolute');
    // benign content/attributes are preserved
    expect(out).toContain('Authentication Required');
    expect(out).toContain('target="_blank"');
  });

  it('does not let the hook leak into later sanitize calls', () => {
    // The hook is added/removed around each call; a benign position must survive
    // a call that follows one which stripped an overlay.
    sanitizeUserHtml('<div style="position:fixed">x</div>');
    const out = sanitizeUserHtml('<div style="position:relative">x</div>');
    expect(out.toLowerCase()).toContain('position');
  });
});
