import { describe, expect, it } from 'vitest';
import { buildCityLayout } from './cityLayout';

describe('buildCityLayout', () => {
  it('builds a deterministic high-density canyon that covers the score journey', () => {
    const layout = buildCityLayout(60, 0xc17b3, 'high');

    expect(layout.length).toBeGreaterThanOrEqual(108);
    expect(layout.buildings.every((building) => Math.abs(building.position[0]) >= 4.5)).toBe(true);
    expect(buildCityLayout(60, 0xc17b3, 'high')).toEqual(layout);
    expect(buildCityLayout(60, 0xc17b4, 'high')).not.toEqual(layout);
    expect(buildCityLayout(60, 0xc17b3, 'low').buildings.length).toBeLessThan(layout.buildings.length);
  });
});
