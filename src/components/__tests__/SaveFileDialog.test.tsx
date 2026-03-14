import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import SaveFileDialog from '../SaveFileDialog';
import { asMock } from '../../test-utils';

describe('SaveFileDialog', () => {
  let onClose: ReturnType<typeof vi.fn>;
  let onSave: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onClose = vi.fn();
    onSave = vi.fn();
  });

  const renderDialog = (open = true, defaultFileName = 'untitled') =>
    render(
      <SaveFileDialog
        open={open}
        onClose={asMock<() => void>(onClose)}
        onSave={asMock<(fileName: string) => void>(onSave)}
        defaultFileName={defaultFileName}
      />,
    );

  // T-SFD-01: dialog renders when open
  it('T-SFD-01: renders dialog when open is true', () => {
    renderDialog(true);
    expect(screen.getByText('Save File As')).toBeInTheDocument();
  });

  // T-SFD-02: dialog hidden when closed
  it('T-SFD-02: does not render dialog content when open is false', () => {
    renderDialog(false);
    expect(screen.queryByText('Save File As')).not.toBeInTheDocument();
  });

  // T-SFD-03: default file name is shown in input
  it('T-SFD-03: shows the default file name in the text field', () => {
    renderDialog(true, 'myfile');
    const input = screen.getByDisplayValue('myfile');
    expect(input).toBeInTheDocument();
  });

  // T-SFD-04: Save appends .md extension
  it('T-SFD-04: calls onSave with fileName and .md extension', () => {
    renderDialog(true, 'document');
    fireEvent.click(screen.getByText('Save'));
    expect(onSave).toHaveBeenCalledWith('document.md', '.md');
    expect(onClose).toHaveBeenCalled();
  });

  // T-SFD-05: does not duplicate extension if already present
  it('T-SFD-05: does not duplicate extension when fileName already ends with it', () => {
    renderDialog(true, 'document.md');
    fireEvent.click(screen.getByText('Save'));
    expect(onSave).toHaveBeenCalledWith('document.md', '.md');
  });

  // T-SFD-06: Save button disabled when filename is empty
  it('T-SFD-06: Save button is disabled when filename is blank', () => {
    renderDialog(true, '');
    const saveButton = screen.getByText('Save');
    expect(saveButton).toBeDisabled();
  });

  // T-SFD-07: Cancel resets fileName and calls onClose
  it('T-SFD-07: Cancel button calls onClose', () => {
    renderDialog(true, 'test');
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // T-SFD-08: user can change the file name
  it('T-SFD-08: user can type a new file name', () => {
    renderDialog(true, 'untitled');
    const input = screen.getByDisplayValue('untitled');
    fireEvent.change(input, { target: { value: 'newname' } });
    fireEvent.click(screen.getByText('Save'));
    expect(onSave).toHaveBeenCalledWith('newname.md', '.md');
  });

  // T-SFD-09: Save not called when filename is whitespace only
  it('T-SFD-09: does not call onSave when filename is whitespace only', () => {
    renderDialog(true, 'untitled');
    const input = screen.getByDisplayValue('untitled');
    fireEvent.change(input, { target: { value: '   ' } });
    const saveButton = screen.getByText('Save');
    expect(saveButton).toBeDisabled();
  });
});
