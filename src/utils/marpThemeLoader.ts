import { readFile } from '@tauri-apps/plugin-fs';
import { dirnameOf, isAbsoluteUrl, resolveRelativePath } from './imagePathResolver';
import { MARP_FRONTMATTER_RE } from './marpRenderer';

/**
 * Bokuchi-specific `theme-src` front-matter directive.
 *
 * Unlike the standard `theme:` directive (which selects a *registered* Marp
 * theme by name), `theme-src` points at a CSS file by relative path:
 *
 *   ---
 *   marp: true
 *   theme: company        # base theme (registered)
 *   theme-src: ./styles/common.css   # extra layer, resolved from this .md file
 *   ---
 *
 * The referenced CSS is appended *after* the Marp-generated theme CSS, so its
 * rules win on equal specificity (standard CSS last-wins cascade). It is meant
 * as an additive layer on top of `theme:`, not a full theme on its own.
 *
 * `theme-src` is ignored by Marp itself (unknown directive), so it stays inert
 * when the markdown is opened in other Marp tools.
 */

/** Extract the raw `theme-src` value from Marp front-matter, or null if absent. */
export function extractThemeSrc(content: string): string | null {
  const fm = MARP_FRONTMATTER_RE.exec(content);
  if (!fm) return null;
  const line = /^theme-src:\s*(.+?)\s*$/m.exec(fm[1]);
  if (!line) return null;
  let value = line[1].trim();
  // Strip a single layer of surrounding quotes (YAML allows quoted scalars).
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  return value || null;
}

/**
 * Resolve and read the CSS referenced by a `theme-src` directive.
 * Returns the file's text, or '' when the directive is absent, points at an
 * absolute URL, or the file cannot be read. The path is resolved relative to
 * the markdown file's directory; absolute URLs (http/https/data/blob) are
 * rejected so the editor never acts as a fetch proxy and only touches local
 * files inside the Tauri fs scope.
 */
export async function loadThemeSrcCss(content: string, filePath: string): Promise<string> {
  const themeSrc = extractThemeSrc(content);
  if (!themeSrc) return '';
  if (isAbsoluteUrl(themeSrc)) {
    console.warn('[MarpPreview] theme-src must be a relative path; ignoring:', themeSrc);
    return '';
  }

  const absolutePath = resolveRelativePath(dirnameOf(filePath), themeSrc);
  try {
    const data = await readFile(absolutePath);
    return new TextDecoder('utf-8').decode(data);
  } catch (err) {
    console.error('[MarpPreview] Failed to load theme-src CSS:', absolutePath, err);
    return '';
  }
}
