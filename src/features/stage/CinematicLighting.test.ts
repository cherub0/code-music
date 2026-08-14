import { describe, expect, it } from 'vitest';
import { cinematicCityLayout, cyberpunkTowerLayout } from './CinematicLighting';

describe('cinematicCityLayout', () => {
  it('selects the high-density city data for the cinematic renderer', () => {
    const duration = 60;
    const city = cinematicCityLayout(duration, 'high');

    expect(city.buildings.length).toBeGreaterThan(0);
    expect(city.lightStrips.length).toBe(city.buildings.length * 2);
    expect(city.roadSegments.length).toBeGreaterThan(0);
    expect(city.trafficTrails.length).toBeGreaterThan(0);
  });

  it('suppresses traffic data for the low-quality selector', () => {
    const city = cinematicCityLayout(60, 'low');

    expect(city.trafficTrails).toHaveLength(0);
  });

  it('keeps the legacy tower layout API backed by the city model', () => {
    const towers = cyberpunkTowerLayout(60);

    expect(towers).toEqual(cinematicCityLayout(60, 'high').buildings);
  });
});
