import { desktopApi } from '../../api/desktopApi';
import { dirnameOf, isAbsoluteUrl, mimeTypeFromPath, resolveRelativePath, decodeImageSrc, stripQueryAndFragment, bytesToDataUri } from '../../utils/imagePathResolver';
import { escapeHtml } from '../../utils/htmlText';

/**
 * Convert easter-egg fence blocks (`:::shake … :::`) into animated `<div>`s.
 * Inner content is HTML-escaped and newlines become `<br>`. Runs before marked.
 */
export function processEasterEggBlocks(markdown: string): string {
  const easterEggPattern = /^:::(shake|rainbow|glow|bounce|blink)\s*\n([\s\S]*?)^:::[ \t]*$/gm;
  return markdown.replace(easterEggPattern, (_match, effect: string, innerContent: string) => {
    // Convert inner content to simple HTML (escape HTML entities, preserve line breaks)
    const escapedContent = escapeHtml(innerContent).replace(/\n/g, '<br>');
    // Ensure trailing newline so subsequent markdown is not consumed
    // by the HTML block (CommonMark: <div> swallows until blank line).
    return `<div class="ee-block ee-${effect}" data-effect="${effect}">${escapedContent}</div>\n`;
  });
}

/**
 * Rewrite the task-list markup emitted by marked so the preview's checkboxes
 * are clickable and mapped back to their source line:
 *
 *   <li><input disabled="" type="checkbox"> text<ul>…</ul></li>
 *   → <li class="checkbox-item" data-checkbox-index="n">
 *       <input type="checkbox" class="markdown-checkbox" data-checkbox-index="n">
 *       <div class="checkbox-text">text<ul>…</ul></div>
 *     </li>
 *
 * Every task item is tagged with its document-order index, which is the same
 * order findTaskLineIndices (taskListLines.ts) yields on the source side.
 *
 * This works on the DOM rather than a regex: a task item that holds a nested
 * list (or, for loose lists, `<p>` blocks) closes its `</li>` only after the
 * children, several lines later, which a line-bound regex never matched. That
 * left parent items as disabled native inputs and numbered only the leaves,
 * so a click toggled the wrong source line. Call this on marked's raw output,
 * before sanitizing, so the sanitizer sees the final markup (and no rendered
 * KaTeX / Mermaid content is round-tripped through the parser).
 */
export function transformCheckboxes(html: string): string {
  if (!/type="checkbox"/.test(html)) return html;

  const doc = new DOMParser().parseFromString(html, 'text/html');
  const inputs = doc.body.querySelectorAll<HTMLInputElement>(
    'li > input[type="checkbox"], li > p:first-child > input[type="checkbox"]',
  );

  let index = 0;
  for (const input of Array.from(inputs)) {
    const holder = input.parentElement; // the <li>, or its first <p> for loose items
    const li = holder?.closest('li');
    if (!holder || !li || !isLeadingChild(input)) continue;

    const checked = input.hasAttribute('checked');
    input.removeAttribute('disabled');
    input.classList.add('markdown-checkbox');
    input.setAttribute('data-checkbox-index', String(index));

    li.classList.add('checkbox-item');
    li.classList.toggle('checked', checked);
    li.setAttribute('data-checkbox-index', String(index));

    // Hoist the input to the front of the <li> and drop the whitespace marked
    // leaves between the input and the text.
    li.insertBefore(input, li.firstChild);
    const lead = holder === li ? input.nextSibling : holder.firstChild;
    if (lead?.nodeType === Node.TEXT_NODE) {
      lead.textContent = (lead.textContent ?? '').replace(/^\s+/, '');
      if (!lead.textContent) lead.remove();
    }

    // Everything else in the item (text, nested lists, paragraphs) becomes the
    // label block, so a nested list stays under its parent's text.
    const text = doc.createElement('div');
    text.className = 'checkbox-text';
    while (input.nextSibling) text.appendChild(input.nextSibling);
    li.appendChild(text);

    index++;
  }

  return doc.body.innerHTML;
}

/** True when only whitespace precedes the node inside its parent. */
function isLeadingChild(node: Node): boolean {
  for (let prev = node.previousSibling; prev; prev = prev.previousSibling) {
    if (prev.nodeType !== Node.TEXT_NODE || (prev.textContent ?? '').trim() !== '') return false;
  }
  return true;
}

// Feather icons (MIT): "copy" and "check". Inlined SVG so the button needs no
// image assets; aria-hidden because the <button> itself carries the label.
const COPY_BUTTON_HTML =
  '<button type="button" class="code-copy-button" aria-label="Copy code">' +
  '<svg class="copy-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>' +
  '<svg class="check-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>' +
  '</button>';

// The <pre><code class="hljs …"> blocks emitted by renderCode, optionally
// preceded by the `language:filename` label (<span class="code-filename">,
// #534). Escaped code content can never contain a literal `</code>`, so the
// lazy match is safe. Mermaid blocks carry `language-mermaid` without `hljs`
// and never match.
const HLJS_CODE_BLOCK_RE =
  /<pre>(?:<span class="code-filename">[^<]*<\/span>)?<code class="hljs[^"]*">[\s\S]*?<\/code><\/pre>/g;

/**
 * Wrap each syntax-highlighted code block in a positioning container with a
 * copy button. Runs on sanitized HTML — the injected markup is trusted and
 * static. Preview-only: the HTML/PDF export path builds its body separately
 * and never calls this, so exports stay button-free. Click handling and label
 * localization live in `usePreviewCodeCopy`.
 */
export function injectCodeCopyButtons(html: string): string {
  return html.replace(
    HLJS_CODE_BLOCK_RE,
    (block) => `<div class="code-block-wrapper">${COPY_BUTTON_HTML}${block}</div>`,
  );
}

const IMG_SRC_RE = /<img\s+[^>]*?src="([^"]+)"[^>]*?>/g;

/**
 * Find every relative `<img src>` in `html` and read its bytes through
 * `desktopApi.readFileBytes` — a Rust command, not the scoped fs plugin, so
 * an image (or the document itself) outside $HOME/$DESKTOP/$DOCUMENT/$DOWNLOAD
 * still loads (#623). `toUrl` turns the bytes into whatever URL form the
 * caller's output needs (blob: for the live preview, data: for a standalone
 * export). Absolute URLs are left untouched.
 */
async function collectLocalImageUrls(
  html: string,
  filePath: string,
  toUrl: (bytes: Uint8Array<ArrayBuffer>, mimeType: string) => string,
): Promise<Map<string, string>> {
  const baseDir = dirnameOf(filePath);
  const replacements = new Map<string, string>();
  const imgPromises: Promise<void>[] = [];

  let imgMatch;
  while ((imgMatch = IMG_SRC_RE.exec(html)) !== null) {
    const src = imgMatch[1];
    if (isAbsoluteUrl(src)) continue;
    // marked percent-encodes spaces / non-ASCII in the src; decode before
    // touching the filesystem so files like "my photo.png" resolve. A
    // trailing ?query/#fragment (e.g. "icon.svg?v=1") isn't part of the real
    // file name, so it's stripped before resolving the on-disk path (#623).
    const decodedSrc = decodeImageSrc(src);
    const absolutePath = resolveRelativePath(baseDir, stripQueryAndFragment(decodedSrc));
    imgPromises.push(
      desktopApi.readFileBytes(absolutePath).then(bytes => {
        replacements.set(src, toUrl(bytes, mimeTypeFromPath(decodedSrc)));
      }).catch(err => {
        console.warn('Failed to load image:', absolutePath, err);
      })
    );
  }

  await Promise.all(imgPromises);
  return replacements;
}

function applyImageUrlReplacements(html: string, replacements: Map<string, string>): string {
  let result = html;
  for (const [original, url] of replacements) {
    result = result.split(`src="${original}"`).join(`src="${url}"`);
  }
  return result;
}

/**
 * Resolve relative `<img src>` paths (relative to the document's directory) to
 * blob URLs. Returns the rewritten HTML plus the blob URLs that were created,
 * so the caller can revoke them when they are no longer needed.
 */
export async function resolveImagePaths(
  html: string,
  filePath: string,
): Promise<{ html: string; blobUrls: string[] }> {
  const replacements = await collectLocalImageUrls(html, filePath, (bytes, mimeType) => {
    const blob = new Blob([bytes], { type: mimeType });
    return URL.createObjectURL(blob);
  });

  return { html: applyImageUrlReplacements(html, replacements), blobUrls: Array.from(replacements.values()) };
}

/**
 * Resolve relative `<img src>` paths to inlined `data:` URIs instead of blob
 * URLs. Used by the HTML/PDF export path (useHtmlExport.ts): a blob: URL only
 * resolves inside the document that created it, but the exported HTML is
 * either written to an arbitrary folder (HTML export) or rendered from a temp
 * directory by the native PDF pipeline (PDF export) — in both cases a
 * separate context with no access to the original blob (#623).
 */
export async function resolveImagePathsToDataUris(html: string, filePath: string): Promise<string> {
  const replacements = await collectLocalImageUrls(html, filePath, bytesToDataUri);

  return applyImageUrlReplacements(html, replacements);
}
