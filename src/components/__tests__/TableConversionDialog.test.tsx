import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

import { TableConversionDialog } from '../TableConversionDialog';
import { asMock } from '../../test-utils';

describe('TableConversionDialog', () => {
  let onClose: ReturnType<typeof vi.fn>;
  let onConfirm: ReturnType<typeof vi.fn>;
  let onCancel: ReturnType<typeof vi.fn>;

  const sampleTable = '| A | B |\n|---|---|\n| 1 | 2 |';

  beforeEach(() => {
    onClose = vi.fn();
    onConfirm = vi.fn();
    onCancel = vi.fn();
  });

  const renderDialog = (open = true) =>
    render(
      <TableConversionDialog
        open={open}
        onClose={asMock<() => void>(onClose)}
        onConfirm={asMock<(convertWithoutAsking?: boolean) => void>(onConfirm)}
        onCancel={asMock<() => void>(onCancel)}
        markdownTable={sampleTable}
      />,
    );

  // T-TCD-01: dialog renders when open
  it('T-TCD-01: renders dialog when open is true', () => {
    renderDialog(true);
    expect(screen.getByText('tableConversion.dialogTitle')).toBeInTheDocument();
  });

  // T-TCD-02: dialog hidden when closed
  it('T-TCD-02: does not render when open is false', () => {
    renderDialog(false);
    expect(screen.queryByText('tableConversion.dialogTitle')).not.toBeInTheDocument();
  });

  // T-TCD-03: displays markdown table preview
  it('T-TCD-03: displays the markdown table preview', () => {
    renderDialog();
    // MUI Dialog renders content in a portal; use document.body
    expect(document.body.textContent).toContain('| A | B |');
    expect(document.body.textContent).toContain('| 1 | 2 |');
  });

  // T-TCD-04: confirm button calls onConfirm and onClose
  it('T-TCD-04: calls onConfirm(false) and onClose on confirm click', () => {
    renderDialog();
    fireEvent.click(screen.getByText('tableConversion.convert'));
    expect(onConfirm).toHaveBeenCalledWith(false);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // T-TCD-05: cancel button calls onCancel and onClose
  it('T-TCD-05: calls onCancel and onClose on cancel click', () => {
    renderDialog();
    fireEvent.click(screen.getByText('tableConversion.cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // T-TCD-06: checkbox toggles convertWithoutAsking
  it('T-TCD-06: passes true to onConfirm when checkbox is checked', () => {
    renderDialog();
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    fireEvent.click(screen.getByText('tableConversion.convert'));
    expect(onConfirm).toHaveBeenCalledWith(true);
  });

  // T-TCD-07: checkbox is unchecked by default
  it('T-TCD-07: checkbox is unchecked by default', () => {
    renderDialog();
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();
  });

  // T-TCD-08: displays dialog message and note
  it('T-TCD-08: renders message and note text', () => {
    renderDialog();
    expect(screen.getByText('tableConversion.dialogMessage')).toBeInTheDocument();
    expect(screen.getByText('tableConversion.dialogNote')).toBeInTheDocument();
  });
});
