import { describe, it, expect } from 'vitest';
import { classifyPaste } from '../pasteClassifier';

describe('classifyPaste', () => {
  it('classifies plain text with no delimiters as plain', () => {
    expect(classifyPaste('', 'hello world')).toEqual({ kind: 'plain' });
  });

  it('converts an HTML table to a Markdown table', () => {
    const html = '<table><tr><td>a</td><td>b</td></tr><tr><td>1</td><td>2</td></tr></table>';
    const result = classifyPaste(html, 'a b');
    expect(result.kind).toBe('table');
    if (result.kind === 'table') {
      expect(result.markdownTable).toContain('|');
    }
  });

  it('converts TSV plain text to a Markdown table', () => {
    const tsv = 'a\tb\n1\t2';
    const result = classifyPaste('', tsv);
    expect(result.kind).toBe('table');
    if (result.kind === 'table') {
      expect(result.markdownTable).toContain('|');
    }
  });

  it('falls back to plain for HTML without a table element', () => {
    expect(classifyPaste('<p>hello</p>', 'hello')).toEqual({ kind: 'plain' });
  });

  it('prefers HTML table conversion over TSV when both are present', () => {
    const html = '<table><tr><td>x</td><td>y</td></tr><tr><td>1</td><td>2</td></tr></table>';
    const result = classifyPaste(html, 'ignored\ttext');
    expect(result.kind).toBe('table');
  });
});
