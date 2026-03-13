import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../../api/storeApi', () => ({
  storeApi: {
    loadZoomLevel: vi.fn().mockResolvedValue(1.0),
    saveZoomLevel: vi.fn().mockResolvedValue(undefined),
  },
}));

import { useZoom, ZoomConfig } from '../useZoom';
import { storeApi } from '../../api/storeApi';

const defaultConfig: ZoomConfig = {
  minZoom: 0.5,
  maxZoom: 2.0,
  defaultZoom: 1.0,
  zoomStep: 0.1,
};

describe('useZoom', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(storeApi.loadZoomLevel).mockResolvedValue(1.0);
    vi.mocked(storeApi.saveZoomLevel).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // T-UZ-01: initializes with default zoom
  it('T-UZ-01: initializes with default zoom', () => {
    const { result } = renderHook(() => useZoom(defaultConfig));
    expect(result.current.currentZoom).toBe(1.0);
    expect(result.current.zoomPercentage).toBe(100);
  });

  // T-UZ-02: zoomIn increases zoom
  it('T-UZ-02: zoomIn increases zoom by step', () => {
    const { result } = renderHook(() => useZoom(defaultConfig));

    act(() => result.current.zoomIn());

    expect(result.current.currentZoom).toBeCloseTo(1.1);
    expect(storeApi.saveZoomLevel).toHaveBeenCalled();
  });

  // T-UZ-03: zoomOut decreases zoom
  it('T-UZ-03: zoomOut decreases zoom by step', () => {
    const { result } = renderHook(() => useZoom(defaultConfig));

    act(() => result.current.zoomOut());

    expect(result.current.currentZoom).toBeCloseTo(0.9);
  });

  // T-UZ-04: resetZoom returns to default
  it('T-UZ-04: resetZoom returns to default zoom', () => {
    const { result } = renderHook(() => useZoom(defaultConfig));

    act(() => result.current.zoomIn());
    act(() => result.current.zoomIn());
    act(() => result.current.resetZoom());

    expect(result.current.currentZoom).toBe(1.0);
  });

  // T-UZ-05: canZoomIn and canZoomOut flags
  it('T-UZ-05: canZoomIn is true when below max, canZoomOut is true when above min', () => {
    const { result } = renderHook(() => useZoom(defaultConfig));
    expect(result.current.canZoomIn).toBe(true);
    expect(result.current.canZoomOut).toBe(true);
  });

  // T-UZ-06: canZoomIn becomes false at max
  it('T-UZ-06: canZoomIn is false at maxZoom', () => {
    const config = { ...defaultConfig, defaultZoom: 2.0 };
    const { result } = renderHook(() => useZoom(config));
    expect(result.current.canZoomIn).toBe(false);
  });

  // T-UZ-07: canZoomOut becomes false at min
  it('T-UZ-07: canZoomOut is false at minZoom', () => {
    const config = { ...defaultConfig, defaultZoom: 0.5 };
    const { result } = renderHook(() => useZoom(config));
    expect(result.current.canZoomOut).toBe(false);
  });

  // T-UZ-08: isAtLimit sets when hitting max
  it('T-UZ-08: isAtLimit becomes true when reaching max', () => {
    const config = { ...defaultConfig, defaultZoom: 1.9 };
    const { result } = renderHook(() => useZoom(config));

    act(() => result.current.zoomIn());

    expect(result.current.isAtLimit).toBe(true);

    // Clears after timeout
    act(() => vi.advanceTimersByTime(2000));
    expect(result.current.isAtLimit).toBe(false);
  });

  // T-UZ-09: loads saved zoom level
  it('T-UZ-09: loads saved zoom level on mount', async () => {
    vi.mocked(storeApi.loadZoomLevel).mockResolvedValue(1.5);

    const { result } = renderHook(() => useZoom(defaultConfig));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(result.current.currentZoom).toBe(1.5);
  });

  // T-UZ-10: zoomPercentage reflects current zoom
  it('T-UZ-10: zoomPercentage is derived from currentZoom', () => {
    const config = { ...defaultConfig, defaultZoom: 0.75 };
    const { result } = renderHook(() => useZoom(config));
    expect(result.current.zoomPercentage).toBe(75);
  });
});
