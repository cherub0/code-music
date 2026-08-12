import { create } from 'zustand';

export type FileMetadata = {
  name: string;
  size: number;
  type: string;
};

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
  setOffsetSeconds: (offsetSeconds) => set({ offsetSeconds }),
  setSpeed: (speed) => set({ speed }),
}));
