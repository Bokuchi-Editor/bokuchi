/**
 * Utility for converting HTML tables to Markdown tables
 */

/**
 * Convert HTML table to Markdown table
 * @param html HTML table string
 * @returns Markdown table string
 */
export function htmlTableToMarkdown(html: string): string {

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const table = doc.querySelector('table');


    if (!table) {
      throw new Error('No table found in HTML');
    }

    const rows = Array.from(table.querySelectorAll('tr'));

    if (rows.length === 0) {
      throw new Error('No rows found in table');
    }

    const markdownRows: string[] = [];

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const cells = Array.from(row.querySelectorAll('td, th'));


      if (cells.length === 0) {
        continue; // Skip empty rows
      }

      const cellContents = cells.map((cell) => {
        // Get cell content (strip HTML tags)
        let content = cell.textContent || '';


        // Convert newlines to spaces
        content = content.replace(/\n/g, ' ');

        // Collapse multiple spaces to single space
        content = content.replace(/\s+/g, ' ');

        // Trim whitespace
        content = content.trim();

        // Escape pipe characters
        content = content.replace(/\|/g, '\\|');

        // Empty cells become a single space
        return content || ' ';
      });

      // Create Markdown row
      const markdownRow = '| ' + cellContents.join(' | ') + ' |';
      markdownRows.push(markdownRow);

      // Add header separator row after the first row
      if (i === 0) {
        const separator = '|' + cellContents.map(() => ' --- ').join('|') + '|';
        markdownRows.push(separator);
      }
    }

    const result = markdownRows.join('\n');

    return result;
  } catch (error) {
    console.error('Failed to convert HTML table to Markdown:', error);
    throw error;
  }
}

/**
 * Detect HTML table from clipboard data
 * @param clipboardData Clipboard data
 * @returns HTML table string or null
 */
export function detectHtmlTable(clipboardData: DataTransfer): string | null {
  try {
    // Get HTML data
    const htmlData = clipboardData.getData('text/html');
    if (!htmlData) {
      return null;
    }

    // Check if table tags are present
    if (!htmlData.includes('<table') || !htmlData.includes('</table>')) {
      return null;
    }

    return htmlData;
  } catch (error) {
    console.error('Failed to detect HTML table:', error);
    return null;
  }
}

/**
 * Validate table conversion result
 * @param markdown Markdown table string
 * @returns Whether it is a valid Markdown table
 */
export function validateMarkdownTable(markdown: string): boolean {
  try {
    const lines = markdown.split('\n');
    if (lines.length < 2) {
      return false;
    }

    // Check if the first row is a header row
    const headerLine = lines[0];
    if (!headerLine.startsWith('|') || !headerLine.endsWith('|')) {
      return false;
    }

    // Check if the second row is a separator row
    const separatorLine = lines[1];
    if (!separatorLine.includes('---')) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to validate Markdown table:', error);
    return false;
  }
}

/**
 * Convert TSV/CSV text to Markdown table
 * @param text TSV/CSV text
 * @returns Markdown table string
 */
export function convertTsvCsvToMarkdown(text: string): string {

  try {
    const lines = text.trim().split('\n');

    if (lines.length === 0) {
      throw new Error('No lines found');
    }

    // Determine delimiter (tab or comma)
    const firstLine = lines[0];
    const hasTabs = firstLine.includes('\t');
    const hasCommas = firstLine.includes(',');

    let delimiter = '\t';
    if (hasTabs) {
      delimiter = '\t';
    } else if (hasCommas) {
      delimiter = ',';
    } else {
      throw new Error('No delimiter found (tab or comma)');
    }

    const markdownRows: string[] = [];

    // Process each row
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // Skip empty lines

      // Split by delimiter
      const cells = line.split(delimiter);

      if (cells.length === 0) continue;

      // Process cell contents
      const cellContents = cells.map((cell) => {
        let content = cell.trim();


        // Escape pipe characters
        content = content.replace(/\|/g, '\\|');

        // Empty cells become a single space
        return content || ' ';
      });

      // Create Markdown row
      const markdownRow = '| ' + cellContents.join(' | ') + ' |';
      markdownRows.push(markdownRow);

      // Add header separator row after the first row
      if (i === 0) {
        const separator = '|' + cellContents.map(() => ' --- ').join('|') + '|';
        markdownRows.push(separator);
      }
    }

    const result = markdownRows.join('\n');

    return result;
  } catch (error) {
    console.error('Failed to convert TSV/CSV to Markdown:', error);
    throw error;
  }
}
