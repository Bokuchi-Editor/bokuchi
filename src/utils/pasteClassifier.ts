import { htmlTableToMarkdown, validateMarkdownTable, convertTsvCsvToMarkdown } from './tableConverter';

/**
 * How a pasted payload should be inserted: either as a converted Markdown table
 * or verbatim as plain text.
 */
export type PasteClassification =
  | { kind: 'table'; markdownTable: string }
  | { kind: 'plain' };

/**
 * Classify clipboard content for paste. An HTML `<table>` is converted first;
 * otherwise TSV/CSV plain text (containing tabs or commas) is tried. If the
 * conversion does not yield a valid Markdown table, the paste is plain text.
 */
export function classifyPaste(htmlData: string, plainText: string): PasteClassification {
  const htmlTable = tryConvertHtmlTable(htmlData);
  if (htmlTable) {
    return { kind: 'table', markdownTable: htmlTable };
  }

  const delimitedTable = tryConvertDelimitedText(plainText);
  if (delimitedTable) {
    return { kind: 'table', markdownTable: delimitedTable };
  }

  return { kind: 'plain' };
}

function tryConvertHtmlTable(htmlData: string): string | null {
  // Tag names are case-insensitive; older apps put uppercase <TABLE> on the
  // clipboard. Matches detectHtmlTable in tableConverter.ts.
  const lower = htmlData.toLowerCase();
  if (!htmlData || !lower.includes('<table') || !lower.includes('</table>')) {
    return null;
  }

  let markdownTable: string;
  try {
    markdownTable = htmlTableToMarkdown(htmlData);
  } catch {
    return null;
  }

  if (!validateMarkdownTable(markdownTable)) {
    return null;
  }

  return markdownTable;
}

function tryConvertDelimitedText(plainText: string): string | null {
  const hasTab = plainText.includes('\t');
  if (!plainText || (!hasTab && !plainText.includes(','))) {
    return null;
  }

  // A single comma-bearing line is far more likely to be prose ("hello,
  // world") than a CSV table, and under tableConversion:'auto' converting it
  // produced a bodyless two-row table out of ordinary text. Require a second
  // line before treating comma-only text as CSV. Tab-separated text keeps
  // single-line conversion — tabs don't occur in prose pastes, and a single
  // Excel row is a legitimate table source.
  if (!hasTab) {
    const nonEmptyLines = plainText.split(/\r?\n/).filter((l) => l.trim() !== '');
    if (nonEmptyLines.length < 2) {
      return null;
    }
  }

  let markdownTable: string;
  try {
    markdownTable = convertTsvCsvToMarkdown(plainText);
  } catch (error) {
    console.error('Failed to convert TSV/CSV to Markdown:', error);
    return null;
  }

  if (!validateMarkdownTable(markdownTable)) {
    return null;
  }

  return markdownTable;
}
