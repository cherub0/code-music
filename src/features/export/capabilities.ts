export const WEBM_MIME_TYPES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
] as const;

export type ExportCapabilities = {
  audio: boolean;
  mimeType: string | null;
  mp4: boolean;
  webm: boolean;
};

type CapabilityHost = {
  AudioContext?: { prototype?: { createMediaStreamDestination?: unknown } };
  HTMLCanvasElement?: { prototype?: { captureStream?: unknown } };
  MediaRecorder?: { isTypeSupported?: (mimeType: string) => boolean };
  WebAssembly?: unknown;
  Worker?: unknown;
  webkitAudioContext?: { prototype?: { createMediaStreamDestination?: unknown } };
};

export function detectExportCapabilities(
  host: CapabilityHost = globalThis as unknown as CapabilityHost,
): ExportCapabilities {
  const recorder = host.MediaRecorder;
  const audioContext = host.AudioContext ?? host.webkitAudioContext;
  const audio = typeof audioContext?.prototype?.createMediaStreamDestination === 'function';
  const canvasCapture = typeof host.HTMLCanvasElement?.prototype?.captureStream === 'function';
  const mimeType = recorder && typeof recorder.isTypeSupported === 'function'
    ? WEBM_MIME_TYPES.find((candidate) => recorder.isTypeSupported?.(candidate)) ?? null
    : null;
  const webm = Boolean(audio && canvasCapture && recorder && mimeType);

  return {
    audio,
    mimeType,
    mp4: webm && typeof host.WebAssembly === 'object' && typeof host.Worker === 'function',
    webm,
  };
}
