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
});
