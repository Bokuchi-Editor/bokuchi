import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useEditorFocus } from '../useEditorFocus';

describe('useEditorFocus', () => {
  // T-UEF-01: initial focusRequestId is 0
  it('T-UEF-01: initializes focusRequestId to 0', () => {
    const { result } = renderHook(() => useEditorFocus());
    expect(result.current.focusRequestId).toBe(0);
  });

  // T-UEF-02: requestEditorFocus increments counter
  it('T-UEF-02: increments focusRequestId on each requestEditorFocus call', () => {
    const { result } = renderHook(() => useEditorFocus());

    act(() => result.current.requestEditorFocus());
    expect(result.current.focusRequestId).toBe(1);

    act(() => result.current.requestEditorFocus());
    expect(result.current.focusRequestId).toBe(2);
  });

  // T-UEF-03: requestEditorFocus is stable (same reference)
  it('T-UEF-03: requestEditorFocus maintains stable reference', () => {
    const { result, rerender } = renderHook(() => useEditorFocus());
    const firstRef = result.current.requestEditorFocus;
    rerender();
    expect(result.current.requestEditorFocus).toBe(firstRef);
  });
});
