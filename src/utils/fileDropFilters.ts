/**
 * Whether a dropped/opened path is a document Bokuchi can open directly
 * (Markdown or plain text). Image drops are handled separately by the editor.
 */
export function isSupportedDocumentFile(path: string): boolean {
  const lower = path.toLowerCase();
  return lower.endsWith('.md') || lower.endsWith('.markdown') || lower.endsWith('.txt');
}
