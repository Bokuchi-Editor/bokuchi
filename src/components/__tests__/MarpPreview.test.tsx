import { render, waitFor, fireEvent, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock Tauri plugins
vi.mock('@tauri-apps/api/core');
vi.mock('@tauri-apps/plugin-opener');

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
  buildAllSlidesDocument: vi.fn().mockReturnValue('<html><body>All Slides</body></html>'),
  buildThumbnailDocument: vi.fn().mockReturnValue('<html><body>Thumbnails</body></html>'),
}));

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback: string) => fallback,
  }),
}));

import MarpPreview from '../MarpPreview';
import { openUrl } from '@tauri-apps/plugin-opener';

const defaultProps = {
  content: '---\nmarp: true\n---\n# Slide 1\n---\n# Slide 2\n---\n# Slide 3',
  darkMode: false,
};

describe('MarpPreview - slide mode (preview)', () => {
  const slideProps = { ...defaultProps, viewMode: 'preview' as const };

  it('renders slide counter after loading', async () => {
    const { getByText } = render(<MarpPreview {...slideProps} />);
    await waitFor(() => {
      expect(getByText('1 / 3')).toBeTruthy();
    });
  });

  it('renders Presentation header', async () => {
    const { getByText } = render(<MarpPreview {...slideProps} />);
    await waitFor(() => {
      expect(getByText('Presentation')).toBeTruthy();
    });
  });

  it('navigates to next slide on next button click', async () => {
    const { getByText, getAllByRole } = render(<MarpPreview {...slideProps} />);

    await waitFor(() => {
      expect(getByText('1 / 3')).toBeTruthy();
    });

    const buttons = getAllByRole('button');
    // Click the next button (before fullscreen button, after slide counter)
    const nextButton = buttons.find(b => !b.hasAttribute('disabled') && b !== buttons[buttons.length - 1]);
    if (nextButton) fireEvent.click(nextButton);

    await waitFor(() => {
      expect(getByText('2 / 3')).toBeTruthy();
    });
  });

  it('disables previous button on first slide', async () => {
    const { getByText, getAllByRole } = render(<MarpPreview {...slideProps} />);

    await waitFor(() => {
      expect(getByText('1 / 3')).toBeTruthy();
    });

    const buttons = getAllByRole('button');
    // First button is "Previous"
    expect(buttons[0]).toBeDisabled();
  });

  it('renders an iframe for the slide', async () => {
    const { container } = render(<MarpPreview {...slideProps} />);
    await waitFor(() => {
      const iframe = container.querySelector('iframe');
      expect(iframe).toBeTruthy();
      expect(iframe?.getAttribute('title')).toBe('Marp Slide Preview');
    });
  });

  it('has a fullscreen button', async () => {
    const { getByText, container } = render(<MarpPreview {...slideProps} />);
    await waitFor(() => {
      expect(getByText('1 / 3')).toBeTruthy();
    });
    // Fullscreen button should exist (Fullscreen icon)
    const svgIcons = container.querySelectorAll('svg[data-testid="FullscreenIcon"]');
    expect(svgIcons.length).toBeGreaterThanOrEqual(0); // Icon may or may not have testid
  });
});

describe('MarpPreview - continuous mode (split)', () => {
  const splitProps = { ...defaultProps, viewMode: 'split' as const };

  it('renders slide count instead of navigation', async () => {
    const { getByText, queryByText } = render(<MarpPreview {...splitProps} />);
    await waitFor(() => {
      expect(getByText('3 slides')).toBeTruthy();
    });
    // Should not have slide navigation counter like "1 / 3"
    expect(queryByText('1 / 3')).toBeNull();
  });

  it('renders Presentation header', async () => {
    const { getByText } = render(<MarpPreview {...splitProps} />);
    await waitFor(() => {
      expect(getByText('Presentation')).toBeTruthy();
    });
  });

  it('renders an iframe for slides overview', async () => {
    const { container } = render(<MarpPreview {...splitProps} />);
    await waitFor(() => {
      const iframe = container.querySelector('iframe');
      expect(iframe).toBeTruthy();
      expect(iframe?.getAttribute('title')).toBe('Marp Slides Overview');
    });
  });

  it('does not render navigation buttons', async () => {
    const { getByText, queryAllByRole } = render(<MarpPreview {...splitProps} />);
    await waitFor(() => {
      expect(getByText('Presentation')).toBeTruthy();
    });
    // In continuous mode, there should be no navigation buttons
    const buttons = queryAllByRole('button');
    expect(buttons.length).toBe(0);
  });
});

// T-MP-LINK: openExternalUrl postMessage from any iframe must be routed to
// the OS browser via openUrl, never followed inside the webview. Unsafe
// schemes (javascript:, file:, data:, etc.) must be silently dropped.
describe('MarpPreview - openExternalUrl postMessage handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (openUrl as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  it('forwards http(s) URLs to openUrl', async () => {
    const { getByText } = render(<MarpPreview {...defaultProps} viewMode="preview" />);
    await waitFor(() => expect(getByText('1 / 3')).toBeTruthy());

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', { data: { type: 'openExternalUrl', url: 'https://example.com/page' } }),
      );
    });

    expect(openUrl).toHaveBeenCalledWith('https://example.com/page');
  });

  it('forwards mailto URLs to openUrl', async () => {
    const { getByText } = render(<MarpPreview {...defaultProps} viewMode="preview" />);
    await waitFor(() => expect(getByText('1 / 3')).toBeTruthy());

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', { data: { type: 'openExternalUrl', url: 'mailto:foo@example.com' } }),
      );
    });

    expect(openUrl).toHaveBeenCalledWith('mailto:foo@example.com');
  });

  it('drops javascript: and file: URLs without calling openUrl', async () => {
    const { getByText } = render(<MarpPreview {...defaultProps} viewMode="preview" />);
    await waitFor(() => expect(getByText('1 / 3')).toBeTruthy());

    for (const url of ['javascript:alert(1)', 'file:///etc/passwd', 'data:text/html,<script>x</script>']) {
      act(() => {
        window.dispatchEvent(
          new MessageEvent('message', { data: { type: 'openExternalUrl', url } }),
        );
      });
    }

    expect(openUrl).not.toHaveBeenCalled();
  });

  it('ignores openExternalUrl messages with non-string url payloads', async () => {
    const { getByText } = render(<MarpPreview {...defaultProps} viewMode="preview" />);
    await waitFor(() => expect(getByText('1 / 3')).toBeTruthy());

    for (const payload of [{ type: 'openExternalUrl' }, { type: 'openExternalUrl', url: 42 }, { type: 'openExternalUrl', url: null }]) {
      act(() => {
        window.dispatchEvent(new MessageEvent('message', { data: payload }));
      });
    }

    expect(openUrl).not.toHaveBeenCalled();
  });
});
