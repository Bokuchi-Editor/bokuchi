import { describe, it, expect } from 'vitest';
import {
  buildWrapEdit,
  buildLinePrefixEdits,
  buildBlockInsertEdit,
  buildHeadingEdit,
} from '../markdownToolbarActions';

describe('markdownToolbarActions', () => {
  describe('buildWrapEdit', () => {
    const selection = {
      startLineNumber: 1,
      startColumn: 1,
      endLineNumber: 1,
      endColumn: 5,
    };

    // T-MTA-01: wraps selected text
    it('T-MTA-01: wraps selected text with before/after', () => {
      const { edit, newSelection } = buildWrapEdit(selection, 'text', '**', '**', 'bold');
      expect(edit.text).toBe('**text**');
      expect(newSelection).toBeNull();
    });

    // T-MTA-02: uses placeholder when no selection
    it('T-MTA-02: uses placeholder when selectedText is empty', () => {
      const { edit, newSelection } = buildWrapEdit(selection, '', '**', '**', 'bold text');
      expect(edit.text).toBe('**bold text**');
      expect(newSelection).not.toBeNull();
      expect(newSelection!.startColumn).toBe(3); // 1 + '**'.length
      expect(newSelection!.endColumn).toBe(12); // 3 + 'bold text'.length
    });

    // T-MTA-03: no placeholder and no selection
    it('T-MTA-03: handles empty selectedText and empty placeholder', () => {
      const { edit, newSelection } = buildWrapEdit(selection, '', '[', '](url)', '');
      expect(edit.text).toBe('[](url)');
      expect(newSelection).toBeNull();
    });
  });

  describe('buildLinePrefixEdits', () => {
    const getLineContent = (line: number) => {
      const lines: Record<number, string> = { 1: 'First line', 2: 'Second line', 3: 'Third line' };
      return lines[line] || '';
    };

    // T-MTA-04: prefixes single line
    it('T-MTA-04: prepends prefix to a single line', () => {
      const edits = buildLinePrefixEdits(1, 1, getLineContent, '- ');
      expect(edits).toHaveLength(1);
      expect(edits[0].text).toBe('- First line');
    });

    // T-MTA-05: prefixes multiple lines
    it('T-MTA-05: prepends prefix to multiple lines', () => {
      const edits = buildLinePrefixEdits(1, 3, getLineContent, '> ');
      expect(edits).toHaveLength(3);
      expect(edits[0].text).toBe('> First line');
      expect(edits[1].text).toBe('> Second line');
      expect(edits[2].text).toBe('> Third line');
    });
  });

  describe('buildBlockInsertEdit', () => {
    // T-MTA-06: inserts on empty line without newline before
    it('T-MTA-06: does not prepend newline when current line is empty', () => {
      const edit = buildBlockInsertEdit(1, '', '---');
      expect(edit.text).toBe('---\n');
    });

    // T-MTA-07: inserts with newline before on non-empty line
    it('T-MTA-07: prepends newline when current line has content', () => {
      const edit = buildBlockInsertEdit(1, 'some text', '---');
      expect(edit.text).toBe('\n---\n');
    });
  });

  describe('buildHeadingEdit', () => {
    // T-MTA-08: applies heading level 1
    it('T-MTA-08: applies H1 to plain text', () => {
      const edit = buildHeadingEdit(1, 'Title', 1);
      expect(edit.text).toBe('# Title');
    });

    // T-MTA-09: applies heading level 3
    it('T-MTA-09: applies H3 to plain text', () => {
      const edit = buildHeadingEdit(1, 'Section', 3);
      expect(edit.text).toBe('### Section');
    });

    // T-MTA-10: replaces existing heading
    it('T-MTA-10: replaces existing heading prefix', () => {
      const edit = buildHeadingEdit(1, '## Old Heading', 1);
      expect(edit.text).toBe('# Old Heading');
    });

    // T-MTA-11: handles line with multiple # in content
    it('T-MTA-11: only removes leading heading syntax', () => {
      const edit = buildHeadingEdit(1, '### Title with # inside', 2);
      expect(edit.text).toBe('## Title with # inside');
    });
  });
});
