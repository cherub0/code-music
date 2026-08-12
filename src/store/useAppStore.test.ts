import { beforeEach, describe, expect, it } from 'vitest';
import { useAppStore } from './useAppStore';

describe('useAppStore transport calibration', () => {
  beforeEach(() => {
    useAppStore.getState().setOffsetSeconds(0);
    useAppStore.getState().setSpeed(1);
  });

  it('keeps calibration offset and logical speed independently', () => {
    useAppStore.getState().setOffsetSeconds(-1.5);
    useAppStore.getState().setSpeed(1.25);

    expect(useAppStore.getState().offsetSeconds).toBe(-1.5);
    expect(useAppStore.getState().speed).toBe(1.25);
  });

  it('clamps finite calibration values and ignores non-finite writes', () => {
    useAppStore.getState().setOffsetSeconds(20);
    useAppStore.getState().setSpeed(0.1);
    expect(useAppStore.getState().offsetSeconds).toBe(10);
    expect(useAppStore.getState().speed).toBe(0.5);

    useAppStore.getState().setOffsetSeconds(-20);
    useAppStore.getState().setSpeed(3);
    expect(useAppStore.getState().offsetSeconds).toBe(-10);
    expect(useAppStore.getState().speed).toBe(2);

    useAppStore.getState().setOffsetSeconds(Number.NaN);
    useAppStore.getState().setSpeed(Number.POSITIVE_INFINITY);
    expect(useAppStore.getState().offsetSeconds).toBe(-10);
    expect(useAppStore.getState().speed).toBe(2);
  });
});
