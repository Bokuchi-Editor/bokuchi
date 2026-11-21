import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { useRef } from 'react';
import { useTablePreviewEditing } from '../useTablePreviewEditing';
import type { NavDir } from '../../../utils/tableFormatter';

// A 2-column table with a header and two body rows (row -1 = header).
const CONTENT = ['| A | B |', '| - | - |', '| a1 | b1 |', '| a2 | b2 |'].join('\n');

const cell = (tag: 'th' | 'td', row: number, col: number, text: string) =>
  `<${tag} data-bk-table="0" data-bk-row="${row}" data-bk-col="${col}">${text}</${tag}>`;

const TABLE_HTML =
  '<table><thead><tr>' + cell('th', -1, 0, 'A') + cell('th', -1, 1, 'B') + '</tr></thead><tbody>' +
  '<tr>' + cell('td', 0, 0, 'a1') + cell('td', 0, 1, 'b1') + '</tr>' +
  '<tr>' + cell('td', 1, 0, 'a2') + cell('td', 1, 1, 'b2') + '</tr></tbody></table>';

let canNavigate: (dir: NavDir) => boolean = () => {
  throw new Error('hook not rendered');
};

// Mirrors Preview.tsx: the hook reads the preview / scroll container through
// refs and opens the inline editor on a double-clicked cell.
function Host({ content = CONTENT }: { content?: string }) {
  const previewRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef(content);
  const onContentChangeRef = useRef<((c: string) => void) | undefined>(() => {});
  const { canNavigateCell } = useTablePreviewEditing({
    previewRef,
    scrollContainerRef,
    contentRef,
    onContentChangeRef,
    htmlContent: TABLE_HTML,
    isMarp: false,
  });
  canNavigate = canNavigateCell;
  return (
    <div ref={scrollContainerRef}>
      <div ref={previewRef} dangerouslySetInnerHTML={{ __html: TABLE_HTML }} />
    </div>
  );
}

const openCell = (container: HTMLElement, row: number, col: number) => {
  const el = container.querySelector(`[data-bk-row="${row}"][data-bk-col="${col}"]`)!;
  fireEvent.doubleClick(el);
};

describe('useTablePreviewEditing – canNavigateCell (#639)', () => {
  beforeEach(() => {
    canNavigate = () => {
      throw new Error('hook not rendered');
    };
  });

  // T-UTPE-01: nothing is being edited
  it('T-UTPE-01: returns false while no cell is open', () => {
    render(<Host />);
    expect(canNavigate('down')).toBe(false);
  });

  // T-UTPE-02: a body cell in the first column
  it('T-UTPE-02: allows up (to the header), down and right, but not left past the row edge', () => {
    const { container } = render(<Host />);
    openCell(container, 0, 0);
    expect(canNavigate('up')).toBe(true);
    expect(canNavigate('down')).toBe(true);
    expect(canNavigate('right')).toBe(true);
    expect(canNavigate('left')).toBe(false);
  });

  // T-UTPE-03: right does not wrap to the next row, unlike Tab
  it('T-UTPE-03: does not wrap right from the last column', () => {
    const { container } = render(<Host />);
    openCell(container, 0, 1);
    expect(canNavigate('right')).toBe(false);
    expect(canNavigate('left')).toBe(true);
  });

  // T-UTPE-04: the header and the last row are the table's top / bottom edges
  it('T-UTPE-04: stops at the header (up) and the last row (down)', () => {
    const { container } = render(<Host />);
    openCell(container, -1, 1);
    expect(canNavigate('up')).toBe(false);
    expect(canNavigate('down')).toBe(true);

    openCell(container, 1, 0);
    expect(canNavigate('down')).toBe(false);
    expect(canNavigate('up')).toBe(true);
  });

  // T-UTPE-05: the source no longer has the table the preview still shows
  it('T-UTPE-05: returns false when the table is missing from the source', () => {
    const { container } = render(<Host content="no table here" />);
    openCell(container, 0, 0);
    expect(canNavigate('down')).toBe(false);
  });
});
