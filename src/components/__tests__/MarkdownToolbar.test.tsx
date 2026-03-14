import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

import MarkdownToolbar from '../MarkdownToolbar';
import type { editor } from 'monaco-editor';

function createMockEditor() {
  return {
    getSelection: vi.fn().mockReturnValue({
      startLineNumber: 1,
      startColumn: 1,
      endLineNumber: 1,
      endColumn: 1,
    }),
    getPosition: vi.fn().mockReturnValue({ lineNumber: 1, column: 1 }),
    getModel: vi.fn().mockReturnValue({
      getValueInRange: vi.fn().mockReturnValue(''),
      getLineContent: vi.fn().mockReturnValue(''),
    }),
    executeEdits: vi.fn(),
    setSelection: vi.fn(),
    focus: vi.fn(),
  };
}

type MockEditor = ReturnType<typeof createMockEditor>;

describe('MarkdownToolbar', () => {
  let mockEditor: MockEditor;
  let editorRef: React.RefObject<MockEditor | null>;

  beforeEach(() => {
    mockEditor = createMockEditor();
    editorRef = { current: mockEditor };
  });

  // T-MT-01: renders toolbar buttons
  it('T-MT-01: renders toolbar with buttons', () => {
    render(<MarkdownToolbar editorRef={editorRef as React.RefObject<editor.IStandaloneCodeEditor | null>} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(5);
  });

  // T-MT-02: bold button calls executeEdits
  it('T-MT-02: bold button inserts bold markers', () => {
    render(<MarkdownToolbar editorRef={editorRef as React.RefObject<editor.IStandaloneCodeEditor | null>} />);
    // Bold button has tooltip containing "toolbar.bold"
    const buttons = screen.getAllByRole('button');
    // Bold is the 2nd button (after heading)
    fireEvent.click(buttons[1]);
    expect(mockEditor.executeEdits).toHaveBeenCalled();
    const editCall = mockEditor.executeEdits.mock.calls[0];
    expect(editCall[1][0].text).toContain('**');
  });

  // T-MT-03: heading menu opens on click
  it('T-MT-03: heading button opens heading menu', () => {
    render(<MarkdownToolbar editorRef={editorRef as React.RefObject<editor.IStandaloneCodeEditor | null>} />);
    const buttons = screen.getAllByRole('button');
    // Heading is the first button
    fireEvent.click(buttons[0]);
    expect(screen.getByText('toolbar.heading1')).toBeInTheDocument();
    expect(screen.getByText('toolbar.heading2')).toBeInTheDocument();
    expect(screen.getByText('toolbar.heading3')).toBeInTheDocument();
  });

  // T-MT-04: selecting heading level calls executeEdits
  it('T-MT-04: selecting H1 from menu inserts heading', () => {
    render(<MarkdownToolbar editorRef={editorRef as React.RefObject<editor.IStandaloneCodeEditor | null>} />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]); // open menu
    fireEvent.click(screen.getByText('toolbar.heading1'));
    expect(mockEditor.executeEdits).toHaveBeenCalled();
    const editCall = mockEditor.executeEdits.mock.calls[0];
    expect(editCall[1][0].text).toContain('# ');
  });

  // T-MT-05: no-op when editor ref is null
  it('T-MT-05: does not crash when editorRef.current is null', () => {
    const nullRef: React.RefObject<editor.IStandaloneCodeEditor | null> = { current: null };
    render(<MarkdownToolbar editorRef={nullRef} />);
    const buttons = screen.getAllByRole('button');
    // Click bold - should not throw
    fireEvent.click(buttons[1]);
    // No error means pass
  });
});
