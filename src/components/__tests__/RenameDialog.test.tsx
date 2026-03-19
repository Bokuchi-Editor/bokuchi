import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

import RenameDialog from '../RenameDialog';
import { asMock } from '../../test-utils';

describe('RenameDialog', () => {
  let onConfirm: ReturnType<typeof vi.fn>;
  let onCancel: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onConfirm = vi.fn();
    onCancel = vi.fn();
  });

  const renderDialog = (overrides = {}) =>
    render(
      <RenameDialog
        open={true}
        currentName="test.md"
        onConfirm={asMock<(newName: string) => void>(onConfirm)}
        onCancel={asMock<() => void>(onCancel)}
        {...overrides}
      />,
    );

  // T-RD-01: renders with current file name
  it('T-RD-01: shows current file name in input', () => {
    renderDialog();
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toBe('test.md');
  });

  // T-RD-02: calls onConfirm with new name
  it('T-RD-02: calls onConfirm when name is changed and confirmed', () => {
    renderDialog();
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'renamed.md' } });
    fireEvent.click(screen.getByText('folderTree.renameConfirm'));
    expect(onConfirm).toHaveBeenCalledWith('renamed.md');
  });

  // T-RD-03: calls onCancel when name is unchanged
  it('T-RD-03: calls onCancel when name is not changed', () => {
    renderDialog();
    fireEvent.click(screen.getByText('folderTree.renameConfirm'));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  // T-RD-04: shows error for empty name
  it('T-RD-04: shows validation error for empty name', () => {
    renderDialog();
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.click(screen.getByText('folderTree.renameConfirm'));
    expect(screen.getByText('folderTree.renameErrorEmpty')).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  // T-RD-05: shows error for invalid characters
  it('T-RD-05: shows validation error for slash in name', () => {
    renderDialog();
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'path/file.md' } });
    fireEvent.click(screen.getByText('folderTree.renameConfirm'));
    expect(screen.getByText('folderTree.renameErrorInvalidChar')).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  // T-RD-06: calls onCancel when cancel button is clicked
  it('T-RD-06: calls onCancel on cancel button click', () => {
    renderDialog();
    fireEvent.click(screen.getByText('buttons.cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  // T-RD-07: Enter key submits the form
  it('T-RD-07: submits on Enter key', () => {
    renderDialog();
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'new-name.md' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onConfirm).toHaveBeenCalledWith('new-name.md');
  });

  // T-RD-08: not rendered when open is false
  it('T-RD-08: does not render when open is false', () => {
    renderDialog({ open: false });
    expect(screen.queryByText('folderTree.renameTitle')).not.toBeInTheDocument();
  });
});
