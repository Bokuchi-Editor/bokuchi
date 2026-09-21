import type { ComponentProps } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

import StarPromptCard from '../StarPromptCard';

const renderCard = (overrides: Partial<ComponentProps<typeof StarPromptCard>> = {}) => {
  const props = { open: true, showNever: false, onStar: vi.fn(), onLater: vi.fn(), onNever: vi.fn(), ...overrides };
  render(<StarPromptCard {...props} />);
  return props;
};

describe('StarPromptCard', () => {
  it('T-SPC-01: renders nothing while closed', () => {
    renderCard({ open: false });
    expect(screen.queryByText('starPrompt.title')).toBeNull();
  });

  it('T-SPC-02: shows the ask and wires Star and Later', () => {
    const props = renderCard();
    expect(screen.getByText('starPrompt.title')).toBeTruthy();
    expect(screen.getByText('starPrompt.body')).toBeTruthy();
    fireEvent.click(screen.getByText('starPrompt.star'));
    expect(props.onStar).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText('starPrompt.later'));
    expect(props.onLater).toHaveBeenCalledTimes(1);
  });

  it('T-SPC-03: the close button counts as Later', () => {
    const props = renderCard();
    fireEvent.click(screen.getByLabelText('starPrompt.close'));
    expect(props.onLater).toHaveBeenCalledTimes(1);
    expect(props.onNever).not.toHaveBeenCalled();
  });

  it('T-SPC-04: offers "Don\'t show again" only when asked to', () => {
    renderCard();
    expect(screen.queryByText('starPrompt.never')).toBeNull();
  });

  it('T-SPC-05: "Don\'t show again" calls onNever', () => {
    const props = renderCard({ showNever: true });
    fireEvent.click(screen.getByText('starPrompt.never'));
    expect(props.onNever).toHaveBeenCalledTimes(1);
  });
});
