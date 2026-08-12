import { describe, expect, it } from 'vitest';
import { performanceFrame } from './frame';
import { mulberry32 } from './seed';

describe('mulberry32', () => {
  it('replays the same deterministic sequence for the same seed', () => {
    const first = mulberry32(42);
    const second = mulberry32(42);

    expect([first(), first(), first()]).toEqual([second(), second(), second()]);
  });
});

describe('performanceFrame', () => {
  it.each([
    [0, 'boot'],
    [12, 'fracture'],
    [28, 'assemble'],
    [45, 'perform'],
  ] as const)('uses raw act boundaries at %s percent of the track', (percent, act) => {
    expect(performanceFrame(percent, 100, 7).act).toBe(act);
  });

  it('uses fixed 0/2/5/8 boundaries from 8 seconds up to but not including 20', () => {
    expect(performanceFrame(1.99, 8, 7).act).toBe('boot');
    expect(performanceFrame(2, 8, 7).act).toBe('fracture');
    expect(performanceFrame(5, 8, 7).act).toBe('assemble');
    expect(performanceFrame(8, 8, 7).act).toBe('perform');
    expect(performanceFrame(0, 10, 7).act).toBe('boot');
    expect(performanceFrame(2, 10, 7).act).toBe('fracture');
    expect(performanceFrame(5, 10, 7).act).toBe('assemble');
    expect(performanceFrame(8, 10, 7).act).toBe('perform');
    expect(performanceFrame(8, 19.99, 7).act).toBe('perform');
    expect(performanceFrame(2, 19.99, 7).act).toBe('fracture');
  });

  it('switches to proportional 12/28/45 percent boundaries at 20 seconds', () => {
    expect(performanceFrame(2, 20, 7).act).toBe('boot');
    expect(performanceFrame(2.4, 20, 7).act).toBe('fracture');
    expect(performanceFrame(5.61, 20, 7).act).toBe('assemble');
    expect(performanceFrame(9.01, 20, 7).act).toBe('perform');
  });

  it('proportionally compresses tracks under 8 seconds and preserves a final perform act', () => {
    expect(performanceFrame(0, 4, 7).act).toBe('boot');
    expect(performanceFrame(0.8, 4, 7).act).toBe('fracture');
    expect(performanceFrame(2, 4, 7).act).toBe('assemble');
    expect(performanceFrame(3.2, 4, 7).act).toBe('perform');
    expect(performanceFrame(3.99, 4, 7).act).toBe('perform');
  });

  it('returns byte-for-byte equal choreography for the same time and seed', () => {
    const first = performanceFrame(31.25, 100, 1234);
    const second = performanceFrame(31.25, 100, 1234);

    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it('eases fracture progress without leaking it before the fracture act', () => {
    expect(performanceFrame(11.99, 100, 1).fractureProgress).toBe(0);
    expect(performanceFrame(21, 100, 1).fractureProgress).toBeGreaterThan(0.5);
    expect(performanceFrame(28, 100, 1).fractureProgress).toBe(1);
  });
});
