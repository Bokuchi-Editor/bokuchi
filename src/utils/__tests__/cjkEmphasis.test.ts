import { describe, it, expect } from 'vitest';
import { marked } from 'marked';
import { fixCjkEmphasis, stripCjkEmphasisMarker } from '../cjkEmphasis';

/**
 * Regression coverage for issue #400: CommonMark flanking rules drop `**bold**`
 * / `*italic*` when a delimiter touches CJK punctuation/letters. fixCjkEmphasis
 * inserts invisible Word Joiners so emphasis renders, and stripCjkEmphasisMarker
 * removes them from the output. Mirrors the preview/export marked invocation.
 */
function render(md: string): string {
  const html = marked(fixCjkEmphasis(md), { breaks: true, gfm: true, async: false }) as string;
  return stripCjkEmphasisMarker(html);
}

const MARKER = '⁠'; // U+2060 Word Joiner

describe('fixCjkEmphasis (issue #400)', () => {
  it('renders bold when the delimiter sits between CJK punctuation and a CJK letter', () => {
    // The exact failing string from the issue report.
    const out = render(
      'drawio-mcpを使うと、**「隣に座ってdraw.ioを操作してくれる優秀なアシスタント」**へと進化します。'
    );
    expect(out).toContain('<strong>「隣に座ってdraw.ioを操作してくれる優秀なアシスタント」</strong>');
    expect(out).not.toContain('**');
  });

  it('renders bold for CJK text mid-sentence', () => {
    expect(render('これは**「重要」**な話。')).toContain('<strong>「重要」</strong>');
  });

  it('renders italic for CJK text', () => {
    expect(render('「あ」*強調*へ進む')).toContain('<em>強調</em>');
  });

  it('still renders cases that already worked', () => {
    expect(render('これは**強調**です')).toContain('<strong>強調</strong>');
    expect(render('a **bold** b')).toContain('<strong>bold</strong>');
    expect(render('**bold**text')).toContain('<strong>bold</strong>');
  });

  it('does not turn CJK-adjacent literal asterisks into emphasis', () => {
    expect(render('面積 = 縦 * 横')).not.toMatch(/<(strong|em)>/);
    expect(render('価格は\\*\\*重要\\*\\*です')).not.toMatch(/<(strong|em)>/);
  });

  it('leaves asterisks inside inline code untouched', () => {
    const out = render('`**コード**`へ');
    expect(out).toContain('<code>**コード**</code>');
    expect(out).not.toMatch(/<strong>/);
  });

  it('leaves asterisks inside fenced code blocks untouched', () => {
    const out = render('```\n**コード**な行\n```');
    expect(out).toContain('**コード**な行');
    expect(out).not.toMatch(/<strong>/);
  });

  it('strips every inserted marker from the output', () => {
    const out = render('**「重要」**な点と*強調*と通常の**bold**。');
    expect(out).not.toContain(MARKER);
  });

  it('stripCjkEmphasisMarker removes only the Word Joiner', () => {
    expect(stripCjkEmphasisMarker(`a${MARKER}b${MARKER}c`)).toBe('abc');
    expect(stripCjkEmphasisMarker('no markers here')).toBe('no markers here');
  });

  it('does not insert markers into marker-free, CJK-free text', () => {
    expect(fixCjkEmphasis('**bold** plain ascii *italic*')).not.toContain(MARKER);
  });
});
