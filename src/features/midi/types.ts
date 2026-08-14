export type ScoreInstrument = {
  family: string;
  name: string;
  number: number;
  percussion: boolean;
};

export type ScoreTrack = {
  id: string;
  name: string;
  instrument: ScoreInstrument;
};

export type NoteEvent = {
  id: string;
  trackId: string;
  pitch: number;
  velocity: number;
  startSeconds: number;
  durationSeconds: number;
};

export type NormalizedScore = {
  durationSeconds: number;
  notes: NoteEvent[];
  tracks: ScoreTrack[];
};
