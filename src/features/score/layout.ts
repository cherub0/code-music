import type { NormalizedScore, NoteEvent, ScoreTrack } from '../midi/types';

const MIN_VISUAL_VELOCITY = 0.15;
const MAX_VISUAL_VELOCITY = 1;

export type LayoutOptions = {
  pitchBaseline: number;
  semitoneHeight: number;
  secondsToWorldUnits: number;
};

export const DEFAULT_LAYOUT_OPTIONS: LayoutOptions = {
  pitchBaseline: 60,
  semitoneHeight: 0.18,
  secondsToWorldUnits: 1.5,
};

export type PositionedNote = NoteEvent & {
  position: { x: number; y: number; z: number };
  glow: number;
  trailLength: number;
};

export type ScoreLayout = {
  durationSeconds: number;
  notes: PositionedNote[];
  tracks: ScoreTrack[];
};

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function lowerBound(notes: PositionedNote[], target: number): number {
  let low = 0;
  let high = notes.length;

  while (low < high) {
    const middle = low + Math.floor((high - low) / 2);
    if (notes[middle].startSeconds < target) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }

  return low;
}

function upperBound(notes: PositionedNote[], target: number): number {
  let low = 0;
  let high = notes.length;

  while (low < high) {
    const middle = low + Math.floor((high - low) / 2);
    if (notes[middle].startSeconds <= target) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }

  return low;
}

export function layoutScore(score: NormalizedScore, options: LayoutOptions): ScoreLayout {
  const notes = score.notes.map((note) => ({
    ...note,
    position: {
      x: 0,
      y: (note.pitch - options.pitchBaseline) * options.semitoneHeight,
      z: note.startSeconds * options.secondsToWorldUnits,
    },
    glow: clamp(note.velocity, MIN_VISUAL_VELOCITY, MAX_VISUAL_VELOCITY),
    trailLength: note.durationSeconds * options.secondsToWorldUnits,
  }));

  notes.sort((left, right) => left.startSeconds - right.startSeconds);

  return {
    durationSeconds: score.durationSeconds,
    notes,
    tracks: score.tracks,
  };
}

export function visibleNotes(
  layout: ScoreLayout,
  time: number,
  windowSeconds: number,
): PositionedNote[] {
  const halfWindow = Math.max(0, windowSeconds);
  const windowStart = time - halfWindow;
  const windowEnd = time + halfWindow;
  const firstVisible = lowerBound(layout.notes, windowStart);
  const endExclusive = upperBound(layout.notes, windowEnd);

  return layout.notes.slice(firstVisible, endExclusive);
}
