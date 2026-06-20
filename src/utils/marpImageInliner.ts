import { convertFileSrc } from '@tauri-apps/api/core';
import { dirnameOf, isAbsoluteUrl, resolveRelativePath } from './imagePathResolver';

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
 * Handles:
 * - <img src="..."> tags
 * - CSS url("...") patterns (Marp background images)
 * - <image href="..."> / <image xlink:href="..."> SVG elements
 *
 * Absolute / remote URLs (http:, data:, blob:, asset:) are left untouched.
 */
export function rewriteMarpRelativeImages(html: string, filePath: string): string {
  const baseDir = dirnameOf(filePath);
  const replacements = new Map<string, string>();

  function collectSrc(src: string) {
    if (isAbsoluteUrl(src) || replacements.has(src)) return;
    const absolutePath = resolveRelativePath(baseDir, src);
    replacements.set(src, convertFileSrc(absolutePath));
  }

  collectMatches(html, /<img\s+[^>]*?src="([^"]+)"[^>]*?>/g, collectSrc);
  // Marp encodes quotes as HTML entities in inline styles
  collectMatches(html, /url\(&quot;([^&]+)&quot;\)/g, collectSrc);
  // Fallback for unencoded quotes
  collectMatches(html, /url\("([^"]+)"\)/g, collectSrc);
  collectMatches(html, /<image\s+[^>]*?(?:xlink:)?href="([^"]+)"[^>]*?>/g, collectSrc);

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
