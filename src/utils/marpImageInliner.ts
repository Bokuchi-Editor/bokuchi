import { convertFileSrc } from '@tauri-apps/api/core';
import { desktopApi } from '../api/desktopApi';
import {
  dirnameOf,
  isAbsoluteUrl,
  resolveRelativePath,
  decodeImageSrc,
  stripQueryAndFragment,
  isPathInDefaultFsScope,
  mimeTypeFromPath,
  bytesToDataUri,
} from './imagePathResolver';

/**
 * Rewrite relative image references in Marp HTML to Tauri asset-protocol URLs
 * (`convertFileSrc`) instead of embedding the bytes as base64 data URLs.
 *
 * Why asset:// rather than data URLs: a slide deck can reference many MB of images.
 * Base64-inlining them inflates the iframe srcDoc to tens of MB, held redundantly
 * across the marpHtml string, React state, the srcDoc attribute and the parsed DOM —
 * a memory blowup that contradicts Bokuchi's lightweight, offline-first goal (it once
 * blanked a deck whose images totalled ~13 MB). The asset protocol streams the file
 * from disk through the webview: still fully offline (no network), and it loads inside
 * every sandbox config we use — including the opaque-origin (`allow-scripts` only)
 * slide / thumbnail / fullscreen iframes (validated 2026-06-18 via prototype).
 *
 * Requires `app.security.assetProtocol.enable` + a path scope in tauri.conf.json, and
 * the asset origin in the CSP `img-src` (`asset: http://asset.localhost`).
 *
 * The asset protocol's scope is the same four roots ($HOME/$DESKTOP/$DOCUMENT/
 * $DOWNLOAD) as the fs plugin's, so an image outside them would silently fail
 * to load. For that (rare) case, bytes are read server-side via a Tauri
 * command that bypasses the scope and inlined as a `data:` URI instead,
 * trading the memory cost above for correctness only where it's needed (#623).
 *
 * Handles:
 * - <img src="..."> tags
 * - CSS url("...") patterns (Marp background images)
 * - <image href="..."> / <image xlink:href="..."> SVG elements
 *
 * Absolute / remote URLs (http:, data:, blob:, asset:) are left untouched.
 */
export async function rewriteMarpRelativeImages(html: string, filePath: string): Promise<string> {
  const baseDir = dirnameOf(filePath);
  const sources: string[] = [];

  function collectSrc(src: string) {
    if (isAbsoluteUrl(src) || sources.includes(src)) return;
    sources.push(src);
  }

  collectMatches(html, /<img\s+[^>]*?src="([^"]+)"[^>]*?>/g, collectSrc);
  // Marp encodes quotes as HTML entities in inline styles
  collectMatches(html, /url\(&quot;([^&]+)&quot;\)/g, collectSrc);
  // Fallback for unencoded quotes
  collectMatches(html, /url\("([^"]+)"\)/g, collectSrc);
  collectMatches(html, /<image\s+[^>]*?(?:xlink:)?href="([^"]+)"[^>]*?>/g, collectSrc);

  const replacements = new Map<string, string>();
  await Promise.all(
    sources.map(async (src) => {
      // Decode percent-encoding (spaces / non-ASCII) so files resolve on disk;
      // a trailing ?query/#fragment isn't part of the real file name either
      // (#623); the map key stays the raw src for the literal replacement below.
      const absolutePath = resolveRelativePath(baseDir, stripQueryAndFragment(decodeImageSrc(src)));
      if (await isPathInDefaultFsScope(absolutePath)) {
        replacements.set(src, convertFileSrc(absolutePath));
        return;
      }
      try {
        const bytes = await desktopApi.readFileBytes(absolutePath);
        replacements.set(src, bytesToDataUri(bytes, mimeTypeFromPath(absolutePath)));
      } catch (err) {
        console.warn('[MarpPreview] Failed to load out-of-scope image:', absolutePath, err);
      }
    }),
  );

  let result = html;
  for (const [original, assetUrl] of replacements) {
    if (assetUrl === original) continue;
    result = result.split(`src="${original}"`).join(`src="${assetUrl}"`);
    result = result.split(`url(&quot;${original}&quot;)`).join(`url(&quot;${assetUrl}&quot;)`);
    result = result.split(`url("${original}")`).join(`url("${assetUrl}")`);
    result = result.split(`href="${original}"`).join(`href="${assetUrl}"`);
  }
  return result;
}

function collectMatches(html: string, regex: RegExp, onMatch: (src: string) => void) {
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    onMatch(match[1]);
  }
}
