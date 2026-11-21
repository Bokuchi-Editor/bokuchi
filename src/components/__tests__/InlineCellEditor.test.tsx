import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import InlineCellEditor from '../InlineCellEditor';
import type { NavDir } from '../../utils/tableFormatter';

describe('InlineCellEditor', () => {
  let onCommit: ReturnType<typeof vi.fn<(value: string, dir: NavDir | null) => void>>;
  let onCancel: ReturnType<typeof vi.fn<() => void>>;

  beforeEach(() => {
    onCommit = vi.fn<(value: string, dir: NavDir | null) => void>();
    onCancel = vi.fn<() => void>();
  });

  const renderEditor = (canNavigate: (dir: NavDir) => boolean = () => true) =>
    render(
      <InlineCellEditor
        cellKey="0-0-0"
        top={0}
        left={0}
        width={100}
        height={24}
        initialValue="abc"
        fontSize={14}
        background="#fff"
        color="#000"
        onCommit={onCommit}
        onCancel={onCancel}
        canNavigate={canNavigate}
      />,
    );

  const textarea = () => screen.getByRole('textbox') as HTMLTextAreaElement;
  const placeCaret = (pos: number) => textarea().setSelectionRange(pos, pos);

  // T-ICE-01: Up/Down commit the edited text and move up/down (#639)
  it.each([
    ['ArrowUp', 'up'],
    ['ArrowDown', 'down'],
  ] as const)('T-ICE-01: %s commits and moves %s', (key, dir) => {
    renderEditor();
    fireEvent.change(textarea(), { target: { value: 'edited' } });
    // fireEvent returns false when the handler cancelled the caret movement.
    expect(fireEvent.keyDown(textarea(), { key })).toBe(false);
    expect(onCommit).toHaveBeenCalledWith('edited', dir);
  });

  // T-ICE-02: Left/Right leave the cell only from the start/end of the text
  it('T-ICE-02: ArrowLeft / ArrowRight move cells only from the caret at the text edge', () => {
    renderEditor();
    placeCaret(1);
    // Not cancelled: the textarea moves the caret as usual.
    expect(fireEvent.keyDown(textarea(), { key: 'ArrowLeft' })).toBe(true);
    expect(fireEvent.keyDown(textarea(), { key: 'ArrowRight' })).toBe(true);
    expect(onCommit).not.toHaveBeenCalled();

    placeCaret(3);
    expect(fireEvent.keyDown(textarea(), { key: 'ArrowRight' })).toBe(false);
    expect(onCommit).toHaveBeenCalledWith('abc', 'right');
  });

  // T-ICE-03: ArrowLeft at the start of the text moves left
  it('T-ICE-03: ArrowLeft at the start of the text moves to the left cell', () => {
    renderEditor();
    placeCaret(0);
    fireEvent.keyDown(textarea(), { key: 'ArrowLeft' });
    expect(onCommit).toHaveBeenCalledWith('abc', 'left');
  });

  // T-ICE-04: the whole-text selection the editor opens with is not a caret at an edge
  it('T-ICE-04: ArrowLeft / ArrowRight with the text selected stay in the cell', () => {
    renderEditor();
    textarea().setSelectionRange(0, 3);
    fireEvent.keyDown(textarea(), { key: 'ArrowLeft' });
    fireEvent.keyDown(textarea(), { key: 'ArrowRight' });
    expect(onCommit).not.toHaveBeenCalled();
  });

  // T-ICE-05: at the edge of the table / row the editor stays open
  it('T-ICE-05: does not commit when there is no cell in that direction', () => {
    const canNavigate = vi.fn((dir: NavDir) => dir !== 'up');
    renderEditor(canNavigate);
    expect(fireEvent.keyDown(textarea(), { key: 'ArrowUp' })).toBe(true);
    expect(canNavigate).toHaveBeenCalledWith('up');
    expect(onCommit).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });

  // T-ICE-06: modified arrows keep their text-editing meaning
  it('T-ICE-06: Shift / Alt / Ctrl / Meta + arrow keys do not move cells', () => {
    renderEditor();
    placeCaret(3);
    fireEvent.keyDown(textarea(), { key: 'ArrowRight', shiftKey: true });
    fireEvent.keyDown(textarea(), { key: 'ArrowDown', altKey: true });
    fireEvent.keyDown(textarea(), { key: 'ArrowUp', ctrlKey: true });
    fireEvent.keyDown(textarea(), { key: 'ArrowDown', metaKey: true });
    expect(onCommit).not.toHaveBeenCalled();
  });

  // T-ICE-07: arrow keys during IME composition never move cells
  it('T-ICE-07: ignores arrow keys while composing', () => {
    renderEditor();
    fireEvent.compositionStart(textarea());
    fireEvent.keyDown(textarea(), { key: 'ArrowDown' });
    expect(onCommit).not.toHaveBeenCalled();
  });

  // T-ICE-08: the existing Enter / Tab / Shift+Tab keys are unchanged
  it.each([
    [{ key: 'Enter' }, 'down'],
    [{ key: 'Tab' }, 'right'],
    [{ key: 'Tab', shiftKey: true }, 'left'],
  ] as const)('T-ICE-08: %o still commits and moves %s', (event, dir) => {
    renderEditor();
    fireEvent.keyDown(textarea(), event);
    expect(onCommit).toHaveBeenCalledWith('abc', dir);
  });

  // T-ICE-09: Esc still cancels without committing
  it('T-ICE-09: Esc cancels the edit', () => {
    renderEditor();
    fireEvent.change(textarea(), { target: { value: 'edited' } });
    fireEvent.keyDown(textarea(), { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onCommit).not.toHaveBeenCalled();
  });
});
