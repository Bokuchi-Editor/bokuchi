import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (opts?.returnObjects) return ['Step 1', 'Step 2'];
      return key;
    },
  }),
}));

vi.mock('../../utils/platform', () => ({
  formatKeyboardShortcut: (key: string, withShift: boolean) =>
    withShift ? `Ctrl+Shift+${key}` : `Ctrl+${key}`,
  getPlatform: () => 'windows',
}));

import HelpDialog from '../Help';
import { asMock } from '../../test-utils';

describe('HelpDialog', () => {
  let onClose: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onClose = vi.fn();
  });

  // T-HD-01: renders when open
  it('T-HD-01: renders dialog when open is true', () => {
    render(<HelpDialog open={true} onClose={asMock<() => void>(onClose)} />);
    expect(screen.getByText('help.title')).toBeInTheDocument();
  });

  // T-HD-02: hidden when closed
  it('T-HD-02: does not render when open is false', () => {
    render(<HelpDialog open={false} onClose={asMock<() => void>(onClose)} />);
    expect(screen.queryByText('help.title')).not.toBeInTheDocument();
  });

  // T-HD-03: shows getting started by default
  it('T-HD-03: shows getting started page by default', () => {
    render(<HelpDialog open={true} onClose={asMock<() => void>(onClose)} />);
    // Title appears both in sidebar and content area
    const elements = screen.getAllByText('help.gettingStarted.title');
    expect(elements.length).toBeGreaterThanOrEqual(2);
    // Content area shows basic usage section
    expect(screen.getByText('help.gettingStarted.basicUsage')).toBeInTheDocument();
  });

  // T-HD-04: navigating to features tab
  it('T-HD-04: switches to features page on click', () => {
    render(<HelpDialog open={true} onClose={asMock<() => void>(onClose)} />);
    fireEvent.click(screen.getByText('help.features.title'));
    expect(screen.getByText('help.features.description')).toBeInTheDocument();
  });

  // T-HD-05: navigating to keyboard shortcuts tab
  it('T-HD-05: switches to keyboard shortcuts page', () => {
    render(<HelpDialog open={true} onClose={asMock<() => void>(onClose)} />);
    fireEvent.click(screen.getByText('help.keyboardShortcuts.title'));
    expect(screen.getByText('help.keyboardShortcuts.description')).toBeInTheDocument();
  });

  // T-HD-06: navigating to variables tab
  it('T-HD-06: switches to variables page', () => {
    render(<HelpDialog open={true} onClose={asMock<() => void>(onClose)} />);
    fireEvent.click(screen.getByText('help.variables.title'));
    expect(screen.getByText('help.variables.description')).toBeInTheDocument();
  });

  // T-HD-07: navigating to tutorials tab
  it('T-HD-07: switches to tutorials page', () => {
    render(<HelpDialog open={true} onClose={asMock<() => void>(onClose)} />);
    fireEvent.click(screen.getByText('help.tutorials.title'));
    expect(screen.getByText('help.tutorials.description')).toBeInTheDocument();
  });

  // T-HD-08: close button calls onClose
  it('T-HD-08: calls onClose when close button is clicked', () => {
    render(<HelpDialog open={true} onClose={asMock<() => void>(onClose)} />);
    const closeButton = screen.getByLabelText('close');
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // T-HD-09: all sidebar navigation items are visible
  it('T-HD-09: renders all sidebar navigation items', () => {
    render(<HelpDialog open={true} onClose={asMock<() => void>(onClose)} />);
    // Some titles appear both in sidebar and content; use getAllByText
    expect(screen.getAllByText('help.gettingStarted.title').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('help.features.title').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('help.variables.title').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('help.keyboardShortcuts.title').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('help.tutorials.title').length).toBeGreaterThanOrEqual(1);
  });
});
