import { create } from 'zustand';

export type FileMetadata = {
  name: string;
  size: number;
  type: string;
};

export type ExportResolution = '720p' | '1080p';

export type ExportLock = {
  frameRate: number;
  height: number;
  offsetSeconds: number;
  quality: 'export-720p' | 'export-1080p';
  resolution: ExportResolution;
  seed: number;
  speed: number;
  width: number;
};

export type ExportLockOptions = Omit<ExportLock, 'offsetSeconds' | 'speed'>;

function clampFinite(value: number, minimum: number, maximum: number): number | null {
  if (!Number.isFinite(value)) return null;
  return Math.min(maximum, Math.max(minimum, value));
}

type AppStore = {
  audio: FileMetadata | null;
  exportLock: ExportLock | null;
  midi: FileMetadata | null;
  offsetSeconds: number;
  speed: number;
  beginExport: (options: ExportLockOptions) => ExportLock;
  finishExport: () => void;
  setAudio: (audio: FileMetadata | null) => void;
  setMidi: (midi: FileMetadata | null) => void;
  setOffsetSeconds: (offsetSeconds: number) => void;
  setSpeed: (speed: number) => void;
};

export const useAppStore = create<AppStore>((set, get) => ({
  audio: null,
  exportLock: null,
  midi: null,
  offsetSeconds: 0,
  speed: 1,
  beginExport: (options) => {
    const existing = get().exportLock;
    if (existing) return existing;
    const lock = {
      ...options,
      offsetSeconds: get().offsetSeconds,
      speed: get().speed,
    };
    set({ exportLock: lock });
    return lock;
  },
  finishExport: () => set({ exportLock: null }),
  setAudio: (audio) => {
    if (!get().exportLock) set({ audio });
  },
  setMidi: (midi) => {
    if (!get().exportLock) set({ midi });
  },
  setOffsetSeconds: (offsetSeconds) => {
    if (get().exportLock) return;
    const boundedOffset = clampFinite(offsetSeconds, -10, 10);
    if (boundedOffset !== null) set({ offsetSeconds: boundedOffset });
  },
  setSpeed: (speed) => {
    if (get().exportLock) return;
    const boundedSpeed = clampFinite(speed, 0.5, 2);
    if (boundedSpeed !== null) set({ speed: boundedSpeed });
  },
}));
