import { readFile } from '@tauri-apps/plugin-fs';
import { dirnameOf, isAbsoluteUrl, mimeTypeFromPath, resolveRelativePath, decodeImageSrc } from '../../utils/imagePathResolver';

/**
 * Convert easter-egg fence blocks (`:::shake … :::`) into animated `<div>`s.
 * Inner content is HTML-escaped and newlines become `<br>`. Runs before marked.
 */
export function processEasterEggBlocks(markdown: string): string {
  const easterEggPattern = /^:::(shake|rainbow|glow|bounce|blink)\s*\n([\s\S]*?)^:::[ \t]*$/gm;
  return markdown.replace(easterEggPattern, (_match, effect: string, innerContent: string) => {
    // Convert inner content to simple HTML (escape HTML entities, preserve line breaks)
    const escapedContent = innerContent
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');
    // Ensure trailing newline so subsequent markdown is not consumed
    // by the HTML block (CommonMark: <div> swallows until blank line).
    return `<div class="ee-block ee-${effect}" data-effect="${effect}">${escapedContent}</div>\n`;
  });
}

/**
 * Rewrite the checkbox markup emitted by marked: strip the `disabled` attribute,
 * make the inputs clickable, and tag each item with a stable index so a toggle
 * can be mapped back to the matching source line.
 */
export function transformCheckboxes(html: string): string {
  // Counter to track checkbox positions
  let checkboxIndex = 0;

  // Remove disabled attribute and make checkboxes clickable
  const checkboxPattern = /<li[^>]*>(\s*)<input\s+([^>]*?)(?:disabled="[^"]*")?\s*([^>]*?)type="checkbox"([^>]*?)>(\s*)(.*?)<\/li>/g;

  return html.replace(checkboxPattern, (_match: string, indent: string, beforeType: string, between: string, afterType: string, _afterInput: string, text: string) => {
    // Check if checked attribute exists
    const isChecked = /checked(?:="[^"]*")?/.test(beforeType + between + afterType);
    const checkboxId = `checkbox-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const result = `<li class="checkbox-item ${isChecked ? 'checked' : ''}" data-checkbox-id="${checkboxId}" data-checked="${isChecked}" data-indent="${indent.length}" data-checkbox-index="${checkboxIndex}">
            ${indent}<input type="checkbox" ${isChecked ? 'checked' : ''} class="markdown-checkbox" data-checkbox-id="${checkboxId}" data-checkbox-index="${checkboxIndex}">
            <span class="checkbox-text">${text}</span>
          </li>`;
    checkboxIndex++;
    return result;
  });
}

/**
 * Resolve relative `<img src>` paths (relative to the document's directory) to
 * blob URLs by reading the files through the Tauri FS plugin. Absolute URLs are
 * left untouched. Returns the rewritten HTML plus the blob URLs that were
 * created, so the caller can revoke them when they are no longer needed.
 */
export async function resolveImagePaths(
  html: string,
  filePath: string,
): Promise<{ html: string; blobUrls: string[] }> {
  const baseDir = dirnameOf(filePath);
  const imgRegex = /<img\s+[^>]*?src="([^"]+)"[^>]*?>/g;
  let imgMatch;
  const replacements = new Map<string, string>();

  const imgPromises: Promise<void>[] = [];
  while ((imgMatch = imgRegex.exec(html)) !== null) {
    const src = imgMatch[1];
    if (!isAbsoluteUrl(src)) {
      // marked percent-encodes spaces / non-ASCII in the src; decode before
      // touching the filesystem so files like "my photo.png" resolve.
      const decodedSrc = decodeImageSrc(src);
      const absolutePath = resolveRelativePath(baseDir, decodedSrc);
      imgPromises.push(
        readFile(absolutePath).then(data => {
          const blob = new Blob([data], { type: mimeTypeFromPath(decodedSrc) });
          const blobUrl = URL.createObjectURL(blob);
          replacements.set(src, blobUrl);
        }).catch(err => {
          console.warn('Failed to load image:', absolutePath, err);
        })
      );
    }
  }

  await Promise.all(imgPromises);

  let resolvedHtml = html;
  for (const [original, blobUrl] of replacements) {
    resolvedHtml = resolvedHtml.split(`src="${original}"`).join(`src="${blobUrl}"`);
  }

  return { html: resolvedHtml, blobUrls: Array.from(replacements.values()) };
}
