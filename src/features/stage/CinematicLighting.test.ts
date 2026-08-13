import { describe, expect, it } from 'vitest';
import { cinematicCityLayout } from './CinematicLighting';

describe('cinematicCityLayout', () => {
  it('selects the high-density city data for the cinematic renderer', () => {
    const duration = 60;
    const city = cinematicCityLayout(duration, 'high');

    expect(city.buildings.length).toBeGreaterThan(0);
    expect(city.lightStrips.length).toBe(city.buildings.length * 2);
    expect(city.roadSegments.length).toBeGreaterThan(0);
    expect(city.trafficTrails.length).toBeGreaterThan(0);
  });
});
