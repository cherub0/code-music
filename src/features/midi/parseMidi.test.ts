import { Midi } from '@tonejs/midi';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseMidi } from './parseMidi';

function readFixtureBytes(): ArrayBuffer {
  return Uint8Array.from(readFileSync('src/test/fixtures/simple.mid')).buffer as ArrayBuffer;
}

function bytesFromMidi(midi: Midi): ArrayBuffer {
  return Uint8Array.from(midi.toArray()).buffer as ArrayBuffer;
}

describe('parseMidi', () => {
  it('normalizes fixture notes into seconds and stable IDs', () => {
    // simple.mid is one 120 BPM bar: C4 starts at 0s (velocity 0.35), then
    // E4 starts at 0.5s (velocity 0.8). Each note lasts 0.25s.
    const score = parseMidi(readFixtureBytes());

    expect(score.notes.map(({ pitch, startSeconds }) => ({ pitch, startSeconds }))).toEqual([
      { pitch: 60, startSeconds: 0 },
      { pitch: 64, startSeconds: 0.5 },
    ]);
    expect(score.notes[0].id).toBe('track-0:note-0');
    expect(score.durationSeconds).toBe(0.75);
    expect(score.tracks).toEqual([
      {
        id: 'track-0',
        name: 'Simple piano',
        instrument: { family: 'piano', name: 'acoustic grand piano', number: 0, percussion: false },
      },
    ]);
  });

  it('rejects a MIDI with no playable notes', () => {
    const emptyMidiBytes = bytesFromMidi(new Midi());

    expect(() => parseMidi(emptyMidiBytes)).toThrow('MIDI 中没有可播放的音符');
  });

  it('clamps velocity and gives zero-length notes a visible duration', () => {
    const midi = new Midi();
    midi.header.setTempo(120);
    midi.addTrack().addNote({ midi: 60, time: 0, duration: 0, velocity: 2 });

    expect(parseMidi(bytesFromMidi(midi)).notes[0]).toMatchObject({
      velocity: 1,
      durationSeconds: 0.01,
    });
  });
});
