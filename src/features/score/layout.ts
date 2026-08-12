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

type IntervalNode = {
  left: IntervalNode | null;
  maxEnd: number;
  note: PositionedNote;
  right: IntervalNode | null;
};

const intervalIndexes = new WeakMap<ScoreLayout, IntervalNode | null>();

function noteEnd(note: PositionedNote): number {
  return note.startSeconds + Math.max(0, note.durationSeconds);
}

function buildIntervalIndex(notes: PositionedNote[], start = 0, end = notes.length): IntervalNode | null {
  if (start >= end) return null;
  const middle = start + Math.floor((end - start) / 2);
  const left = buildIntervalIndex(notes, start, middle);
  const right = buildIntervalIndex(notes, middle + 1, end);
  const note = notes[middle];
  return {
    left,
    maxEnd: Math.max(noteEnd(note), left?.maxEnd ?? -Infinity, right?.maxEnd ?? -Infinity),
    note,
    right,
  };
}

function intervalIndexFor(layout: ScoreLayout): IntervalNode | null {
  if (!intervalIndexes.has(layout)) intervalIndexes.set(layout, buildIntervalIndex(layout.notes));
  return intervalIndexes.get(layout) ?? null;
}

function collectOverlaps(
  node: IntervalNode | null,
  windowStart: number,
  windowEnd: number,
  matches: PositionedNote[],
): void {
  if (!node || node.maxEnd < windowStart) return;
  collectOverlaps(node.left, windowStart, windowEnd, matches);
  if (node.note.startSeconds <= windowEnd && noteEnd(node.note) >= windowStart) {
    matches.push(node.note);
  }
  if (node.note.startSeconds <= windowEnd) {
    collectOverlaps(node.right, windowStart, windowEnd, matches);
  }
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

  const layout = {
    durationSeconds: score.durationSeconds,
    notes,
    tracks: score.tracks,
  };
  intervalIndexes.set(layout, buildIntervalIndex(notes));
  return layout;
}

export function visibleNotes(
  layout: ScoreLayout,
  time: number,
  windowSeconds: number,
): PositionedNote[] {
  const halfWindow = Math.max(0, windowSeconds);
  const windowStart = time - halfWindow;
  const windowEnd = time + halfWindow;
  const matches: PositionedNote[] = [];
  collectOverlaps(intervalIndexFor(layout), windowStart, windowEnd, matches);
  return matches;
}
