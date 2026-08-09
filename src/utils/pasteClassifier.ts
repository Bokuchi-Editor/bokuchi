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
  if (!htmlData || !htmlData.includes('<table') || !htmlData.includes('</table>')) {
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
  if (!plainText || (!plainText.includes('\t') && !plainText.includes(','))) {
    return null;
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
