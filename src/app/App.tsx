import { useEffect, useMemo, useRef, useState } from 'react';
import { ControlPanel, type PreviewQuality } from '../features/controls/ControlPanel';
import { Timeline } from '../features/controls/Timeline';
import { detectExportCapabilities } from '../features/export/capabilities';
import { ExportPanel, type PreparedExport } from '../features/export/ExportPanel';
import { ExportCancelled } from '../features/export/recordWebm';
import { FilePanel } from '../features/files/FilePanel';
import { validateAudioFile, validateMidiFile } from '../features/files/fileTypes';
import { readMidiBytes } from '../features/files/loadLocal';
import { parseMidi } from '../features/midi/parseMidi';
import type { NormalizedScore } from '../features/midi/types';
import { DEFAULT_LAYOUT_OPTIONS, layoutScore } from '../features/score/layout';
import { HologramStage } from '../features/stage/HologramStage';
import { logicalTime } from '../features/transport/clock';
import { useTransport } from '../features/transport/useTransport';
import { useAppStore, type ExportLockOptions } from '../store/useAppStore';

const DEFAULT_STAGE_SEED = 0x48f1a3;
const MINIMUM_PREVIEW_FPS = 45;
const SLOW_FRAME_LIMIT = 120;

export type DemoManifest = {
  title: string;
  audioUrl: string;
  midiUrl: string;
  offsetSeconds: number;
  speed: number;
  seed: number;
}[];

function metadataFrom(file: File) {
  return { name: file.name, size: file.size, type: file.type };
}

function createAudioUrl(source: Blob): string | null {
  return typeof URL.createObjectURL === 'function' ? URL.createObjectURL(source) : null;
}

function midiSummaryFrom(score: NormalizedScore): string {
  return `MIDI 摘要：${score.tracks.length} 个音轨 · ${score.notes.length} 个音符 · ${score.durationSeconds.toFixed(2)} 秒`;
}

function fileNameFromUrl(url: string): string {
  return url.split('/').filter(Boolean).at(-1) ?? url;
}

async function checkedFetch(url: string): Promise<Response> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load ${url}.`);
  return response;
}

function mismatchMessage(audioDuration: number, midiDuration: number): string | null {
  if (audioDuration <= 0 || midiDuration <= 0) return null;
  const difference = Math.abs(audioDuration - midiDuration);
  const threshold = Math.max(10, Math.max(audioDuration, midiDuration) * 0.15);
  if (difference <= threshold) return null;

  return `Audio and MIDI durations differ by ${difference.toFixed(1)} seconds. Playback remains available; replace the audio or MIDI file, or adjust calibration if they are intentionally different.`;
}

function recoveryForMidiError(error: unknown): { message: string; recovery: string } {
  const message = error instanceof Error ? error.message : 'MIDI 文件无法解析。';
  if (message.includes('没有可播放的音符')) {
    return { message, recovery: 'Choose a MIDI file with at least one note.' };
  }
  return { message, recovery: 'Choose another MIDI file and try again.' };
}

export async function waitForCanvasSize(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  signal: AbortSignal,
  maximumFrames = 120,
): Promise<boolean> {
  for (let frame = 0; frame < maximumFrames; frame += 1) {
    if (signal.aborted) throw new ExportCancelled();
    if (canvas.width === width && canvas.height === height) return true;
    await new Promise<void>((resolve, reject) => {
      let animationFrame = 0;
      let settled = false;
      const cleanup = () => signal.removeEventListener('abort', handleAbort);
      const handleAbort = () => {
        if (settled) return;
        settled = true;
        cancelAnimationFrame(animationFrame);
        cleanup();
        reject(new ExportCancelled());
      };
      signal.addEventListener('abort', handleAbort, { once: true });
      animationFrame = requestAnimationFrame(() => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve();
      });
      if (signal.aborted) handleAbort();
    });
  }
  if (signal.aborted) throw new ExportCancelled();
  return canvas.width === width && canvas.height === height;
}

export function App() {
  const audio = useAppStore((state) => state.audio);
  const beginExport = useAppStore((state) => state.beginExport);
  const exportLock = useAppStore((state) => state.exportLock);
  const finishExport = useAppStore((state) => state.finishExport);
  const midi = useAppStore((state) => state.midi);
  const offsetSeconds = useAppStore((state) => state.offsetSeconds);
  const speed = useAppStore((state) => state.speed);
  const setAudio = useAppStore((state) => state.setAudio);
  const setMidi = useAppStore((state) => state.setMidi);
  const setOffsetSeconds = useAppStore((state) => state.setOffsetSeconds);
  const setSpeed = useAppStore((state) => state.setSpeed);
  const demoRequestRef = useRef(0);
  const midiRequestRef = useRef(0);
  const previousFrameTimestampRef = useRef<number | null>(null);
  const slowFrameCountRef = useRef(0);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [demoError, setDemoError] = useState<string | null>(null);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoStatus, setDemoStatus] = useState<string | null>(null);
  const [midiError, setMidiError] = useState<string | null>(null);
  const [midiRecovery, setMidiRecovery] = useState<string | null>(null);
  const [midiScore, setMidiScore] = useState<NormalizedScore | null>(null);
  const [previewQuality, setPreviewQuality] = useState<PreviewQuality>('Auto');
  const [autoReduced, setAutoReduced] = useState(false);
  const [performanceInitialized, setPerformanceInitialized] = useState(false);
  const [stageSeed, setStageSeed] = useState(DEFAULT_STAGE_SEED);
  const transport = useTransport(audioUrl, audio?.name ?? null);
  const [sampledAudioTime, setSampledAudioTime] = useState(() => transport.currentTime);
  const [exportAudioTime, setExportAudioTime] = useState(0);
  const exportCapabilities = useMemo(() => detectExportCapabilities(), []);
  const scoreLayout = useMemo(
    () => midiScore ? layoutScore(midiScore, DEFAULT_LAYOUT_OPTIONS) : null,
    [midiScore],
  );
  const durationWarning = useMemo(
    () => mismatchMessage(transport.duration, midiScore?.durationSeconds ?? 0),
    [midiScore?.durationSeconds, transport.duration],
  );
  const resolvedPreviewQuality = previewQuality === 'Low' || (previewQuality === 'Auto' && autoReduced)
    ? 'low'
    : 'high';
  const qualityNotice = previewQuality === 'Auto' && autoReduced
    ? 'Auto switched to Low: bloom resolution and the visible note window were reduced. Select High to restore full preview quality.'
    : previewQuality === 'Low'
      ? 'Low preview quality: bloom resolution and the visible note window are reduced.'
      : null;

  useEffect(() => () => {
    if (audioUrl && typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  useEffect(() => {
    transport.setSpeed(speed);
  }, [speed, transport.setSpeed]);

  useEffect(() => {
    if (transport.error) setPerformanceInitialized(false);
  }, [transport.error]);

  useEffect(() => {
    let animationFrame = 0;
    const sampleClock: FrameRequestCallback = (timestamp) => {
      setSampledAudioTime(transport.audioElement.currentTime || 0);

      if (previewQuality === 'Auto' && !autoReduced) {
        const previousTimestamp = previousFrameTimestampRef.current;
        if (previousTimestamp !== null) {
          if (timestamp - previousTimestamp > 1000 / MINIMUM_PREVIEW_FPS) {
            slowFrameCountRef.current += 1;
            if (slowFrameCountRef.current >= SLOW_FRAME_LIMIT) setAutoReduced(true);
          } else {
            slowFrameCountRef.current = 0;
          }
        }
        previousFrameTimestampRef.current = timestamp;
      }

      animationFrame = requestAnimationFrame(sampleClock);
    };
    animationFrame = requestAnimationFrame(sampleClock);
    return () => cancelAnimationFrame(animationFrame);
  }, [autoReduced, previewQuality, transport.audioElement]);

  const handlePreviewQualityChange = (quality: PreviewQuality) => {
    previousFrameTimestampRef.current = null;
    slowFrameCountRef.current = 0;
    setAutoReduced(false);
    setPreviewQuality(quality);
  };

  const cancelPendingDemo = () => {
    demoRequestRef.current += 1;
    setDemoLoading(false);
  };

  const handleAudioSelected = (file: File) => {
    cancelPendingDemo();
    const result = validateAudioFile(file);
    if (!result.ok) {
      setAudioError(result.message);
      return;
    }

    setAudio(metadataFrom(file));
    setAudioUrl(createAudioUrl(file));
    setPerformanceInitialized(false);
    setAudioError(null);
    setDemoError(null);
    setDemoStatus(null);
    setStageSeed(DEFAULT_STAGE_SEED);
  };

  const handleMidiSelected = async (file: File) => {
    cancelPendingDemo();
    setPerformanceInitialized(false);
    const requestId = ++midiRequestRef.current;
    const result = validateMidiFile(file);
    if (!result.ok) {
      setMidi(null);
      setMidiScore(null);
      setMidiError(result.message);
      setMidiRecovery('Choose another MIDI file and try again.');
      return;
    }

    try {
      const score = parseMidi(await readMidiBytes(file));
      if (midiRequestRef.current !== requestId) return;

      setMidi(metadataFrom(file));
      setMidiScore(score);
      setMidiError(null);
      setMidiRecovery(null);
      setDemoError(null);
      setDemoStatus(null);
      setStageSeed(DEFAULT_STAGE_SEED);
    } catch (error) {
      if (midiRequestRef.current !== requestId) return;
      const recovery = recoveryForMidiError(error);
      setMidi(null);
      setMidiScore(null);
      setMidiError(recovery.message);
      setMidiRecovery(recovery.recovery);
    }
  };

  const handleDemoRequested = async () => {
    const requestId = ++demoRequestRef.current;
    midiRequestRef.current += 1;
    setDemoLoading(true);
    setPerformanceInitialized(false);
    setDemoError(null);
    setDemoStatus(null);

    try {
      const manifestResponse = await checkedFetch('/demo/manifest.json');
      const manifest = await manifestResponse.json() as DemoManifest;
      const demo = manifest[0];
      if (!demo) throw new Error('The demo manifest contains no demo.');

      const [audioResponse, midiResponse] = await Promise.all([
        checkedFetch(demo.audioUrl),
        checkedFetch(demo.midiUrl),
      ]);
      const [audioBlob, midiBytes] = await Promise.all([
        audioResponse.blob(),
        midiResponse.arrayBuffer(),
      ]);
      const score = parseMidi(midiBytes);
      if (demoRequestRef.current !== requestId) return;

      setAudio({
        name: fileNameFromUrl(demo.audioUrl),
        size: audioBlob.size,
        type: audioBlob.type || 'audio/ogg',
      });
      setMidi({
        name: fileNameFromUrl(demo.midiUrl),
        size: midiBytes.byteLength,
        type: 'audio/midi',
      });
      setAudioUrl(createAudioUrl(audioBlob));
      setMidiScore(score);
      setAudioError(null);
      setMidiError(null);
      setMidiRecovery(null);
      setOffsetSeconds(demo.offsetSeconds);
      setSpeed(demo.speed);
      setStageSeed(demo.seed);
      setDemoStatus(`${demo.title} loaded.`);
    } catch (error) {
      if (demoRequestRef.current !== requestId) return;
      const detail = error instanceof Error ? error.message : 'Unknown demo error.';
      setDemoError(`The built-in demo could not be loaded. Check the local demo files and try again. ${detail}`);
    } finally {
      if (demoRequestRef.current === requestId) setDemoLoading(false);
    }
  };

  const canInitialize = audio !== null
    && midi !== null
    && midiScore !== null
    && transport.state !== 'error';
  const performanceReady = performanceInitialized && canInitialize;
  const lockedOffset = exportLock?.offsetSeconds ?? offsetSeconds;
  const lockedSpeed = exportLock?.speed ?? speed;
  const performanceTime = logicalTime(
    exportLock ? exportAudioTime : sampledAudioTime,
    lockedOffset,
    lockedSpeed,
  );

  const prepareExport = async (
    settings: ExportLockOptions,
    signal: AbortSignal,
  ): Promise<PreparedExport> => {
    cancelPendingDemo();
    midiRequestRef.current += 1;
    beginExport(settings);
    setExportAudioTime(0);

    const canvas = document.querySelector<HTMLCanvasElement>('.stage-view canvas');
    if (!canvas) {
      finishExport();
      throw new Error('The stage canvas is not ready. Initialize the performance and try again.');
    }
    if (!await waitForCanvasSize(canvas, settings.width, settings.height, signal)) {
      finishExport();
      throw new Error(`The stage could not switch to ${settings.width} × ${settings.height}. Try again or choose 720p.`);
    }

    return {
      audio: transport.audioElement,
      canvas,
      onFrame: setExportAudioTime,
    };
  };

  return (
    <main className="app-shell">
      <aside className="control-panel" aria-label="文件和演出控制">
        <fieldset className="control-stack" disabled={exportLock !== null}>
          <FilePanel
            audioName={audio?.name ?? null}
            midiName={midi?.name ?? null}
            audioError={audioError ?? transport.error}
            midiError={midiError}
            midiRecovery={midiRecovery}
            midiSummary={midiScore ? midiSummaryFrom(midiScore) : null}
            demoError={demoError}
            demoLoading={demoLoading}
            demoStatus={demoStatus}
            durationWarning={durationWarning}
            onAudioSelected={handleAudioSelected}
            onDemoRequested={() => void handleDemoRequested()}
            onMidiSelected={(file) => void handleMidiSelected(file)}
          />
          <ControlPanel
            offsetSeconds={offsetSeconds}
            performanceEnabled={performanceReady}
            previewQuality={previewQuality}
            qualityNotice={qualityNotice}
            speed={speed}
            transportState={transport.state}
            onOffsetChange={setOffsetSeconds}
            onPreviewQualityChange={handlePreviewQualityChange}
            onSpeedChange={setSpeed}
            onTogglePlayback={() => {
              if (!performanceReady) return;
              if (transport.state === 'playing') transport.pause();
              else void transport.play();
            }}
          />
          <button
            className="primary-action"
            disabled={!canInitialize || performanceInitialized}
            type="button"
            onClick={() => {
              transport.seek(0);
              setSampledAudioTime(0);
              setPerformanceInitialized(true);
            }}
          >
            {performanceInitialized ? '演出已初始化' : '启动演出'}
          </button>
        </fieldset>
        <ExportPanel
          audioName={audio?.name ?? null}
          capabilities={exportCapabilities}
          durationSeconds={transport.duration}
          ready={performanceReady && transport.duration > 0}
          seed={stageSeed}
          onPrepare={prepareExport}
          onRestore={() => {
            setExportAudioTime(0);
            finishExport();
          }}
        />
      </aside>

      {performanceReady && scoreLayout ? (
        <section
          aria-label="Holographic performance stage"
          className="stage-view"
          style={exportLock ? {
            boxSizing: 'content-box',
            height: exportLock.height,
            minHeight: exportLock.height,
            width: exportLock.width,
          } : undefined}
        >
          <HologramStage
            logicalTime={performanceTime}
            previewQuality={resolvedPreviewQuality}
            quality={exportLock?.quality ?? 'preview'}
            score={scoreLayout}
            seed={exportLock?.seed ?? stageSeed}
          />
          <p className="stage-hud" aria-label="Logical performance time">
            LIVE / {performanceTime.toFixed(2)}s
          </p>
        </section>
      ) : (
        <section aria-labelledby="stage-title" className="stage-placeholder">
          <p className="eyebrow">{canInitialize ? 'STAGE / READY' : 'STAGE / STANDBY'}</p>
          <h2 id="stage-title">{canInitialize ? '音频与 MIDI 已就绪' : '等待本地音频与 MIDI'}</h2>
          <p>
            {canInitialize
              ? '点击“启动演出”初始化舞台并启用播放与时间轴。'
              : '选择两个有效文件后即可准备演出预览。'}
          </p>
          <p aria-label="Logical performance time">Logical time: {performanceTime.toFixed(2)}s</p>
        </section>
      )}

      <fieldset className="timeline-control-lock" disabled={exportLock !== null || !performanceReady}>
        <Timeline
          currentTime={transport.currentTime}
          duration={transport.duration}
          state={transport.state}
          onPause={transport.pause}
          onPlay={() => void transport.play()}
          onSeek={transport.seek}
        />
      </fieldset>
    </main>
  );
}
