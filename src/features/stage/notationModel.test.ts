import { describe, expect, it } from 'vitest';
import type { PositionedNote } from '../score/layout';
import { notationForNote } from './notationModel';

const note = (pitch: number, start = 1, duration = 0.5): PositionedNote => ({ id: `${pitch}`, trackId: 'p', pitch, velocity: 0.8, startSeconds: start, durationSeconds: duration, position: { x: 0, y: (pitch - 60) * 0.18, z: start * 1.5 }, glow: 0.8, trailLength: duration * 1.5 });

describe('notation model', () => {
  it('creates a head, stem, and ledger lines for an outside pitch', () => {
    const record = notationForNote(note(84), 1.1);
    expect(record.head.scale).toBeGreaterThan(0);
    expect(record.stem.height).toBeGreaterThan(0);
    expect(record.ledgerYs.length).toBeGreaterThan(0);
  });
  it('keeps sustained notes active and reconstructs direct seeks', () => {
    const sustained = note(60, 1, 3);
    expect(notationForNote(sustained, 2)).toEqual(notationForNote(sustained, 2));
    expect(notationForNote(sustained, 2).activeEnergy).toBeGreaterThan(0);
    expect(notationForNote(sustained, 5).activeEnergy).toBe(0);
  });
});
