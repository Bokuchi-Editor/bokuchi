import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import SearchReplacePanel from '../SearchReplacePanel';

// ---------------------------------------------------------------------------
// Mock Monaco editor
// ---------------------------------------------------------------------------

function getOffset(content: string, lineNumber: number, column: number): number {
  const lines = content.split('\n');
  let offset = 0;
  for (let i = 0; i < lineNumber - 1; i++) {
    offset += lines[i].length + 1;
  }
  return offset + column - 1;
}

function createMockEditor(content: string) {
  let currentContent = content;
  const listeners: Record<string, Function[]> = {};

  const model = {
    getValue: () => currentContent,
    getPositionAt: (offset: number) => {
      const lines = currentContent.substring(0, offset).split('\n');
      return {
        lineNumber: lines.length,
        column: lines[lines.length - 1].length + 1,
      };
    },
    getLineContent: (lineNumber: number) => currentContent.split('\n')[lineNumber - 1] || '',
  };

  return {
    getModel: () => model,
    getValue: () => currentContent,
    getPosition: () => ({ lineNumber: 1, column: 1 }),
    deltaDecorations: vi.fn().mockReturnValue([]),
    revealLineInCenter: vi.fn(),
    setSelection: vi.fn(),
    executeEdits: vi.fn().mockImplementation((_source: string, edits: any[]) => {
      // Apply edits in reverse to preserve offsets
      const sortedEdits = [...edits].sort((a, b) => {
        const aOffset =
          currentContent.split('\n').slice(0, a.range.startLineNumber - 1).join('\n').length +
          a.range.startColumn;
        const bOffset =
          currentContent.split('\n').slice(0, b.range.startLineNumber - 1).join('\n').length +
          b.range.startColumn;
        return bOffset - aOffset;
      });
      for (const edit of sortedEdits) {
        const startOffset = getOffset(currentContent, edit.range.startLineNumber, edit.range.startColumn);
        const endOffset = getOffset(currentContent, edit.range.endLineNumber, edit.range.endColumn);
        currentContent =
          currentContent.substring(0, startOffset) + edit.text + currentContent.substring(endOffset);
      }
      model.getValue = () => currentContent;
    }),
    onDidChangeModelContent: vi.fn().mockReturnValue({ dispose: vi.fn() }),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SearchReplacePanel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // T-SR-01: finds matches for basic search term
  it('T-SR-01: finds matches for a basic search term', () => {
    const editor = createMockEditor('hello world\nhello again\ngoodbye');
    const editorRef = { current: editor } as any;
    const onClose = vi.fn();
    const onChange = vi.fn();

    render(<SearchReplacePanel editorRef={editorRef} open={true} onClose={onClose} onChange={onChange} />);

    const searchInput = screen.getByPlaceholderText('Search');
    fireEvent.change(searchInput, { target: { value: 'hello' } });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(screen.getByText('1 of 2')).toBeInTheDocument();
  });

  // T-SR-02: case-sensitive search distinguishes case
  it('T-SR-02: case-sensitive search distinguishes case', () => {
    const editor = createMockEditor('Hello world\nhello again\nHELLO there');
    const editorRef = { current: editor } as any;
    const onClose = vi.fn();
    const onChange = vi.fn();

    render(<SearchReplacePanel editorRef={editorRef} open={true} onClose={onClose} onChange={onChange} />);

    const searchInput = screen.getByPlaceholderText('Search');
    fireEvent.change(searchInput, { target: { value: 'Hello' } });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Case-insensitive by default: all 3 should match
    expect(screen.getByText('1 of 3')).toBeInTheDocument();

    // Enable case-sensitive mode by clicking the "Aa" button
    const caseSensitiveButton = screen.getByText('Aa');
    fireEvent.click(caseSensitiveButton);

    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Only "Hello" (exact case) should match
    expect(screen.getByText('1 of 1')).toBeInTheDocument();
  });

  // T-SR-03: regex search works
  it('T-SR-03: regex search works', () => {
    const editor = createMockEditor('cat 123\ndog 456\ncat 789');
    const editorRef = { current: editor } as any;
    const onClose = vi.fn();
    const onChange = vi.fn();

    render(<SearchReplacePanel editorRef={editorRef} open={true} onClose={onClose} onChange={onChange} />);

    // Enable regex mode by clicking the ".*" button
    const regexButton = screen.getByText('.*');
    fireEvent.click(regexButton);

    const searchInput = screen.getByPlaceholderText('Search');
    fireEvent.change(searchInput, { target: { value: '\\d+' } });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Should find 3 digit sequences: 123, 456, 789
    expect(screen.getByText('1 of 3')).toBeInTheDocument();
  });

  // T-SR-04: replace all replaces all occurrences
  it('T-SR-04: replace all replaces all occurrences', () => {
    const editor = createMockEditor('foo bar foo baz foo');
    const editorRef = { current: editor } as any;
    const onClose = vi.fn();
    const onChange = vi.fn();

    render(<SearchReplacePanel editorRef={editorRef} open={true} onClose={onClose} onChange={onChange} />);

    // Type search term
    const searchInput = screen.getByPlaceholderText('Search');
    fireEvent.change(searchInput, { target: { value: 'foo' } });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(screen.getByText('1 of 3')).toBeInTheDocument();

    // Expand replace row by clicking the toggle (ChevronRight icon button)
    const toggleButtons = screen.getAllByRole('button');
    // The first button is the expand/collapse toggle
    fireEvent.click(toggleButtons[0]);

    // Type replace term
    const replaceInput = screen.getByPlaceholderText('Replace');
    fireEvent.change(replaceInput, { target: { value: 'qux' } });

    // Click "All" button to replace all
    const allButton = screen.getByText('All');
    fireEvent.click(allButton);

    // Verify executeEdits was called
    expect(editor.executeEdits).toHaveBeenCalled();

    // Verify onChange was called with the replaced content
    expect(onChange).toHaveBeenCalledWith('qux bar qux baz qux');
  });
});
