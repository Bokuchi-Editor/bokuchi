import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
  Trans: ({
    i18nKey,
    values,
  }: {
    i18nKey: string;
    values?: Record<string, string>;
  }) => <span>{`${i18nKey}:${values?.fileName ?? ''}`}</span>,
}));

import SaveBeforeCloseDialog from '../SaveBeforeCloseDialog';
import { asMock } from '../../test-utils';

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
        onSave={asMock<() => void>(onSave)}
        onDontSave={asMock<() => void>(onDontSave)}
        onCancel={asMock<() => void>(onCancel)}
      />,
    );

  // T-SBCD-01: dialog renders when open
  it('T-SBCD-01: renders dialog when open is true', () => {
    renderDialog(true);
    expect(screen.getByText('dialogs.saveChanges')).toBeInTheDocument();
  });

  // T-SBCD-02: dialog hidden when closed
  it('T-SBCD-02: does not render dialog content when open is false', () => {
    renderDialog(false);
    expect(screen.queryByText('dialogs.saveChanges')).not.toBeInTheDocument();
  });

  // T-SBCD-03: displays fileName
  it('T-SBCD-03: displays the file name', () => {
    renderDialog(true, 'notes.md');
    expect(
      screen.getByText('dialogs.saveChangesMessage:notes.md'),
    ).toBeInTheDocument();
  });

  // T-SBCD-04: Save button calls onSave
  it('T-SBCD-04: calls onSave when Save button is clicked', () => {
    renderDialog();
    fireEvent.click(screen.getByText('buttons.save'));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  // T-SBCD-05: Don't Save button calls onDontSave
  it("T-SBCD-05: calls onDontSave when Don't Save button is clicked", () => {
    renderDialog();
    fireEvent.click(screen.getByText('buttons.dontSave'));
    expect(onDontSave).toHaveBeenCalledTimes(1);
  });

  // T-SBCD-06: Cancel button calls onCancel
  it('T-SBCD-06: calls onCancel when Cancel button is clicked', () => {
    renderDialog();
    fireEvent.click(screen.getByText('buttons.cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  // T-SBCD-07: all three buttons are present
  it('T-SBCD-07: renders all three action buttons', () => {
    renderDialog();
    expect(screen.getByText('buttons.save')).toBeInTheDocument();
    expect(screen.getByText('buttons.dontSave')).toBeInTheDocument();
    expect(screen.getByText('buttons.cancel')).toBeInTheDocument();
  });
});
