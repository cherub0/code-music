import { useEffect, useMemo, useRef, useState } from 'react';
import { ControlPanel } from '../features/controls/ControlPanel';
import { Timeline } from '../features/controls/Timeline';
import { FilePanel } from '../features/files/FilePanel';
import { validateAudioFile, validateMidiFile } from '../features/files/fileTypes';
import { readMidiBytes } from '../features/files/loadLocal';
import { parseMidi } from '../features/midi/parseMidi';
import type { NormalizedScore } from '../features/midi/types';
import { DEFAULT_LAYOUT_OPTIONS, layoutScore } from '../features/score/layout';
import { HologramStage } from '../features/stage/HologramStage';
import { logicalTime } from '../features/transport/clock';
import { useTransport } from '../features/transport/useTransport';
import { useAppStore } from '../store/useAppStore';

function metadataFrom(file: File) {
  return { name: file.name, size: file.size, type: file.type };
}

function createAudioUrl(file: File): string | null {
  return typeof URL.createObjectURL === 'function' ? URL.createObjectURL(file) : null;
}

function midiSummaryFrom(score: NormalizedScore): string {
  return `MIDI 摘要：${score.tracks.length} 个音轨 · ${score.notes.length} 个音符 · ${score.durationSeconds.toFixed(2)} 秒`;
}

export function App() {
  const audio = useAppStore((state) => state.audio);
  const midi = useAppStore((state) => state.midi);
  const offsetSeconds = useAppStore((state) => state.offsetSeconds);
  const speed = useAppStore((state) => state.speed);
  const setAudio = useAppStore((state) => state.setAudio);
  const setMidi = useAppStore((state) => state.setMidi);
  const setOffsetSeconds = useAppStore((state) => state.setOffsetSeconds);
  const setSpeed = useAppStore((state) => state.setSpeed);
  const audioFileRef = useRef<File | null>(null);
  const midiFileRef = useRef<File | null>(null);
  const midiRequestRef = useRef(0);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [midiError, setMidiError] = useState<string | null>(null);
  const [midiScore, setMidiScore] = useState<NormalizedScore | null>(null);
  const transport = useTransport(audioUrl);
  const [sampledAudioTime, setSampledAudioTime] = useState(() => transport.currentTime);
  const scoreLayout = useMemo(
    () => midiScore ? layoutScore(midiScore, DEFAULT_LAYOUT_OPTIONS) : null,
    [midiScore],
  );

  useEffect(() => () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  useEffect(() => {
    transport.setSpeed(speed);
  }, [speed, transport.setSpeed]);

  useEffect(() => {
    let animationFrame = 0;
    const sampleClock = () => {
      setSampledAudioTime(transport.audioElement.currentTime || 0);
      animationFrame = requestAnimationFrame(sampleClock);
    };
    sampleClock();
    return () => cancelAnimationFrame(animationFrame);
  }, [transport.audioElement]);

  const handleAudioSelected = (file: File) => {
    const result = validateAudioFile(file);
    if (!result.ok) {
      setAudioError(result.message);
      return;
    }

    audioFileRef.current = file;
    setAudio(metadataFrom(file));
    setAudioUrl(createAudioUrl(file));
    setAudioError(null);
  };

  const handleMidiSelected = async (file: File) => {
    const requestId = ++midiRequestRef.current;
    const result = validateMidiFile(file);
    if (!result.ok) {
      setMidiError(result.message);
      return;
    }

    try {
      const score = parseMidi(await readMidiBytes(file));
      if (midiRequestRef.current !== requestId) return;

      midiFileRef.current = file;
      setMidi(metadataFrom(file));
      setMidiScore(score);
      setMidiError(null);
    } catch (error) {
      if (midiRequestRef.current !== requestId) return;
      setMidiError(error instanceof Error ? error.message : 'MIDI 文件无法解析，请重新选择。');
    }
  };

  const canInitialize = audio !== null && midi !== null && midiScore !== null;
  const performanceTime = logicalTime(sampledAudioTime, offsetSeconds, speed);

  return (
    <main className="app-shell">
      <aside className="control-panel" aria-label="文件和演出控制">
        <FilePanel
          audioName={audio?.name ?? null}
          midiName={midi?.name ?? null}
          audioError={audioError}
          midiError={midiError}
          midiSummary={midiScore ? midiSummaryFrom(midiScore) : null}
          onAudioSelected={handleAudioSelected}
          onMidiSelected={handleMidiSelected}
        />
        <ControlPanel
          offsetSeconds={offsetSeconds}
          speed={speed}
          transportState={transport.state}
          onOffsetChange={setOffsetSeconds}
          onSpeedChange={setSpeed}
          onTogglePlayback={() => {
            if (transport.state === 'playing') transport.pause();
            else void transport.play();
          }}
        />
        <button className="primary-action" disabled={!canInitialize} type="button">
          启动演出
        </button>
        <button className="secondary-action" disabled type="button">
          导出视频（即将推出）
        </button>
      </aside>

      {scoreLayout ? (
        <section aria-label="Holographic performance stage" className="stage-view">
          <HologramStage score={scoreLayout} logicalTime={performanceTime} quality="preview" />
          <p className="stage-hud" aria-label="Logical performance time">
            LIVE / {performanceTime.toFixed(2)}s
          </p>
        </section>
      ) : (
        <section aria-labelledby="stage-title" className="stage-placeholder">
          <p className="eyebrow">STAGE / STANDBY</p>
          <h2 id="stage-title">等待本地音频与 MIDI</h2>
          <p>选择两个有效文件后即可初始化演出预览。</p>
          <p aria-label="Logical performance time">Logical time: {performanceTime.toFixed(2)}s</p>
        </section>
      )}

      <Timeline
        currentTime={transport.currentTime}
        duration={transport.duration}
        state={transport.state}
        onPause={transport.pause}
        onPlay={() => void transport.play()}
        onSeek={transport.seek}
      />
    </main>
  );
}
