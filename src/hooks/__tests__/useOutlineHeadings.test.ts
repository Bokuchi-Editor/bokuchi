import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useOutlineHeadings } from '../useOutlineHeadings';

describe('useOutlineHeadings', () => {
  // T-UOH-01: returns empty array for undefined content
  it('T-UOH-01: returns empty array when content is undefined', () => {
    const { result } = renderHook(() => useOutlineHeadings(undefined));
    expect(result.current).toEqual([]);
  });

  // T-UOH-02: returns empty array for empty string
  it('T-UOH-02: returns empty array for empty string', () => {
    const { result } = renderHook(() => useOutlineHeadings(''));
    expect(result.current).toEqual([]);
  });

  // T-UOH-03: extracts headings from markdown
  it('T-UOH-03: extracts headings from markdown content', () => {
    const content = '# Title\n\nSome text\n\n## Section\n\n### Subsection';
    const { result } = renderHook(() => useOutlineHeadings(content));
    expect(result.current).toHaveLength(3);
    expect(result.current[0]).toEqual({ level: 1, text: 'Title', lineNumber: 1 });
    expect(result.current[1]).toEqual({ level: 2, text: 'Section', lineNumber: 5 });
    expect(result.current[2]).toEqual({ level: 3, text: 'Subsection', lineNumber: 7 });
  });

  // T-UOH-04: memoizes result
  it('T-UOH-04: returns same reference when content does not change', () => {
    const content = '# Title';
    const { result, rerender } = renderHook(
      ({ c }) => useOutlineHeadings(c),
      { initialProps: { c: content } },
    );
    const first = result.current;
    rerender({ c: content });
    expect(result.current).toBe(first);
  });
});
