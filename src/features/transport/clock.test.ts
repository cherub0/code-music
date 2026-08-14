import { describe, expect, it } from 'vitest';
import { logicalTime } from './clock';

describe('logicalTime', () => {
  it.each([
    [10, 0, 1, 10],
    [10, 1.5, 1, 8.5],
    [10, 0, 0.5, 5],
  ])('maps audio time to logical performance time', (audio, offset, speed, expected) => {
    expect(logicalTime(audio, offset, speed)).toBe(expected);
  });

  it('never returns a negative logical time', () => {
    expect(logicalTime(0.2, 1, 1)).toBe(0);
  });
});
