export interface HeadingItem {
  level: number;       // 1-6
  text: string;        // Heading text (Markdown syntax removed)
  lineNumber: number;  // 1-based line number
}

export type OutlineDisplayMode = 'persistent' | 'overlay';
