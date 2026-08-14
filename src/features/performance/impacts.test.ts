import { describe, expect, it } from 'vitest';
import type { ScoreLayout } from '../score/layout';
import { buildImpactTimeline, impactStateAt } from './impacts';

function scoreWithNotes(notes: Array<[number, number, number]>): ScoreLayout {
  return {
    durationSeconds: 4,
    tracks: [],
    notes: notes.map(([pitch, startSeconds, velocity], index) => ({
      id: `n${index}`, trackId: 'piano', pitch, velocity, startSeconds,
      durationSeconds: 0.25, position: { x: 0, y: 0, z: startSeconds * 1.5 },
      glow: velocity, trailLength: 0.375,
    })),
  };
}

describe('musical impacts', () => {
  it('groups notes within 60 ms into one velocity-weighted impact', () => {
    const impacts = buildImpactTimeline(scoreWithNotes([
      [36, 1, 0.9], [72, 1.04, 0.7], [60, 2, 0.2],
    ]));
    expect(impacts).toHaveLength(2);
    expect(impacts[0].time).toBe(1);
    expect(impacts[0].energy).toBeGreaterThan(impacts[1].energy);
    expect(impacts[0].lowEnergy).toBeGreaterThan(0);
  });

  it('reconstructs a bounded decay without mutable lookup state', () => {
    const impacts = [{ time: 2, energy: 0.8, lowEnergy: 0.6 }];
    const direct = impactStateAt(2.1, impacts);
    impactStateAt(2.25, impacts);
    expect(impactStateAt(2.1, impacts)).toEqual(direct);
    expect(impactStateAt(3, impacts)).toEqual({ age: 1, energy: 0, lowEnergy: 0 });
  });
});
