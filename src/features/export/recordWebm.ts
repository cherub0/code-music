import { WEBM_MIME_TYPES } from './capabilities';

export class ExportCancelled extends Error {
  override readonly name = 'ExportCancelled';

  constructor() {
    super('Export cancelled.');
  }
}

type AudioContextConstructor = new () => AudioContext;

export type RecordEnvironment = {
  AudioContext: AudioContextConstructor;
  MediaRecorder: typeof MediaRecorder;
  MediaStream: typeof MediaStream;
  cancelAnimationFrame: typeof cancelAnimationFrame;
  createAudioElement: (source: string) => HTMLAudioElement;
  requestAnimationFrame: typeof requestAnimationFrame;
};

export type RecordOptions = {
  audio: HTMLAudioElement;
  canvas: HTMLCanvasElement;
  durationSeconds: number;
  environment?: RecordEnvironment;
  frameRate: number;
  mimeType?: string;
  onFrame?: (audioTimeSeconds: number) => void;
  onProgress?: (ratio: number) => void;
  signal: AbortSignal;
};

function browserEnvironment(): RecordEnvironment {
  const host = globalThis as typeof globalThis & {
    webkitAudioContext?: AudioContextConstructor;
  };
  const AudioContextClass = host.AudioContext ?? host.webkitAudioContext;
  if (!AudioContextClass) throw new Error('Web Audio capture is unavailable in this browser.');

  return {
    AudioContext: AudioContextClass,
    MediaRecorder: host.MediaRecorder,
    MediaStream: host.MediaStream,
    cancelAnimationFrame: host.cancelAnimationFrame.bind(host),
    createAudioElement: (source) => new Audio(source),
    requestAnimationFrame: host.requestAnimationFrame.bind(host),
  };
}

function preferredMimeType(Recorder: typeof MediaRecorder, requested?: string): string {
  if (requested && Recorder.isTypeSupported(requested)) return requested;
  const detected = WEBM_MIME_TYPES.find((candidate) => Recorder.isTypeSupported(candidate));
  if (!detected) throw new Error('This browser cannot record WebM with Opus audio.');
  return detected;
}

function stopRecorder(recorder: MediaRecorder): void {
  if (recorder.state !== 'inactive') recorder.stop();
}

export async function recordWebm({
  audio,
  canvas,
  durationSeconds,
  environment = browserEnvironment(),
  frameRate,
  mimeType: requestedMimeType,
  onFrame = () => undefined,
  onProgress = () => undefined,
  signal,
}: RecordOptions): Promise<Blob> {
  if (!Number.isFinite(frameRate) || frameRate <= 0) throw new Error('Export frame rate must be positive.');

  const previewTime = audio.currentTime || 0;
  const previewWasPlaying = !audio.paused;
  const sourceUrl = audio.currentSrc || audio.src;
  audio.pause();

  let animationFrame = 0;
  let audioContext: AudioContext | null = null;
  let captureAudio: HTMLAudioElement | null = null;
  let destination: MediaStreamAudioDestinationNode | null = null;
  let sourceNode: MediaElementAudioSourceNode | null = null;
  let combinedStream: MediaStream | null = null;
  let videoStream: MediaStream | null = null;

  try {
    videoStream = canvas.captureStream(frameRate);
    captureAudio = environment.createAudioElement(sourceUrl);
    captureAudio.preload = 'auto';
    captureAudio.currentTime = 0;

    audioContext = new environment.AudioContext();
    sourceNode = audioContext.createMediaElementSource(captureAudio);
    destination = audioContext.createMediaStreamDestination();
    sourceNode.connect(destination);

    const videoTracks = videoStream.getVideoTracks();
    const audioTracks = destination.stream.getAudioTracks();
    if (videoTracks.length === 0) throw new Error('The stage canvas did not provide a video track.');
    if (audioTracks.length === 0) throw new Error('Web Audio did not provide an audio track.');

    combinedStream = new environment.MediaStream([...videoTracks, ...audioTracks]);
    const mimeType = preferredMimeType(environment.MediaRecorder, requestedMimeType);
    const recorder = new environment.MediaRecorder(combinedStream, {
      audioBitsPerSecond: 192_000,
      mimeType,
      videoBitsPerSecond: canvas.width >= 1920 ? 12_000_000 : 7_000_000,
    });
    const chunks: Blob[] = [];
    let terminalError: unknown = null;
    let settled = false;

    const recording = new Promise<Blob>((resolve, reject) => {
      const settle = (error?: unknown) => {
        if (settled) return;
        settled = true;
        signal.removeEventListener('abort', handleAbort);
        if (error) reject(error);
        else resolve(new Blob(chunks, { type: mimeType }));
      };
      const finish = (error?: unknown) => {
        terminalError = error ?? terminalError;
        captureAudio?.pause();
        if (recorder.state === 'inactive') settle(terminalError || undefined);
        else stopRecorder(recorder);
      };
      const handleAbort = () => finish(new ExportCancelled());
      const handleEnded = () => {
        onFrame(durationSeconds);
        onProgress(1);
        finish();
      };

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onerror = () => finish(new Error('The browser stopped recording unexpectedly.'));
      recorder.onstop = () => settle(terminalError || undefined);
      captureAudio?.addEventListener('ended', handleEnded, { once: true });
      signal.addEventListener('abort', handleAbort, { once: true });

      const frameDuration = 1000 / frameRate;
      let nextFrameTimestamp = 0;
      const sampleFrame: FrameRequestCallback = (timestamp) => {
        if (settled || signal.aborted) return;
        if (timestamp >= nextFrameTimestamp) {
          const audioTime = captureAudio?.currentTime ?? 0;
          onFrame(audioTime);
          onProgress(durationSeconds > 0 ? Math.min(1, audioTime / durationSeconds) : 0);
          nextFrameTimestamp = timestamp + frameDuration;
        }
        animationFrame = environment.requestAnimationFrame(sampleFrame);
      };

      void (async () => {
        try {
          if (signal.aborted) {
            handleAbort();
            return;
          }
          await audioContext?.resume();
          if (signal.aborted || settled) return;
          recorder.start(1_000);
          onFrame(0);
          onProgress(0);
          animationFrame = environment.requestAnimationFrame(sampleFrame);
          await captureAudio?.play();
        } catch (error) {
          finish(error);
        }
      })();
    });

    return await recording;
  } finally {
    if (animationFrame) environment.cancelAnimationFrame(animationFrame);
    captureAudio?.pause();
    const tracks = new Set<MediaStreamTrack>();
    videoStream?.getTracks().forEach((track) => tracks.add(track));
    destination?.stream.getTracks().forEach((track) => tracks.add(track));
    combinedStream?.getTracks().forEach((track) => tracks.add(track));
    tracks.forEach((track) => track.stop());
    sourceNode?.disconnect();
    destination?.disconnect();
    try {
      await audioContext?.close();
    } catch {
      // Cleanup failure must not mask the capture result or cancellation reason.
    }
    audio.currentTime = previewTime;
    if (previewWasPlaying) {
      try {
        await audio.play();
      } catch {
        // Restoring the absolute preview position is mandatory; autoplay policy may block resume.
      }
    }
  }
}
