import type { MarkedExtension, Tokens } from 'marked';

/**
 * GitHub emoji shortcode extension for marked (#488): `:rocket:` → 🚀.
 *
 * The shortcode → emoji map comes from GitHub's official gemoji database (see
 * src/assets/emoji/README.md) and is loaded lazily — the JSON is its own chunk
 * and only fetched when a document actually contains a `:shortcode:` pattern.
 *
 * Matching follows github.com behavior:
 * - Lookup is case-sensitive (all aliases are lowercase; `:ROCKET:` stays text).
 * - Unknown shortcodes render as literal text.
 * - GitHub-custom image emoji (`:octocat:` …) are not in the map → literal text.
 * - Shortcodes inside code spans/blocks are untouched — the tokenizer runs at
 *   marked's inline level, which code never reaches.
 * - Emoji render as native Unicode characters (same offline policy as the Marp
 *   path, which uses native emoji instead of Twemoji images).
 */

export type EmojiShortcodeMap = Record<string, string>;

interface EmojiShortcodeToken extends Tokens.Generic {
  type: 'emojiShortcode';
  emoji: string;
}

// Shortcode charset is pinned by the generator (see assets/emoji/README.md).
// The regex accepts uppercase so near-misses are cleanly consumed-or-rejected
// as one candidate, but the case-sensitive map lookup decides the outcome.
const EMOJI_SHORTCODE_RE = /^:([a-zA-Z0-9_+-]+):/;
const EMOJI_SHORTCODE_DETECT_RE = /:[a-zA-Z0-9_+-]+:/;

/** Quick pre-check so the map chunk is only loaded for documents that need it. */
export function contentHasEmojiShortcode(content: string): boolean {
  return EMOJI_SHORTCODE_DETECT_RE.test(content);
}

let emojiMapPromise: Promise<EmojiShortcodeMap> | null = null;

/** Load (and cache) the shortcode → emoji map as a lazy chunk. */
export function loadEmojiShortcodeMap(): Promise<EmojiShortcodeMap> {
  emojiMapPromise ??= import('../assets/emoji/shortcodes.json').then(
    (mod) => mod.default as EmojiShortcodeMap,
  );
  return emojiMapPromise;
}

/** Build the marked extension for a loaded shortcode map. */
export function emojiShortcodeExtension(map: EmojiShortcodeMap): MarkedExtension {
  return {
    extensions: [
      {
        name: 'emojiShortcode',
        level: 'inline',
        start(src: string) {
          const index = src.indexOf(':');
          return index === -1 ? undefined : index;
        },
        tokenizer(src: string): EmojiShortcodeToken | undefined {
          const match = EMOJI_SHORTCODE_RE.exec(src);
          if (!match) return undefined;
          // Own-property guard: without it, `:toString:` / `:__proto__:` etc.
          // would resolve through Object.prototype and render function source.
          const emoji = Object.prototype.hasOwnProperty.call(map, match[1])
            ? map[match[1]]
            : undefined;
          if (typeof emoji !== 'string') return undefined;
          return { type: 'emojiShortcode', raw: match[0], emoji };
        },
        renderer(token) {
          return (token as EmojiShortcodeToken).emoji;
        },
      },
    ],
  };
}
