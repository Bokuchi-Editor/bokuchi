import { describe, it, expect, vi } from 'vitest';

// Mock the Tauri asset-protocol helper so the rewrite is deterministic and runnable
// outside the webview. Mirrors convertFileSrc's real shape: asset://localhost/<enc>.
// A spy so tests can assert WHICH filesystem path was handed to the protocol.
vi.mock('@tauri-apps/api/core', () => ({
  convertFileSrc: vi.fn((path: string) => `asset://localhost/${encodeURIComponent(path)}`),
}));

// Fixed scope roots so paths under /Users/me (the FILE fixture below) resolve
// as in-scope, exercising the common convertFileSrc path by default. A FILE
// path outside this root exercises the out-of-scope data: URI fallback (#623).
vi.mock('@tauri-apps/api/path', () => ({
  homeDir: vi.fn().mockResolvedValue('/Users/me'),
  desktopDir: vi.fn().mockResolvedValue('/Users/me/Desktop'),
  documentDir: vi.fn().mockResolvedValue('/Users/me/Documents'),
  downloadDir: vi.fn().mockResolvedValue('/Users/me/Downloads'),
}));

const readFileBytesMock = vi.fn();
vi.mock('../../api/desktopApi', () => ({
  desktopApi: { readFileBytes: (path: string) => readFileBytesMock(path) },
}));

import { convertFileSrc } from '@tauri-apps/api/core';
import { rewriteMarpRelativeImages } from '../marpImageInliner';

const FILE = '/Users/me/deck/slides.md';
const asset = (abs: string) => `asset://localhost/${encodeURIComponent(abs)}`;

describe('rewriteMarpRelativeImages', () => {
  it('rewrites a relative <img src> to an asset:// URL (no base64)', async () => {
    const out = await rewriteMarpRelativeImages('<img src="pic.png">', FILE);
    expect(out).toBe(`<img src="${asset('/Users/me/deck/pic.png')}">`);
    expect(out).not.toContain('data:');
    expect(out).not.toContain('base64');
  });

  it('resolves parent-relative paths against the file directory', async () => {
    const out = await rewriteMarpRelativeImages('<img src="../images/x.png">', FILE);
    expect(out).toContain(asset('/Users/me/images/x.png'));
  });

  it('rewrites CSS url() backgrounds, both entity-encoded and plain quotes', async () => {
    const entity = await rewriteMarpRelativeImages('<section style="background:url(&quot;bg.jpg&quot;)">', FILE);
    expect(entity).toContain(`url(&quot;${asset('/Users/me/deck/bg.jpg')}&quot;)`);
    const plain = await rewriteMarpRelativeImages('<i style="background:url(&quot;a&quot;)">x url("bg.jpg")', FILE);
    expect(plain).toContain(`url("${asset('/Users/me/deck/bg.jpg')}")`);
  });

  it('rewrites SVG <image href> / xlink:href', async () => {
    const out = await rewriteMarpRelativeImages('<image href="d.png"></image><image xlink:href="e.png"></image>', FILE);
    expect(out).toContain(asset('/Users/me/deck/d.png'));
    expect(out).toContain(asset('/Users/me/deck/e.png'));
  });

  it('leaves absolute / remote / data / asset URLs untouched', async () => {
    const html =
      '<img src="https://x/y.png"><img src="data:image/png;base64,AAA"><img src="asset://localhost/z">';
    expect(await rewriteMarpRelativeImages(html, FILE)).toBe(html);
  });

  // B-10 regression (KNOWLEDGE.md): marked percent-encodes <img src> URLs, but
  // the file on disk has the literal characters. The decode must happen exactly
  // where the src becomes a filesystem path (convertFileSrc input), while the
  // HTML replacement key must stay the raw encoded src — decoding it too would
  // make the literal string replacement miss. These pin that split so a
  // refactor can't move the decode to the wrong side.
  it('decodes percent-encoded src for the fs path but replaces the encoded key (B-10)', async () => {
    vi.mocked(convertFileSrc).mockClear();
    const out = await rewriteMarpRelativeImages('<img src="images/my%20photo.png">', FILE);
    // Filesystem side: decoded literal path handed to the asset protocol.
    expect(convertFileSrc).toHaveBeenCalledWith('/Users/me/deck/images/my photo.png');
    // HTML side: the encoded src was matched and fully replaced.
    expect(out).toBe(`<img src="${asset('/Users/me/deck/images/my photo.png')}">`);
  });

  it('decodes percent-encoded non-ASCII filenames (Japanese screenshot names, B-10)', async () => {
    vi.mocked(convertFileSrc).mockClear();
    const name = 'スクリーンショット 2026-07-06 22.41.43.png';
    const html = `<img src="images/${encodeURIComponent(name)}">`;
    const out = await rewriteMarpRelativeImages(html, FILE);
    expect(convertFileSrc).toHaveBeenCalledWith(`/Users/me/deck/images/${name}`);
    expect(out).toBe(`<img src="${asset(`/Users/me/deck/images/${name}`)}">`);
  });

  // #623: a trailing ?query/#fragment isn't part of the real file name, so it
  // must not reach the filesystem path — but the HTML replacement key (the
  // raw src) still carries it, same split as the percent-decoding case above.
  it('strips a trailing ?query/#fragment before resolving the fs path (#623)', async () => {
    vi.mocked(convertFileSrc).mockClear();
    const out = await rewriteMarpRelativeImages('<img src="icon.svg?v=1">', FILE);
    expect(convertFileSrc).toHaveBeenCalledWith('/Users/me/deck/icon.svg');
    expect(out).toBe(`<img src="${asset('/Users/me/deck/icon.svg')}">`);
  });

  // #623: a deck living outside $HOME/$DESKTOP/$DOCUMENT/$DOWNLOAD is outside
  // the asset protocol's static scope too — fall back to reading the bytes
  // server-side and inlining as a data: URI instead of convertFileSrc.
  it('falls back to a data: URI for an image outside the default fs scope (#623)', async () => {
    vi.mocked(convertFileSrc).mockClear();
    readFileBytesMock.mockResolvedValue(new Uint8Array([1, 2, 3]));
    const outOfScopeFile = '/Volumes/external/deck.md';
    const out = await rewriteMarpRelativeImages('<img src="icon.svg">', outOfScopeFile);
    expect(readFileBytesMock).toHaveBeenCalledWith('/Volumes/external/icon.svg');
    expect(convertFileSrc).not.toHaveBeenCalled();
    expect(out).toContain('data:image/svg+xml;base64,');
  });
});
