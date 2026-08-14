import { describe, expect, it } from 'vitest';
import { cityAtmosphereAt } from './cityAtmosphere';

describe('cityAtmosphereAt', () => {
  it('moves every key light with the late-song camera corridor', () => {
    const state = cityAtmosphereAt(232.968 * 0.75, 232.968, 0xc17b3, 'high');

    expect(state.corridorZ).toBeCloseTo(262.089, 3);
    expect(state.lights.every((light) => Math.abs(light.position[2] - state.corridorZ) <= 8)).toBe(true);
    expect(state.particles.every((particle) => Math.abs(particle.position[2] - state.corridorZ) <= 18)).toBe(true);
  });

  it('reconstructs deterministic atmosphere and reduces only the low-density pool', () => {
    const high = cityAtmosphereAt(85.03332, 232.968, 0xc17b3, 'high');
    const low = cityAtmosphereAt(85.03332, 232.968, 0xc17b3, 'low');

    expect(cityAtmosphereAt(85.03332, 232.968, 0xc17b3, 'high')).toEqual(high);
    expect(low.lights).toEqual(high.lights);
    expect(low.particles.length).toBeLessThan(high.particles.length);
    expect(high.particles).toHaveLength(72);
  });

  it('keeps atmosphere inside the generated city through the end of the track', () => {
    const state = cityAtmosphereAt(232.968, 232.968, 0xc17b3, 'high');

    expect(state.corridorZ).toBeLessThan(state.cityLength);
    expect(state.particles.every(({ position }) => position[2] >= 0 && position[2] <= state.cityLength)).toBe(true);
  });
});
