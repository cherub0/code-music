import { create } from 'zustand';

export type FileMetadata = {
  name: string;
  size: number;
  type: string;
};

type AppStore = {
  audio: FileMetadata | null;
  midi: FileMetadata | null;
  setAudio: (audio: FileMetadata | null) => void;
  setMidi: (midi: FileMetadata | null) => void;
};

export const useAppStore = create<AppStore>((set) => ({
  audio: null,
  midi: null,
  setAudio: (audio) => set({ audio }),
  setMidi: (midi) => set({ midi }),
}));
