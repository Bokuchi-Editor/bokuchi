import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../../api/variableApi', () => ({
  variableApi: {
    getGlobalVariables: vi.fn().mockResolvedValue({}),
    setGlobalVariable: vi.fn().mockResolvedValue({ success: true }),
    exportVariablesToYAML: vi.fn().mockResolvedValue('key: value'),
    loadVariablesFromYAML: vi.fn().mockResolvedValue({ success: true }),
  },
}));

vi.mock('../../api/desktopApi', () => ({
  desktopApi: {
    saveYamlFile: vi.fn().mockResolvedValue({ success: true }),
    openYamlFile: vi.fn().mockResolvedValue({ content: 'key: value', error: null }),
  },
}));

import VariableSettings from '../VariableSettings';
import { variableApi } from '../../api/variableApi';
import { asMock } from '../../test-utils';

describe('VariableSettings', () => {
  let onClose: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onClose = vi.fn();
    vi.mocked(variableApi.getGlobalVariables).mockResolvedValue({});
  });

  // T-VS-01: renders dialog when open
  it('T-VS-01: renders dialog when open', async () => {
    render(<VariableSettings open={true} onClose={asMock<() => void>(onClose)} />);
    expect(screen.getByText('Global Variables')).toBeInTheDocument();
  });

  // T-VS-02: hidden when closed
  it('T-VS-02: does not render when closed', () => {
    render(<VariableSettings open={false} onClose={asMock<() => void>(onClose)} />);
    expect(screen.queryByText('Global Variables')).not.toBeInTheDocument();
  });

  // T-VS-03: loads variables on open
  it('T-VS-03: loads variables when dialog opens', async () => {
    vi.mocked(variableApi.getGlobalVariables).mockResolvedValue({ title: 'My Doc' });
    render(<VariableSettings open={true} onClose={asMock<() => void>(onClose)} />);
    await waitFor(() => {
      expect(screen.getByText('title')).toBeInTheDocument();
    });
  });

  // T-VS-04: shows no variables message
  it('T-VS-04: shows empty state when no variables', async () => {
    render(<VariableSettings open={true} onClose={asMock<() => void>(onClose)} />);
    await waitFor(() => {
      expect(screen.getByText(/No variables defined/)).toBeInTheDocument();
    });
  });

  // T-VS-05: add variable with empty name shows error
  it('T-VS-05: shows error for empty variable name', async () => {
    render(<VariableSettings open={true} onClose={asMock<() => void>(onClose)} />);
    // The Add button is disabled when name is empty, so we check that
    const addButton = screen.getByRole('button', { name: /Add/i });
    expect(addButton).toBeDisabled();
  });

  // T-VS-06: close button calls onClose
  it('T-VS-06: calls onClose when Close button is clicked', () => {
    render(<VariableSettings open={true} onClose={asMock<() => void>(onClose)} />);
    fireEvent.click(screen.getByText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // T-VS-07: displays usage example
  it('T-VS-07: shows usage example section', () => {
    render(<VariableSettings open={true} onClose={asMock<() => void>(onClose)} />);
    expect(screen.getByText('Usage Example:')).toBeInTheDocument();
  });
});
