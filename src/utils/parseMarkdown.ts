import { Marked } from 'marked';
import type { Renderer } from 'marked';
import { githubAlertsExtension } from './githubAlerts';
import { emojiShortcodeExtension, type EmojiShortcodeMap } from './emojiShortcodes';
import { fixCjkEmphasis, stripCjkEmphasisMarker } from './cjkEmphasis';

export interface ParseMarkdownOptions {
  /** Custom renderer (code highlighting, table cell tagging, …). */
  renderer: Renderer;
  /** Shortcode → emoji map; null/undefined disables emoji conversion. */
  emojiMap?: EmojiShortcodeMap | null;
}

/**
 * Shared markdown → HTML step for the preview and the HTML/PDF export, so both
 * always render through the same marked configuration: GFM + breaks, the CJK
 * emphasis workaround (#400), GitHub Alerts, and (optionally) emoji shortcodes
 * (#488).
 *
 * A fresh `Marked` instance is built per call — the global `marked` singleton
 * is intentionally left untouched so extensions can never leak into other
 * consumers, and the emoji extension can vary with the user's setting.
 *
 * The output is marked's raw HTML: the caller must still run sanitizeUserHtml
 * on it (before splicing in trusted KaTeX/Mermaid content).
 */
export async function parseMarkdownToHtml(
  markdown: string,
  { renderer, emojiMap }: ParseMarkdownOptions,
): Promise<string> {
  const md = new Marked();
  md.use(githubAlertsExtension());
  if (emojiMap) {
    md.use(emojiShortcodeExtension(emojiMap));
  }

  const result = md.parse(fixCjkEmphasis(markdown), {
    breaks: true,
    gfm: true,
    renderer,
  });
  const html = typeof result === 'string' ? result : await result;
  return stripCjkEmphasisMarker(html);
}
