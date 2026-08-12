import { describe, expect, it } from 'vitest';
import type { ScoreLayout } from '../score/layout';
import { maximumWindowDemand } from './ScoreRibbon';

function scoreWithStarts(starts: number[]): ScoreLayout {
  return {
    durationSeconds: starts.at(-1) ?? 0,
    tracks: [],
    notes: starts.map((startSeconds, index) => ({
      durationSeconds: 1,
      glow: 0.5,
      id: `note-${index}`,
      pitch: 60,
      position: { x: 0, y: 0, z: startSeconds * 1.5 },
      startSeconds,
      trackId: 'track-0',
      trailLength: 1.5,
      velocity: 0.5,
    })),
  };
}

describe('maximumWindowDemand', () => {
  it('keeps capacity for every note in the densest inclusive visible window', () => {
    expect(maximumWindowDemand(scoreWithStarts(Array.from({ length: 600 }, () => 4)))).toBe(600);
    expect(maximumWindowDemand(scoreWithStarts(Array.from({ length: 21 }, (_, index) => index)))).toBe(17);
  });

  it('uses a smaller note window for low preview quality', () => {
    const score = scoreWithStarts(Array.from({ length: 21 }, (_, index) => index));

    expect(maximumWindowDemand(score, 8)).toBe(17);
    expect(maximumWindowDemand(score, 4)).toBe(9);
  });
});
