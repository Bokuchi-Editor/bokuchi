import { render, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';

// Mock Tauri plugins
vi.mock('@tauri-apps/api/core');

vi.mock('../../api/variableApi', () => ({
  variableApi: {
    processMarkdown: vi.fn().mockImplementation(async (content: string) => ({
      processedContent: content,
    })),
  },
}));

vi.mock('../../utils/marpRenderer', () => ({
  contentIsMarp: vi.fn().mockReturnValue(true),
  renderMarp: vi.fn().mockResolvedValue({
    html: '<div class="marpit"><svg data-marpit-svg="">1</svg><svg data-marpit-svg="">2</svg><svg data-marpit-svg="">3</svg></div>',
    css: '.marpit { color: red; }',
    slideCount: 3,
  }),
  buildSlideDocument: vi.fn().mockImplementation(
    (_html: string, _css: string, index: number) => `<html><body>Slide ${index + 1}</body></html>`,
  ),
}));

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback: string) => fallback,
  }),
}));

import MarpPreview from '../MarpPreview';

const defaultProps = {
  content: '---\nmarp: true\n---\n# Slide 1\n---\n# Slide 2\n---\n# Slide 3',
  darkMode: false,
};

describe('MarpPreview', () => {
  it('renders slide counter after loading', async () => {
    const { getByText } = render(<MarpPreview {...defaultProps} />);
    await waitFor(() => {
      expect(getByText('1 / 3')).toBeTruthy();
    });
  });

  it('renders Presentation header', async () => {
    const { getByText } = render(<MarpPreview {...defaultProps} />);
    await waitFor(() => {
      expect(getByText('Presentation')).toBeTruthy();
    });
  });

  it('navigates to next slide on next button click', async () => {
    const { getByText, getAllByRole } = render(<MarpPreview {...defaultProps} />);

    await waitFor(() => {
      expect(getByText('1 / 3')).toBeTruthy();
    });

    const buttons = getAllByRole('button');
    // Click the last button (Next)
    fireEvent.click(buttons[buttons.length - 1]);

    await waitFor(() => {
      expect(getByText('2 / 3')).toBeTruthy();
    });
  });

  it('disables previous button on first slide', async () => {
    const { getByText, getAllByRole } = render(<MarpPreview {...defaultProps} />);

    await waitFor(() => {
      expect(getByText('1 / 3')).toBeTruthy();
    });

    const buttons = getAllByRole('button');
    // First button is "Previous"
    expect(buttons[0]).toBeDisabled();
  });

  it('renders an iframe for the slide', async () => {
    const { container } = render(<MarpPreview {...defaultProps} />);
    await waitFor(() => {
      const iframe = container.querySelector('iframe');
      expect(iframe).toBeTruthy();
      expect(iframe?.getAttribute('title')).toBe('Marp Slide Preview');
    });
  });
});
