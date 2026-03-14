import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, string>) => {
      if (key === 'dialogs.fileChanged.message' && opts?.fileName) {
        return `File ${opts.fileName} has been changed`;
      }
      return key;
    },
  }),
}));

import FileChangeDialog from '../FileChangeDialog';
import { asMock } from '../../test-utils';

describe('FileChangeDialog', () => {
  let onReload: ReturnType<typeof vi.fn>;
  let onCancel: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onReload = vi.fn();
    onCancel = vi.fn();
  });

  const renderDialog = (open = true, fileName = 'test.md') =>
    render(
      <FileChangeDialog
        open={open}
        fileName={fileName}
        onReload={asMock<() => void>(onReload)}
        onCancel={asMock<() => void>(onCancel)}
      />,
    );

  // T-FCD-01: dialog is visible when open=true
  it('T-FCD-01: renders dialog when open is true', () => {
    renderDialog(true);
    expect(screen.getByText('dialogs.fileChanged.title')).toBeInTheDocument();
  });

  // T-FCD-02: dialog is hidden when open=false
  it('T-FCD-02: does not render dialog content when open is false', () => {
    renderDialog(false);
    expect(screen.queryByText('dialogs.fileChanged.title')).not.toBeInTheDocument();
  });

  // T-FCD-03: displays the fileName in the message
  it('T-FCD-03: displays the file name in alert message', () => {
    renderDialog(true, 'readme.md');
    expect(screen.getByText('File readme.md has been changed')).toBeInTheDocument();
  });

  // T-FCD-04: clicking reload button calls onReload
  it('T-FCD-04: calls onReload when reload button is clicked', () => {
    renderDialog();
    fireEvent.click(screen.getByText('dialogs.fileChanged.yes'));
    expect(onReload).toHaveBeenCalledTimes(1);
  });

  // T-FCD-05: clicking cancel button calls onCancel
  it('T-FCD-05: calls onCancel when cancel button is clicked', () => {
    renderDialog();
    fireEvent.click(screen.getByText('dialogs.fileChanged.no'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  // T-FCD-06: displays question and description texts
  it('T-FCD-06: renders question and description texts', () => {
    renderDialog();
    expect(screen.getByText('dialogs.fileChanged.question')).toBeInTheDocument();
    expect(screen.getByText('dialogs.fileChanged.reloadDescription')).toBeInTheDocument();
    expect(screen.getByText('dialogs.fileChanged.keepDescription')).toBeInTheDocument();
  });
});
