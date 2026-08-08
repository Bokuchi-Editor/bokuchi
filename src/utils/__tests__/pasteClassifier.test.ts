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

  it('falls back to plain-text table conversion when HTML table conversion fails', () => {
    const brokenHtml = '<table></table>';
    const result = classifyPaste(brokenHtml, 'a,b\n1,2');
    expect(result).toEqual({
      kind: 'table',
      markdownTable: '| a | b |\n| --- | --- |\n| 1 | 2 |',
    });
  });

  it('preserves quoted CSV fields with embedded commas', () => {
    const result = classifyPaste('', '"a,b",c\nx,y');
    expect(result).toEqual({
      kind: 'table',
      markdownTable: '| a,b | c |\n| --- | --- |\n| x | y |',
    });
  });

  it('falls back to plain for ragged CSV rows', () => {
    expect(classifyPaste('', 'a,b,c\nx,y')).toEqual({ kind: 'plain' });
  });
});
