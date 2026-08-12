import { useCallback, useEffect, useRef, useState } from 'react';

export type TransportState = 'idle' | 'paused' | 'playing' | 'ended' | 'error';

export type TransportController = {
  state: TransportState;
  duration: number;
  currentTime: number;
  speed: number;
  play: () => Promise<void>;
  pause: () => void;
  seek: (seconds: number) => void;
  setSpeed: (speed: number) => void;
  audioElement: HTMLAudioElement;
};

function readableDuration(audio: HTMLAudioElement): number {
  return Number.isFinite(audio.duration) ? audio.duration : 0;
}

export function useTransport(audioUrl: string | null): TransportController {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeAudioUrlRef = useRef(audioUrl);
  activeAudioUrlRef.current = audioUrl;
  if (audioRef.current === null) audioRef.current = new Audio();
  const audioElement = audioRef.current;
  const [state, setState] = useState<TransportState>('idle');
  const [duration, setDuration] = useState(() => readableDuration(audioElement));
  const [currentTime, setCurrentTime] = useState(() => audioElement.currentTime || 0);
  const [speed, setSpeedState] = useState(1);

  useEffect(() => {
    const updateTime = () => setCurrentTime(audioElement.currentTime || 0);
    const updateDuration = () => setDuration(readableDuration(audioElement));
    const markEnded = () => {
      updateTime();
      setState('ended');
    };
    const markError = () => setState('error');

    audioElement.addEventListener('timeupdate', updateTime);
    audioElement.addEventListener('durationchange', updateDuration);
    audioElement.addEventListener('ended', markEnded);
    audioElement.addEventListener('error', markError);

    return () => {
      audioElement.removeEventListener('timeupdate', updateTime);
      audioElement.removeEventListener('durationchange', updateDuration);
      audioElement.removeEventListener('ended', markEnded);
      audioElement.removeEventListener('error', markError);
      if (activeAudioUrlRef.current) audioElement.pause();
    };
  }, [audioElement]);

  useEffect(() => {
    if (audioUrl) audioElement.pause();
    audioElement.currentTime = 0;
    audioElement.src = audioUrl ?? '';
    if (audioUrl) audioElement.load();
    setCurrentTime(0);
    setDuration(readableDuration(audioElement));
    setState(audioUrl ? 'paused' : 'idle');
  }, [audioElement, audioUrl]);

  const play = useCallback(async () => {
    if (!audioUrl) return;

    try {
      await audioElement.play();
      setState('playing');
    } catch {
      setState('error');
    }
  }, [audioElement, audioUrl]);

  const pause = useCallback(() => {
    audioElement.pause();
    if (audioUrl) setState('paused');
  }, [audioElement, audioUrl]);

  const seek = useCallback((seconds: number) => {
    const maximum = readableDuration(audioElement);
    const target = Math.max(0, maximum > 0 ? Math.min(seconds, maximum) : seconds);
    audioElement.currentTime = target;
    setCurrentTime(target);
  }, [audioElement]);

  const setSpeed = useCallback((nextSpeed: number) => {
    setSpeedState(nextSpeed);
  }, []);

  return { state, duration, currentTime, speed, play, pause, seek, setSpeed, audioElement };
}
