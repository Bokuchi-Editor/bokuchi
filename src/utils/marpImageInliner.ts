import { readFile } from '@tauri-apps/plugin-fs';
import { dirnameOf, isAbsoluteUrl, mimeTypeFromPath, resolveRelativePath } from './imagePathResolver';

/**
 * Replace relative image references in Marp HTML with inline data URLs.
 * Data URLs are used (instead of blob URLs) so the sandboxed iframe can
 * display images without a same-origin relationship to the host document.
 *
 * Handles:
 * - <img src="..."> tags
 * - CSS url("...") patterns (Marp background images)
 * - <image href="..."> / <image xlink:href="..."> SVG elements
 */
export async function inlineMarpRelativeImages(html: string, filePath: string): Promise<string> {
  const baseDir = dirnameOf(filePath);
  const replacements = new Map<string, string>();
  const promises: Promise<void>[] = [];

  function collectSrc(src: string) {
    if (isAbsoluteUrl(src) || replacements.has(src)) return;
    replacements.set(src, src); // reserve to avoid duplicate work
    const absolutePath = resolveRelativePath(baseDir, src);
    promises.push(
      readAsDataUrl(absolutePath, src)
        .then((dataUrl) => {
          replacements.set(src, dataUrl);
        })
        .catch((err) => {
          console.error('[MarpPreview] Failed to inline image:', absolutePath, err);
        }),
    );
  }

  collectMatches(html, /<img\s+[^>]*?src="([^"]+)"[^>]*?>/g, collectSrc);
  // Marp encodes quotes as HTML entities in inline styles
  collectMatches(html, /url\(&quot;([^&]+)&quot;\)/g, collectSrc);
  // Fallback for unencoded quotes
  collectMatches(html, /url\("([^"]+)"\)/g, collectSrc);
  collectMatches(html, /<image\s+[^>]*?(?:xlink:)?href="([^"]+)"[^>]*?>/g, collectSrc);

  await Promise.all(promises);

  let result = html;
  for (const [original, dataUrl] of replacements) {
    if (dataUrl === original) continue;
    result = result.split(`src="${original}"`).join(`src="${dataUrl}"`);
    result = result.split(`url(&quot;${original}&quot;)`).join(`url(&quot;${dataUrl}&quot;)`);
    result = result.split(`url("${original}")`).join(`url("${dataUrl}")`);
    result = result.split(`href="${original}"`).join(`href="${dataUrl}"`);
  }
  return result;
}

function collectMatches(html: string, regex: RegExp, onMatch: (src: string) => void) {
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    onMatch(match[1]);
  }
}

async function readAsDataUrl(absolutePath: string, src: string): Promise<string> {
  const data = await readFile(absolutePath);
  const mime = mimeTypeFromPath(src);
  let binary = '';
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
  return `data:${mime};base64,${btoa(binary)}`;
}
