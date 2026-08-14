import { Midi } from '@tonejs/midi';
import type { NormalizedScore, NoteEvent, ScoreTrack } from './types';

const MIN_DURATION_SECONDS = 0.01;

function clampVelocity(velocity: number): number {
  return Math.min(1, Math.max(0, velocity));
}

function createTrack(track: Midi['tracks'][number], index: number): ScoreTrack {
  return {
    id: `track-${index}`,
    name: track.name,
    instrument: {
      family: track.instrument.family,
      name: track.instrument.name,
      number: track.instrument.number,
      percussion: track.instrument.percussion,
    },
  };
}

export function parseMidi(bytes: ArrayBuffer): NormalizedScore {
  let midi: Midi;

  try {
    midi = new Midi(bytes);
  } catch {
    throw new Error('MIDI 文件无法解析，请重新选择。');
  }

  const tracks = midi.tracks.map(createTrack);
  const notes: Array<{ event: NoteEvent; sourceIndex: number }> = [];

  midi.tracks.forEach((track, trackIndex) => {
    const trackId = tracks[trackIndex].id;

    track.notes.forEach((note, noteIndex) => {
      notes.push({
        event: {
          id: `${trackId}:note-${noteIndex}`,
          trackId,
          pitch: note.midi,
          velocity: clampVelocity(note.velocity),
          startSeconds: note.time,
          durationSeconds: Math.max(MIN_DURATION_SECONDS, note.duration),
        },
        sourceIndex: notes.length,
      });
    });
  });

  if (notes.length === 0) {
    throw new Error('MIDI 中没有可播放的音符');
  }

  notes.sort((left, right) => (
    left.event.startSeconds - right.event.startSeconds || left.sourceIndex - right.sourceIndex
  ));

  const normalizedNotes = notes.map(({ event }) => event);
  const durationSeconds = normalizedNotes.reduce(
    (latestEnd, note) => Math.max(latestEnd, note.startSeconds + note.durationSeconds),
    0,
  );

  return { durationSeconds, notes: normalizedNotes, tracks };
}
