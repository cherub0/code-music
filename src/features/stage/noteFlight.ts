import type { PositionedNote as ScoreNote } from '../score/layout';

export type NoteFlightRecord = {
  noteId: string;
  active: boolean;
  position: [number, number, number];
  scale: number;
  color: string;
  energy: number;
  trailLength: number;
};

export type NoteFlightRenderStyle = {
  brightness: number;
  rgb: [number, number, number];
  trailLength: number;
};

const SECONDS_TO_WORLD_UNITS = 1.5;
const LANE_POSITIONS = [-2.8, 0, 2.8] as const;
const MIN_PITCH = 36;
const MAX_PITCH = 96;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function trackHash(trackId: string): number {
  let hash = 2166136261;
  for (const character of trackId) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function noteFlightRecord(note: ScoreNote, logicalTime: number): NoteFlightRecord {
  const velocity = clamp(note.velocity, 0, 1);
  const active = logicalTime >= note.startSeconds
    && logicalTime <= note.startSeconds + Math.max(0, note.durationSeconds);
  const pitch = clamp(note.pitch, MIN_PITCH, MAX_PITCH);
  const energy = active ? 0.18 + velocity * 0.82 : velocity * 0.18;

  return {
    noteId: note.id,
    active,
    position: [
      LANE_POSITIONS[trackHash(note.trackId) % LANE_POSITIONS.length],
      ((pitch - MIN_PITCH) / (MAX_PITCH - MIN_PITCH)) * 5.4 - 2.1,
      note.startSeconds * SECONDS_TO_WORLD_UNITS,
    ],
    scale: 0.12 + velocity * 0.18 + (active ? Math.sin((logicalTime - note.startSeconds) * 12) * 0.025 : 0),
    color: active && velocity >= 0.67 ? '#ff4acb' : '#4ef8ff',
    energy,
    trailLength: clamp(Math.max(0, note.durationSeconds) * SECONDS_TO_WORLD_UNITS, 0.2, 6),
  };
}

export function noteFlightRenderStyle(record: NoteFlightRecord): NoteFlightRenderStyle {
  const brightness = record.active
    ? 0.65 + record.energy * 0.85
    : 0.18 + record.energy * 0.35;
  const base: [number, number, number] = record.color === '#ff4acb'
    ? [1, 0.08, 0.62]
    : [0.12, 0.88, 1];
  return {
    brightness,
    rgb: base.map((channel) => channel * brightness) as [number, number, number],
    trailLength: record.active ? Math.min(2.2, record.trailLength) : 0,
  };
}

export function noteFlightRenderBatch(records: NoteFlightRecord[]) {
  const notes = records.map((record) => ({ record, style: noteFlightRenderStyle(record) }));
  return {
    notes,
    activeNotes: notes.filter(({ record }) => record.active),
    activeCyan: notes.filter(({ record }) => record.active && record.color !== '#ff4acb'),
    activeMagenta: notes.filter(({ record }) => record.active && record.color === '#ff4acb'),
    trails: notes.filter(({ style }) => style.trailLength > 0),
  };
}
