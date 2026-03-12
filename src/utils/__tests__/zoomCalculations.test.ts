import { describe, it, expect } from 'vitest';
import {
  calculateZoomIn,
  calculateZoomOut,
  isHittingMaxLimit,
  isHittingMinLimit,
  zoomToPercentage,
} from '../zoomCalculations';

describe('zoomCalculations', () => {
  describe('calculateZoomIn', () => {
    // T-ZC-01: normal zoom in
    it('T-ZC-01: increases zoom by step', () => {
      expect(calculateZoomIn(1.0, 0.1, 2.0)).toBeCloseTo(1.1);
    });

    // T-ZC-02: clamps to max
    it('T-ZC-02: clamps to maxZoom', () => {
      expect(calculateZoomIn(1.95, 0.1, 2.0)).toBe(2.0);
    });

    // T-ZC-03: at max stays at max
    it('T-ZC-03: stays at maxZoom when already at max', () => {
      expect(calculateZoomIn(2.0, 0.1, 2.0)).toBe(2.0);
    });
  });

  describe('calculateZoomOut', () => {
    // T-ZC-04: normal zoom out
    it('T-ZC-04: decreases zoom by step', () => {
      expect(calculateZoomOut(1.0, 0.1, 0.5)).toBeCloseTo(0.9);
    });

    // T-ZC-05: clamps to min
    it('T-ZC-05: clamps to minZoom', () => {
      expect(calculateZoomOut(0.55, 0.1, 0.5)).toBe(0.5);
    });
  });

  describe('isHittingMaxLimit', () => {
    // T-ZC-06: true when transitioning to max
    it('T-ZC-06: returns true when transitioning to max', () => {
      expect(isHittingMaxLimit(1.9, 2.0, 2.0)).toBe(true);
    });

    // T-ZC-07: false when already at max
    it('T-ZC-07: returns false when already at max', () => {
      expect(isHittingMaxLimit(2.0, 2.0, 2.0)).toBe(false);
    });

    // T-ZC-08: false when not at max
    it('T-ZC-08: returns false when not at max', () => {
      expect(isHittingMaxLimit(1.0, 1.1, 2.0)).toBe(false);
    });
  });

  describe('isHittingMinLimit', () => {
    // T-ZC-09: true when transitioning to min
    it('T-ZC-09: returns true when transitioning to min', () => {
      expect(isHittingMinLimit(0.6, 0.5, 0.5)).toBe(true);
    });

    // T-ZC-10: false when already at min
    it('T-ZC-10: returns false when already at min', () => {
      expect(isHittingMinLimit(0.5, 0.5, 0.5)).toBe(false);
    });
  });

  describe('zoomToPercentage', () => {
    // T-ZC-11: converts zoom to percentage
    it('T-ZC-11: converts 1.0 to 100', () => {
      expect(zoomToPercentage(1.0)).toBe(100);
    });

    // T-ZC-12: rounds correctly
    it('T-ZC-12: rounds to nearest integer', () => {
      expect(zoomToPercentage(0.75)).toBe(75);
      expect(zoomToPercentage(1.333)).toBe(133);
    });
  });
});
