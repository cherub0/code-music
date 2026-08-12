import { useCallback, useEffect, useRef, useState } from 'react';

export type TransportState = 'idle' | 'paused' | 'playing' | 'ended' | 'error';

export type TransportController = {
  state: TransportState;
  error: string | null;
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

function mediaErrorReason(error: MediaError | null): string {
  if (!error) return '音频加载失败';
  if (error.code === 1) return '音频加载已中止';
  if (error.code === 2) return '浏览器读取音频时发生网络错误';
  if (error.code === 3) return '浏览器无法解码该音频';
  if (error.code === 4) return '浏览器不支持该音频编码或格式';
  return '音频加载失败';
}

function actionableMediaError(
  audioName: string | null,
  error: MediaError | null,
  fallbackDetail?: string,
): string {
  const name = audioName ? `“${audioName}”` : '所选音频';
  const technicalDetail = error?.message || fallbackDetail;
  const detail = technicalDetail ? `（${technicalDetail}）` : '';
  return `${name}加载失败：${mediaErrorReason(error)}${detail}。请更换该音频文件，或重新编码为标准 MP3、WAV 或 OGG 后再试。`;
}

export function useTransport(audioUrl: string | null, audioName: string | null = null): TransportController {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeAudioUrlRef = useRef(audioUrl);
  const activeAudioNameRef = useRef(audioName);
  activeAudioUrlRef.current = audioUrl;
  activeAudioNameRef.current = audioName;
  if (audioRef.current === null) audioRef.current = new Audio();
  const audioElement = audioRef.current;
  const [state, setState] = useState<TransportState>('idle');
  const [error, setError] = useState<string | null>(null);
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
    const markError = () => {
      setError(actionableMediaError(activeAudioNameRef.current, audioElement.error));
      setState('error');
    };

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
    setError(null);
    setCurrentTime(0);
    setDuration(readableDuration(audioElement));
    setState(audioUrl ? 'paused' : 'idle');
  }, [audioElement, audioName, audioUrl]);

  const play = useCallback(async () => {
    if (!audioUrl) return;

    try {
      await audioElement.play();
      setState('playing');
    } catch (playError) {
      const detail = playError instanceof Error ? playError.message : undefined;
      setError(actionableMediaError(audioName, audioElement.error, detail));
      setState('error');
    }
  }, [audioElement, audioName, audioUrl]);

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

  return { state, error, duration, currentTime, speed, play, pause, seek, setSpeed, audioElement };
}
