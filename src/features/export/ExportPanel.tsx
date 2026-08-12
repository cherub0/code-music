import { useEffect, useRef, useState } from 'react';
import type { ExportCapabilities } from './capabilities';
import { ExportCancelled, recordWebm, type RecordOptions } from './recordWebm';
import { transcodeMp4 } from './transcodeMp4';
import type { ExportLockOptions, ExportResolution } from '../../store/useAppStore';

type ExportFormat = 'webm' | 'mp4';
type ExportPhase = 'idle' | 'capture' | 'transcode' | 'complete' | 'cancelled' | 'error';

export type PreparedExport = {
  audio: HTMLAudioElement;
  canvas: HTMLCanvasElement;
  onFrame?: (audioTimeSeconds: number) => void;
};

type ExportPanelProps = {
  audioName: string | null;
  capabilities: ExportCapabilities;
  durationSeconds: number;
  onPrepare: (settings: ExportLockOptions, signal: AbortSignal) => Promise<PreparedExport>;
  onRestore: () => void | Promise<void>;
  ready: boolean;
  record?: (options: RecordOptions) => Promise<Blob>;
  seed?: number;
  transcode?: typeof transcodeMp4;
};

type Download = {
  filename: string;
  url: string;
};

const RESOLUTIONS: Record<ExportResolution, { height: number; width: number }> = {
  '720p': { height: 720, width: 1280 },
  '1080p': { height: 1080, width: 1920 },
};

function safeBaseName(name: string | null): string {
  const withoutExtension = (name ?? 'holographic-performance').replace(/\.[^.]+$/, '');
  return withoutExtension
    .normalize('NFKD')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'holographic-performance';
}

function timestamp(now = new Date()): string {
  return now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, '');
}

function exportFilename(audioName: string | null, resolution: ExportResolution, extension: ExportFormat) {
  return `${safeBaseName(audioName)}-${resolution}-${timestamp()}.${extension}`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'The export failed unexpectedly.';
}

export function ExportPanel({
  audioName,
  capabilities,
  durationSeconds,
  onPrepare,
  onRestore,
  ready,
  record = recordWebm,
  seed = 0x48f1a3,
  transcode = transcodeMp4,
}: ExportPanelProps) {
  const abortRef = useRef<AbortController | null>(null);
  const ownedUrlsRef = useRef<string[]>([]);
  const [download, setDownload] = useState<Download | null>(null);
  const [fallback, setFallback] = useState<Download | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [format, setFormat] = useState<ExportFormat>('webm');
  const [phase, setPhase] = useState<ExportPhase>('idle');
  const [progress, setProgress] = useState(0);
  const [resolution, setResolution] = useState<ExportResolution>('720p');
  const active = phase === 'capture' || phase === 'transcode';

  useEffect(() => () => {
    abortRef.current?.abort();
    if (typeof URL.revokeObjectURL === 'function') {
      ownedUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    }
  }, []);

  const replaceResults = () => {
    if (typeof URL.revokeObjectURL === 'function') {
      ownedUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    }
    ownedUrlsRef.current = [];
    setDownload(null);
    setFallback(null);
  };

  const downloadable = (blob: Blob, filename: string): Download => {
    const url = URL.createObjectURL(blob);
    ownedUrlsRef.current.push(url);
    return { filename, url };
  };

  const startExport = async () => {
    const controller = new AbortController();
    abortRef.current = controller;
    replaceResults();
    setError(null);
    setProgress(0);
    setPhase('capture');
    const dimensions = RESOLUTIONS[resolution];
    const settings: ExportLockOptions = {
      ...dimensions,
      frameRate: 30,
      quality: resolution === '720p' ? 'export-720p' : 'export-1080p',
      resolution,
      seed,
    };

    try {
      const prepared = await onPrepare(settings, controller.signal);
      const webm = await record({
        ...prepared,
        durationSeconds,
        frameRate: settings.frameRate,
        mimeType: capabilities.mimeType ?? undefined,
        onProgress: setProgress,
        signal: controller.signal,
      });
      const webmDownload = downloadable(webm, exportFilename(audioName, resolution, 'webm'));

      if (format === 'webm') {
        setDownload(webmDownload);
        setPhase('complete');
        return;
      }

      setFallback(webmDownload);
      setProgress(0);
      setPhase('transcode');
      try {
        const mp4 = await transcode(webm, setProgress, controller.signal);
        setDownload(downloadable(mp4, exportFilename(audioName, resolution, 'mp4')));
        setPhase('complete');
      } catch (transcodeError) {
        if (transcodeError instanceof ExportCancelled || controller.signal.aborted) throw transcodeError;
        setError(`MP4 conversion failed: ${errorMessage(transcodeError)} The captured WebM is still available.`);
        setPhase('error');
      }
    } catch (exportError) {
      if (exportError instanceof ExportCancelled || controller.signal.aborted) {
        setPhase('cancelled');
      } else {
        setError(`${errorMessage(exportError)} Try 720p or close other GPU-heavy tabs, then retry.`);
        setPhase('error');
      }
    } finally {
      abortRef.current = null;
      await onRestore();
    }
  };

  const supportMessage = !capabilities.webm
    ? 'WebM export is unavailable: this browser needs canvas capture, MediaRecorder with WebM/Opus, and Web Audio capture.'
    : !ready
      ? 'Load both local audio and MIDI before exporting.'
      : null;

  return (
    <section aria-label="Video export" className="export-panel">
      <h2>Video export</h2>
      <p className="control-hint">实时导出：the stage renders from time zero against the capture audio clock. Files stay in this browser.</p>
      <label className="control-field">
        Export resolution
        <select
          aria-label="Export resolution"
          disabled={active}
          value={resolution}
          onChange={(event) => setResolution(event.currentTarget.value as ExportResolution)}
        >
          <option value="720p">1280 × 720</option>
          <option value="1080p">1920 × 1080</option>
        </select>
      </label>
      <label className="control-field">
        Export format
        <select
          aria-label="Export format"
          disabled={active}
          value={format}
          onChange={(event) => setFormat(event.currentTarget.value as ExportFormat)}
        >
          <option value="webm">WebM (video + audio)</option>
          <option disabled={!capabilities.mp4} value="mp4">MP4 (lazy FFmpeg conversion)</option>
        </select>
      </label>
      {supportMessage ? <p className="control-hint">{supportMessage}</p> : null}
      <button
        className="secondary-action"
        disabled={!ready || !capabilities.webm || active}
        type="button"
        onClick={() => void startExport()}
      >
        Start export
      </button>
      {active ? (
        <>
          <p aria-live="polite" className="control-hint">
            {phase === 'capture' ? 'Capture phase' : 'MP4 transcode phase'} · {Math.round(progress * 100)}%
          </p>
          <progress aria-label="Export progress" max="1" value={progress} />
          <button className="secondary-action" type="button" onClick={() => abortRef.current?.abort()}>
            Cancel export
          </button>
        </>
      ) : null}
      {phase === 'cancelled' ? <p role="status">Export cancelled. Preview restored; start again when ready.</p> : null}
      {error ? <p className="input-error" role="alert">{error}</p> : null}
      {download ? (
        <a className="download-action" download={download.filename} href={download.url}>
          Download {download.filename.endsWith('.mp4') ? 'MP4' : 'WebM'}
        </a>
      ) : null}
      {fallback ? <a className="download-action" download={fallback.filename} href={fallback.url}>Download WebM fallback</a> : null}
    </section>
  );
}
