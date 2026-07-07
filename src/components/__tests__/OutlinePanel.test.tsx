import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { HeadingItem } from '../../types/outline';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

import OutlinePanel from '../OutlinePanel';
import { asMock } from '../../test-utils';

describe('OutlinePanel', () => {
  let onHeadingClick: ReturnType<typeof vi.fn>;
  let onClose: ReturnType<typeof vi.fn>;

  const sampleHeadings: HeadingItem[] = [
    { level: 1, text: 'Title', lineNumber: 1 },
    { level: 2, text: 'Section A', lineNumber: 5 },
    { level: 3, text: 'Subsection', lineNumber: 10 },
  ];

  beforeEach(() => {
    onHeadingClick = vi.fn();
    onClose = vi.fn();
  });

  // T-OP-01: renders heading list
  it('T-OP-01: renders all headings', () => {
    render(
      <OutlinePanel headings={sampleHeadings} onHeadingClick={asMock<(lineNumber: number, index: number) => void>(onHeadingClick)} />,
    );
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Section A')).toBeInTheDocument();
    expect(screen.getByText('Subsection')).toBeInTheDocument();
  });

  // T-OP-02: empty state when no headings
  it('T-OP-02: shows empty message when no headings', () => {
    render(
      <OutlinePanel headings={[]} onHeadingClick={asMock<(lineNumber: number, index: number) => void>(onHeadingClick)} />,
    );
    expect(screen.getByText('outline.noHeadings')).toBeInTheDocument();
  });

  // T-OP-03: clicking heading calls onHeadingClick with lineNumber and index
  it('T-OP-03: calls onHeadingClick with lineNumber and index when heading is clicked', () => {
    render(
      <OutlinePanel headings={sampleHeadings} onHeadingClick={asMock<(lineNumber: number, index: number) => void>(onHeadingClick)} />,
    );
    fireEvent.click(screen.getByText('Section A'));
    expect(onHeadingClick).toHaveBeenCalledWith(5, 1);
  });

  // T-OP-04: close button calls onClose
  it('T-OP-04: calls onClose when close button is clicked', () => {
    render(
      <OutlinePanel
        headings={sampleHeadings}
        onHeadingClick={asMock<(lineNumber: number, index: number) => void>(onHeadingClick)}
        onClose={asMock<() => void>(onClose)}
      />,
    );
    // The close button has a CloseIcon inside
    const closeButton = screen.getByTestId('CloseIcon').closest('button')!;
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // T-OP-05: no close button when onClose not provided
  it('T-OP-05: does not render close button when onClose is not provided', () => {
    render(
      <OutlinePanel headings={[]} onHeadingClick={asMock<(lineNumber: number, index: number) => void>(onHeadingClick)} />,
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  // T-OP-06: renders title
  it('T-OP-06: renders the outline title', () => {
    render(
      <OutlinePanel headings={sampleHeadings} onHeadingClick={asMock<(lineNumber: number, index: number) => void>(onHeadingClick)} />,
    );
    expect(screen.getByText('outline.title')).toBeInTheDocument();
  });
});
