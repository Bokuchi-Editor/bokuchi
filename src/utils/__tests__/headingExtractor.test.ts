import { describe, it, expect } from 'vitest';
import { extractHeadings } from '../headingExtractor';

describe('extractHeadings', () => {
  // T-HE-01
  it('extracts h1 through h6', () => {
    const content = [
      '# H1',
      '## H2',
      '### H3',
      '#### H4',
      '##### H5',
      '###### H6',
    ].join('\n');

    const result = extractHeadings(content);
    expect(result).toHaveLength(6);
    expect(result.map(h => h.level)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(result.map(h => h.text)).toEqual(['H1', 'H2', 'H3', 'H4', 'H5', 'H6']);
  });

  // T-HE-02
  it('returns correct line numbers (1-based)', () => {
    const content = [
      'Some text',
      '# First Heading',
      '',
      '## Second Heading',
    ].join('\n');

    const result = extractHeadings(content);
    expect(result).toHaveLength(2);
    expect(result[0].lineNumber).toBe(2);
    expect(result[1].lineNumber).toBe(4);
  });

  // T-HE-03
  it('skips headings inside fenced code blocks (backticks)', () => {
    const content = [
      '# Real Heading',
      '```',
      '# Code Heading',
      '```',
      '## Another Real Heading',
    ].join('\n');

    const result = extractHeadings(content);
    expect(result).toHaveLength(2);
    expect(result[0].text).toBe('Real Heading');
    expect(result[1].text).toBe('Another Real Heading');
  });

  // T-HE-04
  it('skips headings inside tilde code blocks', () => {
    const content = [
      '# Real',
      '~~~',
      '# Inside Tilde Block',
      '~~~',
      '## Also Real',
    ].join('\n');

    const result = extractHeadings(content);
    expect(result).toHaveLength(2);
    expect(result[0].text).toBe('Real');
    expect(result[1].text).toBe('Also Real');
  });

  // T-HE-05
  it('handles empty content', () => {
    expect(extractHeadings('')).toEqual([]);
  });

  // T-HE-06
  it('strips trailing hash marks', () => {
    const content = '## Title ##';
    const result = extractHeadings(content);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('Title');
  });

  // T-HE-07
  it('handles mixed heading levels in order', () => {
    const content = [
      '# H1',
      '### H3',
      '## H2',
    ].join('\n');

    const result = extractHeadings(content);
    expect(result).toHaveLength(3);
    expect(result.map(h => h.level)).toEqual([1, 3, 2]);
  });

  // T-HE-08a: Regression test for Windows CRLF line endings (Issue #225)
  it('extracts headings from content with CRLF line endings', () => {
    const content = '# H1\r\n## H2\r\n### H3';
    const result = extractHeadings(content);
    expect(result).toHaveLength(3);
    expect(result.map(h => h.level)).toEqual([1, 2, 3]);
    expect(result.map(h => h.text)).toEqual(['H1', 'H2', 'H3']);
  });

  // T-HE-08b: Regression test for CRLF line numbers (Issue #225)
  it('returns correct line numbers with CRLF line endings', () => {
    const content = 'Some text\r\n# First Heading\r\n\r\n## Second Heading';
    const result = extractHeadings(content);
    expect(result).toHaveLength(2);
    expect(result[0].lineNumber).toBe(2);
    expect(result[1].lineNumber).toBe(4);
  });

  // T-HE-08c: Regression test for CRLF with code blocks (Issue #225)
  it('skips headings inside code blocks with CRLF line endings', () => {
    const content = '# Real\r\n```\r\n# Fake\r\n```\r\n## Also Real';
    const result = extractHeadings(content);
    expect(result).toHaveLength(2);
    expect(result[0].text).toBe('Real');
    expect(result[1].text).toBe('Also Real');
  });

  // T-HE-09: mixed code block markers (backtick open, tilde close)
  it('T-HE-09: treats backtick and tilde as independent toggles', () => {
    const content = [
      '# Before',
      '```',
      '# Inside backtick block',
      '~~~',        // This toggles code block off (independent marker)
      '# After tilde close',
    ].join('\n');

    const result = extractHeadings(content);
    // The implementation toggles on ``` (line 2), then toggles on ~~~ (line 4)
    // So line 5 is outside code block
    expect(result).toHaveLength(2);
    expect(result[0].text).toBe('Before');
    expect(result[1].text).toBe('After tilde close');
  });

  // T-HE-10: headings with leading whitespace (indented headings)
  it('T-HE-10: extracts headings with leading whitespace', () => {
    const content = [
      '  # Indented heading',
      '# Normal heading',
    ].join('\n');

    const result = extractHeadings(content);
    // trimStart() is called before matching, so indented headings are extracted
    expect(result).toHaveLength(2);
    expect(result[0].text).toBe('Indented heading');
    expect(result[1].text).toBe('Normal heading');
  });

  // T-HE-08
  it('ignores lines that are not headings', () => {
    const content = [
      'Regular text',
      '- list item',
      '> blockquote',
      '**bold text**',
      '# Actual Heading',
    ].join('\n');

    const result = extractHeadings(content);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('Actual Heading');
  });
});
