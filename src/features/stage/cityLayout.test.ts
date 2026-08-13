import { describe, expect, it } from 'vitest';
import { buildCityLayout } from './cityLayout';

describe('buildCityLayout', () => {
  it('builds a deterministic high-density canyon that covers the score journey', () => {
    const layout = buildCityLayout(60, 0xc17b3, 'high');

    expect(layout.length).toBeGreaterThanOrEqual(108);
    expect(layout.buildings.every((building) => Math.abs(building.position[0]) >= 4.5)).toBe(true);
    expect(layout.buildings.every((building) => Math.abs(building.position[0]) - building.scale[0] / 2 >= 4.5)).toBe(true);
    expect(layout.lightStrips.every((strip) => Math.abs(strip.position[0]) - strip.scale[0] / 2 >= 4.5)).toBe(true);
    expect(buildCityLayout(60, 0xc17b3, 'high')).toEqual(layout);
    expect(buildCityLayout(60, 0xc17b4, 'high')).not.toEqual(layout);
    expect(buildCityLayout(60, 0xc17b3, 'low').buildings.length).toBeLessThan(layout.buildings.length);
  });

  it('retains the same generated building candidates at low density', () => {
    const high = buildCityLayout(60, 0xc17b3, 'high');
    const low = buildCityLayout(60, 0xc17b3, 'low');

    expect(low.buildings).toEqual(high.buildings.filter((_, index) => Math.floor(index / 2) % 2 === 0));
  });
});
