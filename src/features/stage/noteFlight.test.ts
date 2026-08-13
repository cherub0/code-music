import { describe, expect, it } from 'vitest';
import type { ScoreNote } from '../score/layout';
import { noteFlightRecord, noteFlightRenderBatch, noteFlightRenderStyle } from './noteFlight';

function note(overrides: Partial<ScoreNote> = {}): ScoreNote {
  return {
    id: 'note-60',
    trackId: 'track-alpha',
    pitch: 60,
    velocity: 0.5,
    startSeconds: 2,
    durationSeconds: 1,
    position: { x: 0, y: 0, z: 3 },
    glow: 0.5,
    trailLength: 1.5,
    ...overrides,
  };
}

describe('noteFlightRecord', () => {
  it('maps higher MIDI pitches to higher vertical flight positions', () => {
    const low = noteFlightRecord(note({ pitch: 48 }), 2);
    const high = noteFlightRecord(note({ id: 'note-72', pitch: 72 }), 2);

    expect(high.position[1]).toBeGreaterThan(low.position[1]);
  });

  it('places stable track identities in distinct canyon lanes', () => {
    const alpha = noteFlightRecord(note({ trackId: 'track-alpha' }), 2);
    const beta = noteFlightRecord(note({ trackId: 'track-beta' }), 2);
    const gamma = noteFlightRecord(note({ trackId: 'track-gamma' }), 2);

    expect(new Set([alpha.position[0], beta.position[0], gamma.position[0]])).toHaveLength(3);
    expect([alpha, beta, gamma].every((record) => Math.abs(record.position[0]) < 4.5)).toBe(true);
  });

  it('gives higher velocity notes more energy', () => {
    const quiet = noteFlightRecord(note({ velocity: 0.2 }), 2);
    const loud = noteFlightRecord(note({ velocity: 0.9 }), 2);

    expect(loud.energy).toBeGreaterThan(quiet.energy);
  });

  it('gives longer notes longer bounded trails', () => {
    const short = noteFlightRecord(note({ durationSeconds: 0.25 }), 2);
    const long = noteFlightRecord(note({ durationSeconds: 5 }), 2);

    expect(long.trailLength).toBeGreaterThan(short.trailLength);
    expect(long.trailLength).toBeLessThanOrEqual(6);
  });

  it('reconstructs the same record for direct seeks at the same logical time', () => {
    const sustained = note({ durationSeconds: 4, velocity: 0.8 });

    expect(noteFlightRecord(sustained, 3)).toEqual(noteFlightRecord(sustained, 3));
  });

  it('renders an active note materially brighter than the same future note', () => {
    const future = noteFlightRenderStyle(noteFlightRecord(note({ velocity: 0.8 }), 1));
    const active = noteFlightRenderStyle(noteFlightRecord(note({ velocity: 0.8 }), 2.25));

    expect(active.brightness).toBeGreaterThan(future.brightness * 3);
    expect(Math.max(...active.rgb)).toBeGreaterThan(Math.max(...future.rgb) * 3);
  });

  it('keeps trails short and only emits them while the note is active', () => {
    const future = noteFlightRenderStyle(noteFlightRecord(note({ durationSeconds: 6 }), 1));
    const active = noteFlightRenderStyle(noteFlightRecord(note({ durationSeconds: 6 }), 3));
    const released = noteFlightRenderStyle(noteFlightRecord(note({ durationSeconds: 1 }), 4));

    expect(future.trailLength).toBe(0);
    expect(released.trailLength).toBe(0);
    expect(active.trailLength).toBeGreaterThan(0);
    expect(active.trailLength).toBeLessThanOrEqual(2.2);
  });

  it('builds a bounded renderer batch with trails only for active notes', () => {
    const records = [
      noteFlightRecord(note({ id: 'past', startSeconds: 0, durationSeconds: 1 }), 3),
      noteFlightRecord(note({ id: 'active', startSeconds: 2, durationSeconds: 4 }), 3),
      noteFlightRecord(note({ id: 'future', startSeconds: 6, durationSeconds: 1 }), 3),
    ];
    const batch = noteFlightRenderBatch(records);

    expect(batch.notes).toHaveLength(3);
    expect(batch.activeNotes.map(({ record }) => record.noteId)).toEqual(['active']);
    expect(batch.trails.map(({ record }) => record.noteId)).toEqual(['active']);
    expect(batch.trails[0].style.trailLength).toBeLessThanOrEqual(2.2);
  });
});
