import { describe, expect, it } from 'vitest';
import type { NormalizedScore } from '../midi/types';
import { DEFAULT_LAYOUT_OPTIONS, layoutScore, visibleNotes } from './layout';

const oneNoteScore: NormalizedScore = {
  durationSeconds: 2,
  notes: [{
    id: 'lead:note-0',
    trackId: 'lead',
    pitch: 60,
    velocity: 0.8,
    startSeconds: 0,
    durationSeconds: 2,
  }],
  tracks: [],
};

describe('layoutScore', () => {
  it('maps pitch, time, duration, and velocity to visual properties', () => {
    const [note] = layoutScore(oneNoteScore, DEFAULT_LAYOUT_OPTIONS).notes;

    expect(note.position).toEqual({ x: 0, y: 0, z: 0 });
    expect(note.glow).toBeCloseTo(0.8);
    expect(note.trailLength).toBeCloseTo(3);
  });

  it('uses C4 as the pitch baseline and clamps visual velocity', () => {
    const layout = layoutScore({
      ...oneNoteScore,
      notes: [
        { ...oneNoteScore.notes[0], id: 'low', pitch: 59, velocity: 0 },
        { ...oneNoteScore.notes[0], id: 'high', pitch: 72, velocity: 2, startSeconds: 2 },
      ],
    }, DEFAULT_LAYOUT_OPTIONS);

    expect(layout.notes).toMatchObject([
      { position: { y: -0.18 }, glow: 0.15 },
      { position: { y: 2.16, z: 3 }, glow: 1 },
    ]);
  });
});

describe('visibleNotes', () => {
  it('returns only notes whose starts are in the centered active time window', () => {
    const longLayout = layoutScore({
      durationSeconds: 50,
      tracks: [],
      notes: [10, 22, 25, 30, 38, 39].map((startSeconds, index) => ({
        ...oneNoteScore.notes[0],
        id: `note-${index}`,
        startSeconds,
      })),
    }, DEFAULT_LAYOUT_OPTIONS);

    expect(visibleNotes(longLayout, 30, 8).map((note) => note.startSeconds)).toEqual([22, 25, 30, 38]);
  });
});
