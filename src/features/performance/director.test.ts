import { describe, expect, it } from 'vitest';
import { directorStateAt, type DirectorInput } from './director';

const input = (overrides: Partial<DirectorInput> = {}): DirectorInput => ({
  time: 0, duration: 100, seed: 7, quality: 'high',
  impact: { age: 1, energy: 0, lowEnergy: 0 }, ...overrides,
});

describe('cinematic director', () => {
  it.each([[0, 'boot'], [12, 'fracture'], [28, 'assemble'], [45, 'perform']] as const)(
    'directs %s seconds of a long score as %s', (time, act) => {
      expect(directorStateAt(input({ time })).act).toBe(act);
    },
  );

  it('reconstructs the exact camera pose after arbitrary evaluation order', () => {
    const expected = directorStateAt(input({ time: 12.14, impact: { age: 0.14, energy: 0.5, lowEnergy: 0.3 } }));
    directorStateAt(input({ time: 72 }));
    expect(directorStateAt(input({ time: 12.14, impact: { age: 0.14, energy: 0.5, lowEnergy: 0.3 } }))).toEqual(expected);
  });

  it('keeps choreography identical across quality tiers', () => {
    const high = directorStateAt(input({ time: 33, quality: 'high' }));
    const low = directorStateAt(input({ time: 33, quality: 'low' }));
    expect(low.camera).toEqual(high.camera);
    expect(low.fracture).toEqual(high.fracture);
  });

  it('bounds the principal flash to the opening 120 ms of fracture', () => {
    expect(directorStateAt(input({ time: 12.06 })).fracture.flash).toBeGreaterThan(0);
    expect(directorStateAt(input({ time: 12.13 })).fracture.flash).toBe(0);
  });

  it('does not shake the camera for ordinary musical impacts', () => {
    const calm = directorStateAt(input({ time: 60, impact: { age: 1, energy: 0, lowEnergy: 0 } }));
    const accented = directorStateAt(input({ time: 60, impact: { age: 0.05, energy: 1, lowEnergy: 1 } }));
    expect(accented.camera).toEqual(calm.camera);
  });

  it('uses one restrained camera impulse only at the principal fracture', () => {
    const before = directorStateAt(input({ time: 11.99 })).camera.position;
    const impact = directorStateAt(input({ time: 12.06 })).camera.position;
    const settled = directorStateAt(input({ time: 12.19 })).camera.position;
    expect(Math.abs(impact[0])).toBeGreaterThan(0);
    expect(Math.abs(impact[0])).toBeLessThan(0.06);
    expect(settled[0]).toBe(0);
    expect(before[0]).not.toBe(impact[0]);
  });

  it('keeps the perform camera in a readable oblique score view', () => {
    const camera = directorStateAt(input({ time: 60 })).camera;
    expect(Math.abs(camera.position[0] - camera.target[0])).toBeGreaterThan(2);
    expect(Math.abs(camera.position[1] - camera.target[1])).toBeGreaterThan(1);
  });
});
