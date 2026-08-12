import { create } from 'zustand';

export type FileMetadata = {
  name: string;
  size: number;
  type: string;
};

function clampFinite(value: number, minimum: number, maximum: number): number | null {
  if (!Number.isFinite(value)) return null;
  return Math.min(maximum, Math.max(minimum, value));
}

type AppStore = {
  audio: FileMetadata | null;
  midi: FileMetadata | null;
  offsetSeconds: number;
  speed: number;
  setAudio: (audio: FileMetadata | null) => void;
  setMidi: (midi: FileMetadata | null) => void;
  setOffsetSeconds: (offsetSeconds: number) => void;
  setSpeed: (speed: number) => void;
};

export const useAppStore = create<AppStore>((set) => ({
  audio: null,
  midi: null,
  offsetSeconds: 0,
  speed: 1,
  setAudio: (audio) => set({ audio }),
  setMidi: (midi) => set({ midi }),
  setOffsetSeconds: (offsetSeconds) => {
    const boundedOffset = clampFinite(offsetSeconds, -10, 10);
    if (boundedOffset !== null) set({ offsetSeconds: boundedOffset });
  },
  setSpeed: (speed) => {
    const boundedSpeed = clampFinite(speed, 0.5, 2);
    if (boundedSpeed !== null) set({ speed: boundedSpeed });
  },
}));
