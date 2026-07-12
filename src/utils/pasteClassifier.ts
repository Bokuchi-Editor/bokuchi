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
  let markdownTable: string;

  if (htmlData && htmlData.includes('<table') && htmlData.includes('</table>')) {
    markdownTable = htmlTableToMarkdown(htmlData);
  } else if (plainText && (plainText.includes('\t') || plainText.includes(','))) {
    markdownTable = convertTsvCsvToMarkdown(plainText);
  } else {
    return { kind: 'plain' };
  }

  if (!validateMarkdownTable(markdownTable)) {
    return { kind: 'plain' };
  }

  return { kind: 'table', markdownTable };
}
