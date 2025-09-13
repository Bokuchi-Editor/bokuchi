/**
 * HTMLテーブルをMarkdownテーブルに変換するユーティリティ
 */

/**
 * HTMLテーブルをMarkdownテーブルに変換
 * @param html HTMLテーブル文字列
 * @returns Markdownテーブル文字列
 */
export function htmlTableToMarkdown(html: string): string {
  console.log('htmlTableToMarkdown called with HTML:', html.substring(0, 200) + '...');

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const table = doc.querySelector('table');

    console.log('Table element found:', !!table);

    if (!table) {
      throw new Error('No table found in HTML');
    }

    const rows = Array.from(table.querySelectorAll('tr'));
    console.log('Number of rows found:', rows.length);

    if (rows.length === 0) {
      throw new Error('No rows found in table');
    }

    const markdownRows: string[] = [];

    // 各行を処理
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const cells = Array.from(row.querySelectorAll('td, th'));

      console.log(`Row ${i}: ${cells.length} cells`);

      if (cells.length === 0) {
        continue; // 空の行はスキップ
      }

      const cellContents = cells.map((cell, cellIndex) => {
        // セルの内容を取得（HTMLタグを除去）
        let content = cell.textContent || '';

        console.log(`Cell ${cellIndex}: "${content}"`);

        // 改行をスペースに変換
        content = content.replace(/\n/g, ' ');

        // 複数のスペースを単一スペースに変換
        content = content.replace(/\s+/g, ' ');

        // 前後の空白を削除
        content = content.trim();

        // パイプ文字をエスケープ
        content = content.replace(/\|/g, '\\|');

        // 空のセルはスペース1つに
        return content || ' ';
      });

      // Markdown行を作成
      const markdownRow = '| ' + cellContents.join(' | ') + ' |';
      markdownRows.push(markdownRow);

      // 最初の行の後にヘッダー区切り行を追加
      if (i === 0) {
        const separator = '|' + cellContents.map(() => ' --- ').join('|') + '|';
        markdownRows.push(separator);
      }
    }

    const result = markdownRows.join('\n');
    console.log('Final markdown result:', result);

    return result;
  } catch (error) {
    console.error('Failed to convert HTML table to Markdown:', error);
    throw error;
  }
}

/**
 * クリップボードデータからHTMLテーブルを検出
 * @param clipboardData クリップボードデータ
 * @returns HTMLテーブル文字列またはnull
 */
export function detectHtmlTable(clipboardData: DataTransfer): string | null {
  try {
    // HTMLデータを取得
    const htmlData = clipboardData.getData('text/html');
    if (!htmlData) {
      return null;
    }

    // テーブルタグが含まれているかチェック
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
 * テーブル変換の結果を検証
 * @param markdown Markdownテーブル文字列
 * @returns 有効なMarkdownテーブルかどうか
 */
export function validateMarkdownTable(markdown: string): boolean {
  try {
    const lines = markdown.split('\n');
    if (lines.length < 2) {
      return false;
    }

    // 最初の行がヘッダー行かチェック
    const headerLine = lines[0];
    if (!headerLine.startsWith('|') || !headerLine.endsWith('|')) {
      return false;
    }

    // 2行目が区切り行かチェック
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
 * TSV/CSVテキストをMarkdownテーブルに変換
 * @param text TSV/CSVテキスト
 * @returns Markdownテーブル文字列
 */
export function convertTsvCsvToMarkdown(text: string): string {
  console.log('convertTsvCsvToMarkdown called with text:', text.substring(0, 200) + '...');

  try {
    const lines = text.trim().split('\n');
    console.log('Number of lines:', lines.length);

    if (lines.length === 0) {
      throw new Error('No lines found');
    }

    // 区切り文字を判定（タブまたはカンマ）
    const firstLine = lines[0];
    const hasTabs = firstLine.includes('\t');
    const hasCommas = firstLine.includes(',');

    let delimiter = '\t';
    if (hasTabs) {
      delimiter = '\t';
      console.log('Using tab delimiter');
    } else if (hasCommas) {
      delimiter = ',';
      console.log('Using comma delimiter');
    } else {
      throw new Error('No delimiter found (tab or comma)');
    }

    const markdownRows: string[] = [];

    // 各行を処理
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // 空行をスキップ

      // 区切り文字で分割
      const cells = line.split(delimiter);
      console.log(`Row ${i}: ${cells.length} cells`);

      if (cells.length === 0) continue;

      // セルの内容を処理
      const cellContents = cells.map((cell, cellIndex) => {
        let content = cell.trim();

        console.log(`Cell ${cellIndex}: "${content}"`);

        // パイプ文字をエスケープ
        content = content.replace(/\|/g, '\\|');

        // 空のセルはスペース1つに
        return content || ' ';
      });

      // Markdown行を作成
      const markdownRow = '| ' + cellContents.join(' | ') + ' |';
      markdownRows.push(markdownRow);

      // 最初の行の後にヘッダー区切り行を追加
      if (i === 0) {
        const separator = '|' + cellContents.map(() => ' --- ').join('|') + '|';
        markdownRows.push(separator);
      }
    }

    const result = markdownRows.join('\n');
    console.log('Final TSV/CSV markdown result:', result);

    return result;
  } catch (error) {
    console.error('Failed to convert TSV/CSV to Markdown:', error);
    throw error;
  }
}
