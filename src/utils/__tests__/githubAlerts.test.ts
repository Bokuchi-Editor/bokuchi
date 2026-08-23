import { describe, it, expect } from 'vitest';
import { marked } from 'marked';
import { parseMarkdownToHtml } from '../parseMarkdown';
import { sanitizeUserHtml } from '../sanitizeHtml';

// Behavioral contract pinned against github.com's own renderer
// (Markdown REST API, mode=gfm) on 2026-08-23 — see githubAlerts.ts.

const render = (markdown: string) =>
  parseMarkdownToHtml(markdown, { renderer: new marked.Renderer() });

describe('githubAlertsExtension', () => {
  it('renders a basic [!NOTE] blockquote as an alert (T-GA-01)', async () => {
    const html = await render('> [!NOTE]\n> body');
    expect(html).toContain('<div class="markdown-alert markdown-alert-note">');
    expect(html).toContain('<p class="markdown-alert-title">');
    expect(html).toContain('octicon-info');
    expect(html).toContain('Note</p>');
    expect(html).toContain('<p>body</p>');
    expect(html).not.toContain('<blockquote>');
  });

  it('matches the type case-insensitively, like GitHub (T-GA-02)', async () => {
    expect(await render('> [!note]\n> body')).toContain('markdown-alert-note');
    expect(await render('> [!Note]\n> body')).toContain('markdown-alert-note');
  });

  it('renders each variant with its title and octicon (T-GA-03)', async () => {
    const cases = [
      { type: 'NOTE', variant: 'note', title: 'Note', icon: 'octicon-info' },
      { type: 'TIP', variant: 'tip', title: 'Tip', icon: 'octicon-light-bulb' },
      { type: 'IMPORTANT', variant: 'important', title: 'Important', icon: 'octicon-report' },
      { type: 'WARNING', variant: 'warning', title: 'Warning', icon: 'octicon-alert' },
      { type: 'CAUTION', variant: 'caution', title: 'Caution', icon: 'octicon-stop' },
    ];
    for (const { type, variant, title, icon } of cases) {
      const html = await render(`> [!${type}]\n> body`);
      expect(html).toContain(`markdown-alert-${variant}`);
      expect(html).toContain(`${title}</p>`);
      expect(html).toContain(icon);
    }
  });

  it('leaves unknown types as a plain blockquote (T-GA-04)', async () => {
    const html = await render('> [!FOO]\n> body');
    expect(html).toContain('<blockquote>');
    expect(html).not.toContain('markdown-alert');
  });

  it('leaves a marker with trailing text on the same line as a plain blockquote (T-GA-05)', async () => {
    const html = await render('> [!NOTE] extra\n> body');
    expect(html).toContain('<blockquote>');
    expect(html).not.toContain('markdown-alert');
  });

  it('ignores a marker that is not on the first line (T-GA-06)', async () => {
    const html = await render('> text\n> [!NOTE]');
    expect(html).toContain('<blockquote>');
    expect(html).not.toContain('markdown-alert');
  });

  it('leaves a marker-only blockquote (no body) as a plain blockquote (T-GA-07)', async () => {
    const html = await render('> [!TIP]');
    expect(html).toContain('<blockquote>');
    expect(html).not.toContain('markdown-alert');
  });

  it('does not upgrade nested blockquotes (T-GA-08)', async () => {
    const html = await render('> > [!WARNING]\n> > inner');
    expect(html).not.toContain('markdown-alert');
  });

  it('does not upgrade a blockquote inside a list item (T-GA-09)', async () => {
    const html = await render('- item\n  > [!NOTE]\n  > body');
    expect(html).not.toContain('markdown-alert');
  });

  it('accepts trailing whitespace after the marker (T-GA-10)', async () => {
    const html = await render('> [!NOTE]   \n> body');
    expect(html).toContain('markdown-alert-note');
  });

  it('keeps multi-paragraph bodies inside the alert (T-GA-11)', async () => {
    const html = await render('> [!CAUTION]\n> first\n>\n> second');
    expect(html).toContain('markdown-alert-caution');
    expect(html).toContain('<p>first</p>');
    expect(html).toContain('<p>second</p>');
    expect(html).not.toContain('<blockquote>');
  });

  it('supports block content (lists) as the alert body (T-GA-12)', async () => {
    const html = await render('> [!IMPORTANT]\n> - item1\n> - item2');
    expect(html).toContain('markdown-alert-important');
    expect(html).toContain('<li>item1</li>');
  });

  it('keeps hard-wrapped body lines in one paragraph with <br> (breaks mode) (T-GA-13)', async () => {
    const html = await render('> [!NOTE]\n> line1\n> line2');
    expect(html).toMatch(/line1<br\s*\/?>\s*line2/);
  });

  it('renders inline markdown (bold) inside the alert body — issue #488 example (T-GA-14)', async () => {
    const html = await render(
      '> [!IMPORTANT]\n> - 設定に行き詰まった場合は、一度初期化してください。\n> - **設定ファイルは Shift-JIS / CRLF で保存してください。**'
    );
    expect(html).toContain('markdown-alert-important');
    expect(html).toContain('<strong>設定ファイルは Shift-JIS / CRLF で保存してください。</strong>');
  });

  it('renders a nested plain blockquote inside an alert body (T-GA-15)', async () => {
    const html = await render('> [!NOTE]\n> > inner quote');
    expect(html).toContain('markdown-alert-note');
    expect(html).toContain('<blockquote>');
  });

  it('alert markup (including the octicon SVG) survives sanitizeUserHtml (T-GA-16)', async () => {
    const html = await render('> [!WARNING]\n> body');
    const sanitized = sanitizeUserHtml(html);
    expect(sanitized).toContain('markdown-alert-warning');
    expect(sanitized).toContain('<svg');
    expect(sanitized).toContain('viewBox="0 0 16 16"');
    expect(sanitized).toContain('<path d=');
    expect(sanitized).toContain('Warning</p>');
  });

  it('strips XSS payloads inside an alert body without breaking the alert (T-GA-17)', async () => {
    const html = await render('> [!NOTE]\n> <img src=x onerror=alert(1)> body');
    const sanitized = sanitizeUserHtml(html);
    expect(sanitized).toContain('markdown-alert-note');
    expect(sanitized).not.toContain('onerror');
  });

  it('leaves ordinary blockquotes untouched (T-GA-18)', async () => {
    const html = await render('> just a quote');
    expect(html).toContain('<blockquote>');
    expect(html).not.toContain('markdown-alert');
  });

  it('renders an alert marker inside a fenced code block as code (T-GA-19)', async () => {
    const html = await render('```\n> [!NOTE]\n> body\n```');
    expect(html).not.toContain('markdown-alert');
  });

  it('accepts extra spaces between > and the marker (T-GA-20)', async () => {
    const html = await render('>   [!NOTE]\n> body');
    expect(html).toContain('markdown-alert-note');
  });

  it('accepts a leading blank quote line before the marker (T-GA-21)', async () => {
    const html = await render('>\n> [!NOTE]\n> body');
    expect(html).toContain('markdown-alert-note');
  });

  it('leaves a 4-space-indented marker (code block in quote) as a plain blockquote (T-GA-22)', async () => {
    const html = await render('>     [!NOTE]\n> body');
    expect(html).not.toContain('markdown-alert');
  });

  // Regression: marked's Lexer.lex() appends into a per-instance token array
  // and returns that same array, so a lexer shared across alerts made EVERY
  // alert render the accumulated bodies of all alerts in the document.
  it('keeps each alert body separate in a multi-alert document (T-GA-23)', async () => {
    const html = await render(
      '> [!NOTE]\n> note-body\n\n> [!TIP]\n> tip-body\n\n> [!WARNING]\n> warning-body'
    );
    const note = /markdown-alert-note">([\s\S]*?)<\/div>/.exec(html)?.[1] ?? '';
    const tip = /markdown-alert-tip">([\s\S]*?)<\/div>/.exec(html)?.[1] ?? '';
    const warning = /markdown-alert-warning">([\s\S]*?)<\/div>/.exec(html)?.[1] ?? '';
    expect(note).toContain('note-body');
    expect(note).not.toContain('tip-body');
    expect(note).not.toContain('warning-body');
    expect(tip).toContain('tip-body');
    expect(tip).not.toContain('note-body');
    expect(tip).not.toContain('warning-body');
    expect(warning).toContain('warning-body');
    expect(warning).not.toContain('note-body');
    expect(warning).not.toContain('tip-body');
  });
});
