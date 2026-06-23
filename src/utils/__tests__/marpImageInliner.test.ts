import { describe, it, expect, vi } from 'vitest';

// Mock the Tauri asset-protocol helper so the rewrite is deterministic and runnable
// outside the webview. Mirrors convertFileSrc's real shape: asset://localhost/<enc>.
vi.mock('@tauri-apps/api/core', () => ({
  convertFileSrc: (path: string) => `asset://localhost/${encodeURIComponent(path)}`,
}));

import { rewriteMarpRelativeImages } from '../marpImageInliner';

const FILE = '/Users/me/deck/slides.md';
const asset = (abs: string) => `asset://localhost/${encodeURIComponent(abs)}`;

describe('rewriteMarpRelativeImages', () => {
  it('rewrites a relative <img src> to an asset:// URL (no base64)', () => {
    const out = rewriteMarpRelativeImages('<img src="pic.png">', FILE);
    expect(out).toBe(`<img src="${asset('/Users/me/deck/pic.png')}">`);
    expect(out).not.toContain('data:');
    expect(out).not.toContain('base64');
  });

  it('resolves parent-relative paths against the file directory', () => {
    const out = rewriteMarpRelativeImages('<img src="../images/x.png">', FILE);
    expect(out).toContain(asset('/Users/me/images/x.png'));
  });

  it('rewrites CSS url() backgrounds, both entity-encoded and plain quotes', () => {
    const entity = rewriteMarpRelativeImages('<section style="background:url(&quot;bg.jpg&quot;)">', FILE);
    expect(entity).toContain(`url(&quot;${asset('/Users/me/deck/bg.jpg')}&quot;)`);
    const plain = rewriteMarpRelativeImages('<i style="background:url(&quot;a&quot;)">x url("bg.jpg")', FILE);
    expect(plain).toContain(`url("${asset('/Users/me/deck/bg.jpg')}")`);
  });

  it('rewrites SVG <image href> / xlink:href', () => {
    const out = rewriteMarpRelativeImages('<image href="d.png"></image><image xlink:href="e.png"></image>', FILE);
    expect(out).toContain(asset('/Users/me/deck/d.png'));
    expect(out).toContain(asset('/Users/me/deck/e.png'));
  });

  it('leaves absolute / remote / data / asset URLs untouched', () => {
    const html =
      '<img src="https://x/y.png"><img src="data:image/png;base64,AAA"><img src="asset://localhost/z">';
    expect(rewriteMarpRelativeImages(html, FILE)).toBe(html);
  });
});
