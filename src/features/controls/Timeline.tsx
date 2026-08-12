import { useEffect, useRef } from 'react';
import type { TransportState } from '../transport/useTransport';

type TimelineProps = {
  currentTime: number;
  duration: number;
  state: TransportState;
  onPause: () => void;
  onPlay: () => void;
  onSeek: (seconds: number) => void;
};

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return '--:--';
  const wholeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(wholeSeconds / 60).toString().padStart(2, '0');
  const remainder = (wholeSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
}

export function Timeline({ currentTime, duration, state, onPause, onPlay, onSeek }: TimelineProps) {
  const wasPlayingRef = useRef(false);
  const draggingRef = useRef(false);
  const pendingTimeRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const flushSeek = () => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (pendingTimeRef.current !== null) {
      onSeek(pendingTimeRef.current);
      pendingTimeRef.current = null;
    }
  };

  const scheduleSeek = (seconds: number) => {
    pendingTimeRef.current = seconds;
    if (timeoutRef.current === null) {
      timeoutRef.current = window.setTimeout(flushSeek, 16);
    }
  };

  useEffect(() => () => {
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
  }, []);

  return (
    <section aria-label="Playback timeline" className="timeline-placeholder">
      <span>{formatTime(currentTime)}</span>
      <input
        aria-label="Timeline position"
        className="timeline-slider"
        disabled={duration <= 0}
        max={Math.max(0, duration)}
        min="0"
        step="0.01"
        type="range"
        value={Math.min(currentTime, Math.max(0, duration))}
        onChange={(event) => scheduleSeek(Number(event.currentTarget.value))}
        onPointerDown={() => {
          draggingRef.current = true;
          wasPlayingRef.current = state === 'playing';
          if (wasPlayingRef.current) onPause();
        }}
        onPointerMove={(event) => {
          if (draggingRef.current) scheduleSeek(Number(event.currentTarget.value));
        }}
        onPointerUp={() => {
          if (!draggingRef.current) return;
          flushSeek();
          draggingRef.current = false;
          if (wasPlayingRef.current) onPlay();
          wasPlayingRef.current = false;
        }}
      />
      <span>{formatTime(duration)}</span>
    </section>
  );
}
