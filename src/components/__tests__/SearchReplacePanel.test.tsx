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
  // Content-change listeners: fired after executeEdits applies, mirroring
  // Monaco's onDidChangeModelContent so the panel re-searches after a replace.
  const contentListeners: (() => void)[] = [];

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
    setPosition: vi.fn(),
    focus: vi.fn(),
    executeEdits: vi.fn().mockImplementation((_source: string, edits: { range: { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number }; text: string }[]) => {
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
      for (const cb of [...contentListeners]) cb();
    }),
    onDidChangeModelContent: vi.fn().mockImplementation((cb: () => void) => {
      contentListeners.push(cb);
      return {
        dispose: () => {
          const i = contentListeners.indexOf(cb);
          if (i >= 0) contentListeners.splice(i, 1);
        },
      };
    }),
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
    const editorRef = { current: editor } as React.RefObject<never>;
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
    const editorRef = { current: editor } as React.RefObject<never>;
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
    const editorRef = { current: editor } as React.RefObject<never>;
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
    const editorRef = { current: editor } as React.RefObject<never>;
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

  // T-SR-13: single Replace replaces only the current match, then the
  // re-search (via onDidChangeModelContent) makes the next occurrence current.
  it('T-SR-13: single Replace replaces only the current match and advances', () => {
    const editor = createMockEditor('foo bar foo baz foo');
    const editorRef = { current: editor } as React.RefObject<never>;
    const onChange = vi.fn();

    render(
      <SearchReplacePanel
        editorRef={editorRef}
        open={true}
        onClose={vi.fn()}
        onChange={onChange}
        showReplaceDefault={true}
      />,
    );

    const searchInput = screen.getByPlaceholderText('Search');
    fireEvent.change(searchInput, { target: { value: 'foo' } });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(screen.getByText('1 of 3')).toBeInTheDocument();

    const replaceInput = screen.getByPlaceholderText('Replace');
    fireEvent.change(replaceInput, { target: { value: 'qux' } });

    // Click "Replace" (single) — only the current (first) match is replaced
    fireEvent.click(screen.getByText('Replace'));

    expect(editor.executeEdits).toHaveBeenCalledTimes(1);
    const [source, edits] = (editor.executeEdits as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(source).toBe('search-replace');
    expect(edits).toHaveLength(1);

    expect(onChange).toHaveBeenCalledWith('qux bar foo baz foo');
    // Re-search found the 2 remaining matches; the next one is now current.
    expect(screen.getByText('1 of 2')).toBeInTheDocument();
  });

  // T-SR-14: an invalid regex input must not crash; it yields zero matches
  it('T-SR-14: invalid regex input shows no results instead of crashing', () => {
    const editor = createMockEditor('hello (world)');
    const editorRef = { current: editor } as React.RefObject<never>;

    render(
      <SearchReplacePanel editorRef={editorRef} open={true} onClose={vi.fn()} onChange={vi.fn()} />,
    );

    // Enable regex mode, then type an unclosed group
    fireEvent.click(screen.getByText('.*'));
    const searchInput = screen.getByPlaceholderText('Search');
    fireEvent.change(searchInput, { target: { value: '(' } });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(screen.getByText('No results')).toBeInTheDocument();
  });

  // T-SR-15: whole-word toggle excludes substring matches
  it('T-SR-15: whole word toggle excludes substring matches', () => {
    const editor = createMockEditor('cat catalog\nmy cat');
    const editorRef = { current: editor } as React.RefObject<never>;

    render(
      <SearchReplacePanel editorRef={editorRef} open={true} onClose={vi.fn()} onChange={vi.fn()} />,
    );

    const searchInput = screen.getByPlaceholderText('Search');
    fireEvent.change(searchInput, { target: { value: 'cat' } });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Substring matching: "cat", "cat" in catalog, and "cat" on line 2
    expect(screen.getByText('1 of 3')).toBeInTheDocument();

    // Enable whole-word mode via the "ab" button
    fireEvent.click(screen.getByText('ab'));

    act(() => {
      vi.advanceTimersByTime(200);
    });

    // "catalog" no longer matches
    expect(screen.getByText('1 of 2')).toBeInTheDocument();
  });

  // T-SR-16: Enter advances through matches and wraps around to the first
  it('T-SR-16: Enter moves to the next match and wraps around', () => {
    const editor = createMockEditor('hello world\nhello again\nhello end');
    const editorRef = { current: editor } as React.RefObject<never>;

    render(
      <SearchReplacePanel editorRef={editorRef} open={true} onClose={vi.fn()} onChange={vi.fn()} />,
    );

    const searchInput = screen.getByPlaceholderText('Search');
    fireEvent.change(searchInput, { target: { value: 'hello' } });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(screen.getByText('1 of 3')).toBeInTheDocument();

    fireEvent.keyDown(searchInput, { key: 'Enter' });
    expect(screen.getByText('2 of 3')).toBeInTheDocument();
    expect(editor.setSelection).toHaveBeenLastCalledWith(
      expect.objectContaining({ startLineNumber: 2 }),
    );
    expect(editor.revealLineInCenter).toHaveBeenLastCalledWith(2);

    fireEvent.keyDown(searchInput, { key: 'Enter' });
    expect(screen.getByText('3 of 3')).toBeInTheDocument();

    // Wrap around from the last match back to the first
    fireEvent.keyDown(searchInput, { key: 'Enter' });
    expect(screen.getByText('1 of 3')).toBeInTheDocument();
    expect(editor.setSelection).toHaveBeenLastCalledWith(
      expect.objectContaining({ startLineNumber: 1 }),
    );
  });

  // T-SR-17: Shift+Enter moves backwards and wraps to the last match
  it('T-SR-17: Shift+Enter moves to the previous match with wrap-around', () => {
    const editor = createMockEditor('hello world\nhello again\nhello end');
    const editorRef = { current: editor } as React.RefObject<never>;

    render(
      <SearchReplacePanel editorRef={editorRef} open={true} onClose={vi.fn()} onChange={vi.fn()} />,
    );

    const searchInput = screen.getByPlaceholderText('Search');
    fireEvent.change(searchInput, { target: { value: 'hello' } });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(screen.getByText('1 of 3')).toBeInTheDocument();

    // Backwards from the first match wraps to the last
    fireEvent.keyDown(searchInput, { key: 'Enter', shiftKey: true });
    expect(screen.getByText('3 of 3')).toBeInTheDocument();
    expect(editor.setSelection).toHaveBeenLastCalledWith(
      expect.objectContaining({ startLineNumber: 3 }),
    );
  });

  // T-SR-18: Escape closes the panel (document-level capture listener)
  it('T-SR-18: Escape key closes the panel', () => {
    const editor = createMockEditor('hello world');
    const editorRef = { current: editor } as React.RefObject<never>;
    const onClose = vi.fn();

    render(
      <SearchReplacePanel editorRef={editorRef} open={true} onClose={onClose} onChange={vi.fn()} />,
    );

    // The listener is on document (capture), so focus location does not matter
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------------
  // Cross-tab search tests
  // -------------------------------------------------------------------------

  const sampleTabs = [
    { id: 'tab1', title: 'file1.md', content: 'hello world\ngoodbye world', isModified: false, isNew: false },
    { id: 'tab2', title: 'file2.md', content: 'hello again\nfoo bar', isModified: false, isNew: false },
    { id: 'tab3', title: 'file3.md', content: 'no match here', isModified: false, isNew: false },
  ];

  // T-SR-05: checkbox is shown when multiple tabs are provided
  it('T-SR-05: shows "search all tabs" checkbox when multiple tabs are provided', () => {
    const editor = createMockEditor('hello world');
    const editorRef = { current: editor } as React.RefObject<never>;

    render(
      <SearchReplacePanel
        editorRef={editorRef}
        open={true}
        onClose={vi.fn()}
        onChange={vi.fn()}
        tabs={sampleTabs}
        activeTabId="tab1"
      />,
    );

    expect(screen.getByText('search.searchAllTabs')).toBeInTheDocument();
  });

  // T-SR-06: checkbox is NOT shown with a single tab
  it('T-SR-06: hides "search all tabs" checkbox when only one tab', () => {
    const editor = createMockEditor('hello world');
    const editorRef = { current: editor } as React.RefObject<never>;

    render(
      <SearchReplacePanel
        editorRef={editorRef}
        open={true}
        onClose={vi.fn()}
        onChange={vi.fn()}
        tabs={[sampleTabs[0]]}
        activeTabId="tab1"
      />,
    );

    expect(screen.queryByText('search.searchAllTabs')).not.toBeInTheDocument();
  });

  // T-SR-07: cross-tab search finds matches across all tabs
  it('T-SR-07: cross-tab search finds matches across all tabs', () => {
    const editor = createMockEditor('hello world\ngoodbye world');
    const editorRef = { current: editor } as React.RefObject<never>;

    render(
      <SearchReplacePanel
        editorRef={editorRef}
        open={true}
        onClose={vi.fn()}
        onChange={vi.fn()}
        tabs={sampleTabs}
        activeTabId="tab1"
        searchAllTabsDefault={true}
      />,
    );

    const searchInput = screen.getByPlaceholderText('Search');
    fireEvent.change(searchInput, { target: { value: 'hello' } });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    // "hello" appears in tab1 ("hello world") and tab2 ("hello again") = 2 total
    expect(screen.getByText('1 of 2')).toBeInTheDocument();

    // Tab headers should be visible
    expect(screen.getByText('file1.md')).toBeInTheDocument();
    expect(screen.getByText('file2.md')).toBeInTheDocument();
    // file3.md has no matches so should not appear as a group header
    expect(screen.queryByText('file3.md')).not.toBeInTheDocument();
  });

  // T-SR-08: cross-tab search shows match counts per tab
  it('T-SR-08: cross-tab search shows per-tab match counts', () => {
    const editor = createMockEditor('world world\ngoodbye world');
    const editorRef = { current: editor } as React.RefObject<never>;

    render(
      <SearchReplacePanel
        editorRef={editorRef}
        open={true}
        onClose={vi.fn()}
        onChange={vi.fn()}
        tabs={sampleTabs}
        activeTabId="tab1"
        searchAllTabsDefault={true}
      />,
    );

    const searchInput = screen.getByPlaceholderText('Search');
    fireEvent.change(searchInput, { target: { value: 'world' } });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    // "world" appears: tab1 has 2 ("hello world", "goodbye world"), tab2 has 1 ("hello again" no, wait)
    // tab1: "hello world\ngoodbye world" => 2 matches
    // tab2: "hello again\nfoo bar" => 0 matches
    // tab3: "no match here" => 0 matches
    // Total: 2
    expect(screen.getByText('1 of 2')).toBeInTheDocument();
    expect(screen.getByText('(2)')).toBeInTheDocument();
  });

  // T-SR-09: replace row is hidden in cross-tab mode
  it('T-SR-09: replace row is hidden when search all tabs is enabled', () => {
    const editor = createMockEditor('hello world');
    const editorRef = { current: editor } as React.RefObject<never>;

    render(
      <SearchReplacePanel
        editorRef={editorRef}
        open={true}
        onClose={vi.fn()}
        onChange={vi.fn()}
        tabs={sampleTabs}
        activeTabId="tab1"
        searchAllTabsDefault={true}
      />,
    );

    // The expand/collapse toggle for replace should not be present in cross-tab mode
    // Instead, a spacer Box is rendered. So the Replace placeholder should not appear.
    expect(screen.queryByPlaceholderText('Replace')).not.toBeInTheDocument();
  });

  // T-SR-10: clicking a cross-tab match triggers tab switch
  it('T-SR-10: clicking a cross-tab match calls onTabSwitch for different tab', () => {
    const editor = createMockEditor('hello world\ngoodbye world');
    const editorRef = { current: editor } as React.RefObject<never>;
    const onTabSwitch = vi.fn();

    render(
      <SearchReplacePanel
        editorRef={editorRef}
        open={true}
        onClose={vi.fn()}
        onChange={vi.fn()}
        tabs={sampleTabs}
        activeTabId="tab1"
        onTabSwitch={onTabSwitch}
        searchAllTabsDefault={true}
      />,
    );

    const searchInput = screen.getByPlaceholderText('Search');
    fireEvent.change(searchInput, { target: { value: 'hello' } });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Click on a match from tab2 (the second match result row)
    // Both match rows show line number "L1"
    const matchRows = screen.getAllByText('L1');
    // The second L1 belongs to tab2's match
    fireEvent.click(matchRows[1]);

    expect(onTabSwitch).toHaveBeenCalledWith('tab2');
  });

  // T-SR-11: clicking a same-tab match does NOT call onTabSwitch
  it('T-SR-11: clicking a same-tab match does not call onTabSwitch', () => {
    const editor = createMockEditor('hello world\ngoodbye world');
    const editorRef = { current: editor } as React.RefObject<never>;
    const onTabSwitch = vi.fn();

    render(
      <SearchReplacePanel
        editorRef={editorRef}
        open={true}
        onClose={vi.fn()}
        onChange={vi.fn()}
        tabs={sampleTabs}
        activeTabId="tab1"
        onTabSwitch={onTabSwitch}
        searchAllTabsDefault={true}
      />,
    );

    const searchInput = screen.getByPlaceholderText('Search');
    fireEvent.change(searchInput, { target: { value: 'hello' } });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Click on a match from tab1 (the first match result row)
    const matchRows = screen.getAllByText('L1');
    fireEvent.click(matchRows[0]);

    // Same tab - should NOT call onTabSwitch
    expect(onTabSwitch).not.toHaveBeenCalled();
    // But should call setSelection on the editor
    expect(editor.setSelection).toHaveBeenCalled();
  });

  // T-SR-12b: showReplaceDefault=true opens panel with replace row visible
  it('T-SR-12b: showReplaceDefault=true opens panel with replace row visible', () => {
    const editor = createMockEditor('hello world');
    const editorRef = { current: editor } as React.RefObject<never>;

    render(
      <SearchReplacePanel
        editorRef={editorRef}
        open={true}
        onClose={vi.fn()}
        onChange={vi.fn()}
        showReplaceDefault={true}
      />,
    );

    expect(screen.getByPlaceholderText('Replace')).toBeInTheDocument();
  });

  // T-SR-12c: showReplaceDefault=false (default) opens panel without replace row
  it('T-SR-12c: showReplaceDefault=false opens panel without replace row', () => {
    const editor = createMockEditor('hello world');
    const editorRef = { current: editor } as React.RefObject<never>;

    render(
      <SearchReplacePanel
        editorRef={editorRef}
        open={true}
        onClose={vi.fn()}
        onChange={vi.fn()}
        showReplaceDefault={false}
      />,
    );

    expect(screen.queryByPlaceholderText('Replace')).not.toBeInTheDocument();
  });

  // T-SR-12: toggling checkbox switches between single and cross-tab mode
  it('T-SR-12: toggling checkbox switches between single and cross-tab search', () => {
    const editor = createMockEditor('hello world\ngoodbye world');
    const editorRef = { current: editor } as React.RefObject<never>;

    render(
      <SearchReplacePanel
        editorRef={editorRef}
        open={true}
        onClose={vi.fn()}
        onChange={vi.fn()}
        tabs={sampleTabs}
        activeTabId="tab1"
      />,
    );

    const searchInput = screen.getByPlaceholderText('Search');
    fireEvent.change(searchInput, { target: { value: 'hello' } });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Default: single-tab mode — only finds in current editor content (1 "hello" in editor)
    expect(screen.getByText('1 of 1')).toBeInTheDocument();
    // Tab group headers should NOT appear in single-tab mode
    expect(screen.queryByText('file1.md')).not.toBeInTheDocument();

    // Enable cross-tab search
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Cross-tab: "hello" in tab1 + tab2 = 2 matches, with tab grouping
    expect(screen.getByText('1 of 2')).toBeInTheDocument();
    expect(screen.getByText('file1.md')).toBeInTheDocument();
    expect(screen.getByText('file2.md')).toBeInTheDocument();
  });
});
