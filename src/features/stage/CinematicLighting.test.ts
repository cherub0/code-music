import { describe, expect, it } from 'vitest';
import { cyberpunkTowerLayout } from './CinematicLighting';

describe('cyberpunkTowerLayout', () => {
  it('keeps the city canyon alongside the full travelling score', () => {
    const duration = 60;
    const towers = cyberpunkTowerLayout(duration);

    expect(Math.max(...towers.map((tower) => tower.position[2])))
      .toBeGreaterThan(duration * 1.5 + 8);
    expect(towers.every((tower) => Math.abs(tower.position[0]) >= 5)).toBe(true);
    expect(towers.some((tower) => tower.magenta)).toBe(true);
  });
});
