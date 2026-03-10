import { describe, it, expect } from 'vitest';
import {
  htmlTableToMarkdown,
  detectHtmlTable,
  validateMarkdownTable,
  convertTsvCsvToMarkdown,
} from '../tableConverter';

describe('htmlTableToMarkdown', () => {
  // T-TC-01
  it('converts a simple 2x2 table', () => {
    const html = `
      <table>
        <tr><th>Name</th><th>Age</th></tr>
        <tr><td>Alice</td><td>30</td></tr>
      </table>
    `;
    const result = htmlTableToMarkdown(html);
    const lines = result.split('\n');
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe('| Name | Age |');
    expect(lines[1]).toContain('---');
    expect(lines[2]).toBe('| Alice | 30 |');
  });

  // T-TC-02
  it('converts multi-row table', () => {
    const html = `
      <table>
        <tr><th>A</th><th>B</th></tr>
        <tr><td>1</td><td>2</td></tr>
        <tr><td>3</td><td>4</td></tr>
        <tr><td>5</td><td>6</td></tr>
      </table>
    `;
    const result = htmlTableToMarkdown(html);
    const lines = result.split('\n');
    expect(lines).toHaveLength(5); // header + separator + 3 data rows
  });

  // T-TC-03
  it('escapes pipe characters in cells', () => {
    const html = `
      <table>
        <tr><th>Header</th></tr>
        <tr><td>a|b</td></tr>
      </table>
    `;
    const result = htmlTableToMarkdown(html);
    expect(result).toContain('a\\|b');
  });

  // T-TC-04
  it('handles empty cells', () => {
    const html = `
      <table>
        <tr><th>A</th><th>B</th></tr>
        <tr><td></td><td>value</td></tr>
      </table>
    `;
    const result = htmlTableToMarkdown(html);
    const lines = result.split('\n');
    // Empty cell becomes a single space
    expect(lines[2]).toBe('|   | value |');
  });

  // T-TC-05
  it('throws when no table in HTML', () => {
    expect(() => htmlTableToMarkdown('<div>no table</div>')).toThrow('No table found in HTML');
  });

  it('throws when table has no rows', () => {
    expect(() => htmlTableToMarkdown('<table></table>')).toThrow('No rows found in table');
  });

  it('skips rows with no cells', () => {
    const html = `
      <table>
        <tr><th>A</th></tr>
        <tr></tr>
        <tr><td>1</td></tr>
      </table>
    `;
    const result = htmlTableToMarkdown(html);
    const lines = result.split('\n');
    expect(lines).toHaveLength(3);
  });

  // T-TC-06
  it('handles cells with whitespace and newlines', () => {
    const html = `
      <table>
        <tr><th>Header</th></tr>
        <tr><td>line1\nline2   extra</td></tr>
      </table>
    `;
    const result = htmlTableToMarkdown(html);
    // Newlines and multiple spaces should be collapsed
    expect(result).not.toContain('\nline2');
  });
});

describe('detectHtmlTable', () => {
  function mockDataTransfer(htmlData: string | null): DataTransfer {
    return { getData: (type: string) => (type === 'text/html' ? htmlData ?? '' : '') } as unknown as DataTransfer;
  }

  // T-TC-DH-01
  it('returns HTML when clipboard contains a table', () => {
    const html = '<table><tr><td>A</td></tr></table>';
    expect(detectHtmlTable(mockDataTransfer(html))).toBe(html);
  });

  // T-TC-DH-02
  it('returns null when clipboard has no text/html', () => {
    expect(detectHtmlTable(mockDataTransfer(''))).toBeNull();
  });

  // T-TC-DH-03
  it('returns null when HTML does not contain table tags', () => {
    expect(detectHtmlTable(mockDataTransfer('<div>no table</div>'))).toBeNull();
  });

  // T-TC-DH-04
  it('returns null when only opening table tag is present', () => {
    expect(detectHtmlTable(mockDataTransfer('<table><tr><td>A</td></tr>'))).toBeNull();
  });

  // T-TC-DH-05
  it('returns null when getData throws', () => {
    const broken = { getData: () => { throw new Error('denied'); } } as unknown as DataTransfer;
    expect(detectHtmlTable(broken)).toBeNull();
  });
});

describe('validateMarkdownTable', () => {
  // T-TC-07
  it('returns true for valid table', () => {
    const table = '| A | B |\n| --- | --- |\n| 1 | 2 |';
    expect(validateMarkdownTable(table)).toBe(true);
  });

  // T-TC-08
  it('returns false for too few lines', () => {
    expect(validateMarkdownTable('| A | B |')).toBe(false);
  });

  // T-TC-09
  it('returns false for missing pipes', () => {
    const table = 'A B\n| --- | --- |\n| 1 | 2 |';
    expect(validateMarkdownTable(table)).toBe(false);
  });

  // T-TC-10
  it('returns false for missing separator', () => {
    const table = '| A | B |\n| no dashes |\n| 1 | 2 |';
    expect(validateMarkdownTable(table)).toBe(false);
  });
});

describe('convertTsvCsvToMarkdown', () => {
  // T-TC-11
  it('converts TSV input', () => {
    const tsv = 'Name\tAge\nAlice\t30\nBob\t25';
    const result = convertTsvCsvToMarkdown(tsv);
    const lines = result.split('\n');
    expect(lines).toHaveLength(4); // header + separator + 2 data rows
    expect(lines[0]).toBe('| Name | Age |');
    expect(lines[1]).toContain('---');
    expect(lines[2]).toBe('| Alice | 30 |');
  });

  // T-TC-12
  it('converts CSV input', () => {
    const csv = 'Name,Age\nAlice,30';
    const result = convertTsvCsvToMarkdown(csv);
    const lines = result.split('\n');
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe('| Name | Age |');
  });

  // T-TC-13
  it('escapes pipe in cell content', () => {
    const tsv = 'A\tB\na|b\tc';
    const result = convertTsvCsvToMarkdown(tsv);
    expect(result).toContain('a\\|b');
  });

  // T-TC-14
  it('skips empty lines', () => {
    const tsv = 'A\tB\n\n1\t2\n\n3\t4';
    const result = convertTsvCsvToMarkdown(tsv);
    const lines = result.split('\n');
    // header + separator + 2 data rows (empty lines skipped)
    expect(lines).toHaveLength(4);
  });

  // T-TC-15
  it('throws when no delimiter found', () => {
    expect(() => convertTsvCsvToMarkdown('single column')).toThrow('No delimiter found');
  });
});
