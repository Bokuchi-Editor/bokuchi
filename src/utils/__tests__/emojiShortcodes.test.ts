import { describe, it, expect } from 'vitest';
import { marked } from 'marked';
import { parseMarkdownToHtml } from '../parseMarkdown';
import {
  contentHasEmojiShortcode,
  loadEmojiShortcodeMap,
  type EmojiShortcodeMap,
} from '../emojiShortcodes';

const MAP: EmojiShortcodeMap = {
  rocket: '🚀',
  tada: '🎉',
  sparkles: '✨',
  '+1': '👍',
  '-1': '👎',
};

const render = (markdown: string, emojiMap: EmojiShortcodeMap | null = MAP) =>
  parseMarkdownToHtml(markdown, { renderer: new marked.Renderer(), emojiMap });

describe('emojiShortcodeExtension', () => {
  it('converts known shortcodes to unicode emoji (T-EM-01)', async () => {
    const html = await render('Launch :rocket: and party :tada:');
    expect(html).toContain('Launch 🚀 and party 🎉');
  });

  it('converts +1 / -1 shortcodes (T-EM-02)', async () => {
    const html = await render(':+1: :-1:');
    expect(html).toContain('👍 👎');
  });

  it('leaves unknown shortcodes (e.g. GitHub-custom :octocat:) as literal text (T-EM-03)', async () => {
    const html = await render(':octocat: :notarealemoji:');
    expect(html).toContain(':octocat:');
    expect(html).toContain(':notarealemoji:');
  });

  it('is case-sensitive like GitHub (:ROCKET: stays literal) (T-EM-04)', async () => {
    const html = await render(':ROCKET:');
    expect(html).toContain(':ROCKET:');
    expect(html).not.toContain('🚀');
  });

  it('does not convert inside inline code (T-EM-05)', async () => {
    const html = await render('use `:rocket:` here');
    expect(html).toContain(':rocket:');
    expect(html).not.toContain('🚀');
  });

  it('does not convert inside fenced code blocks (T-EM-06)', async () => {
    const html = await render('```\n:rocket:\n```');
    expect(html).toContain(':rocket:');
    expect(html).not.toContain('🚀');
  });

  it('does not mangle times like 10:30:45 (digit-only candidate misses the map) (T-EM-07)', async () => {
    const html = await render('meeting at 10:30:45');
    expect(html).toContain('10:30:45');
  });

  it('does not resolve Object.prototype members as emoji (T-EM-13)', async () => {
    // Uses the real gemoji map (a plain JSON object): without an own-property
    // guard, :toString: would render function source via the prototype chain.
    const realMap = await loadEmojiShortcodeMap();
    const html = await render(':toString: :constructor: :hasOwnProperty: :valueOf:', realMap);
    expect(html).toContain(':toString:');
    expect(html).toContain(':constructor:');
    expect(html).toContain(':hasOwnProperty:');
    expect(html).toContain(':valueOf:');
    expect(html).not.toContain('native code');
    // `:__proto__:` needs its own doc: the `__…__` is markdown emphasis, so the
    // shortcode never reaches the tokenizer intact (GitHub behaves the same) —
    // what matters is that nothing resolves to "[object Object]".
    const protoHtml = await render(':__proto__:', realMap);
    expect(protoHtml).not.toContain('[object Object]');
  });

  it('converts nothing when the map is not provided (setting off / no candidates) (T-EM-08)', async () => {
    const html = await render(':rocket:', null);
    expect(html).toContain(':rocket:');
    expect(html).not.toContain('🚀');
  });

  it('converts shortcodes inside a GitHub alert body (T-EM-09)', async () => {
    const html = await render('> [!TIP]\n> ship it :rocket:');
    expect(html).toContain('markdown-alert-tip');
    expect(html).toContain('ship it 🚀');
  });

  it('converts shortcodes inside table cells and emphasis (T-EM-10)', async () => {
    const html = await render('| a |\n|---|\n| :tada: |\n\n**bold :sparkles:**');
    expect(html).toContain('🎉');
    expect(html).toContain('<strong>bold ✨</strong>');
  });
});

describe('contentHasEmojiShortcode', () => {
  it('detects shortcode candidates (T-EM-11)', () => {
    expect(contentHasEmojiShortcode('hello :rocket:')).toBe(true);
    expect(contentHasEmojiShortcode('10:30:45')).toBe(true); // candidate; map decides
    expect(contentHasEmojiShortcode('no emoji here')).toBe(false);
    expect(contentHasEmojiShortcode('a : b : c')).toBe(false);
  });
});

describe('loadEmojiShortcodeMap', () => {
  it('loads the real gemoji map with the issue #488 examples (T-EM-12)', async () => {
    const map = await loadEmojiShortcodeMap();
    expect(map['rocket']).toBe('🚀');
    expect(map['tada']).toBe('🎉');
    expect(map['sparkles']).toBe('✨');
    // GitHub-custom image emoji must NOT be in the map (offline policy).
    expect(map['octocat']).toBeUndefined();
    expect(Object.keys(map).length).toBeGreaterThan(1800);
  });
});
