import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import SaveBeforeCloseDialog from '../SaveBeforeCloseDialog';

describe('SaveBeforeCloseDialog', () => {
  let onSave: ReturnType<typeof vi.fn>;
  let onDontSave: ReturnType<typeof vi.fn>;
  let onCancel: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onSave = vi.fn();
    onDontSave = vi.fn();
    onCancel = vi.fn();
  });

  const renderDialog = (open = true, fileName = 'test.md') =>
    render(
      <SaveBeforeCloseDialog
        open={open}
        fileName={fileName}
        onSave={onSave}
        onDontSave={onDontSave}
        onCancel={onCancel}
      />,
    );

  // T-SBCD-01: dialog renders when open
  it('T-SBCD-01: renders dialog when open is true', () => {
    renderDialog(true);
    expect(screen.getByText('Save changes?')).toBeInTheDocument();
  });

  // T-SBCD-02: dialog hidden when closed
  it('T-SBCD-02: does not render dialog content when open is false', () => {
    renderDialog(false);
    expect(screen.queryByText('Save changes?')).not.toBeInTheDocument();
  });

  // T-SBCD-03: displays fileName
  it('T-SBCD-03: displays the file name', () => {
    renderDialog(true, 'notes.md');
    expect(screen.getByText('notes.md')).toBeInTheDocument();
  });

  // T-SBCD-04: Save button calls onSave
  it('T-SBCD-04: calls onSave when Save button is clicked', () => {
    renderDialog();
    fireEvent.click(screen.getByText('Save'));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  // T-SBCD-05: Don't Save button calls onDontSave
  it("T-SBCD-05: calls onDontSave when Don't Save button is clicked", () => {
    renderDialog();
    fireEvent.click(screen.getByText("Don't Save"));
    expect(onDontSave).toHaveBeenCalledTimes(1);
  });

  // T-SBCD-06: Cancel button calls onCancel
  it('T-SBCD-06: calls onCancel when Cancel button is clicked', () => {
    renderDialog();
    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  // T-SBCD-07: all three buttons are present
  it('T-SBCD-07: renders all three action buttons', () => {
    renderDialog();
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText("Don't Save")).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });
});
