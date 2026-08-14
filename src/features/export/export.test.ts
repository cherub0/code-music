import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppStore, type ExportLockOptions } from '../../store/useAppStore';
import { detectExportCapabilities } from './capabilities';
import { ExportPanel } from './ExportPanel';
import { ExportCancelled, recordWebm, type RecordEnvironment } from './recordWebm';
import { transcodeMp4 } from './transcodeMp4';

const ffmpegMocks = vi.hoisted(() => ({
  deleteFile: vi.fn(async () => undefined),
  exec: vi.fn(async () => 0),
  fetchFile: vi.fn(async () => new Uint8Array([1, 2, 3])),
  load: vi.fn(async () => true),
  on: vi.fn(),
  readFile: vi.fn(async () => new Uint8Array([4, 5, 6])),
  terminate: vi.fn(),
  writeFile: vi.fn(async () => undefined),
}));

vi.mock('@ffmpeg/ffmpeg', () => ({
  FFmpeg: class {
    deleteFile = ffmpegMocks.deleteFile;
    exec = ffmpegMocks.exec;
    load = ffmpegMocks.load;
    on = ffmpegMocks.on;
    readFile = ffmpegMocks.readFile;
    terminate = ffmpegMocks.terminate;
    writeFile = ffmpegMocks.writeFile;
  },
}));

vi.mock('@ffmpeg/util', () => ({
  fetchFile: ffmpegMocks.fetchFile,
}));

class FakeTrack {
  constructor(readonly kind: 'audio' | 'video') {}

  readonly stop = vi.fn();
}

class FakeMediaStream {
  constructor(private readonly tracks: FakeTrack[] = []) {}

  getTracks() {
    return this.tracks;
  }

  getAudioTracks() {
    return this.tracks.filter((track) => track.kind === 'audio');
  }

  getVideoTracks() {
    return this.tracks.filter((track) => track.kind === 'video');
  }
}

class FakeMediaRecorder {
  static isTypeSupported = vi.fn(() => true);
  static lastRecorder: FakeMediaRecorder | null = null;
  static lastStream: FakeMediaStream | null = null;
  state: RecordingState = 'inactive';
  ondataavailable: ((event: BlobEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onstop: (() => void) | null = null;

  constructor(stream: FakeMediaStream) {
    FakeMediaRecorder.lastRecorder = this;
    FakeMediaRecorder.lastStream = stream;
  }

  start() {
    this.state = 'recording';
  }

  stop() {
    this.state = 'inactive';
    queueMicrotask(() => {
      this.ondataavailable?.({ data: new Blob(['webm-with-audio']) } as BlobEvent);
      this.onstop?.();
    });
  }
}

function cancellationFixture() {
  FakeMediaRecorder.lastRecorder = null;
  FakeMediaRecorder.lastStream = null;
  const videoTrack = new FakeTrack('video');
  const audioTrack = new FakeTrack('audio');
  const videoStream = new FakeMediaStream([videoTrack]);
  const destination = Object.assign(new FakeMediaStream(), {
    stream: new FakeMediaStream([audioTrack]),
    connect: vi.fn(),
    disconnect: vi.fn(),
  });
  const sourceNode = { connect: vi.fn(), disconnect: vi.fn() };
  const audioContext = {
    createMediaElementSource: vi.fn(() => sourceNode),
    createMediaStreamDestination: vi.fn(() => destination),
    resume: vi.fn(async () => undefined),
    close: vi.fn(async () => undefined),
  };
  const captureAudio = new EventTarget() as HTMLAudioElement;
  Object.assign(captureAudio, {
    currentTime: 0,
    duration: 10,
    pause: vi.fn(),
    play: vi.fn(async () => undefined),
    preload: 'auto',
    src: 'blob:local-audio',
  });
  const previewAudio = {
    currentSrc: 'blob:local-audio',
    currentTime: 4.25,
    duration: 10,
    paused: false,
    pause: vi.fn(),
    play: vi.fn(async () => undefined),
    src: 'blob:local-audio',
  } as unknown as HTMLAudioElement;
  const environment = {
    AudioContext: vi.fn(() => audioContext),
    MediaRecorder: FakeMediaRecorder,
    MediaStream: FakeMediaStream,
    cancelAnimationFrame: vi.fn(),
    createAudioElement: vi.fn(() => captureAudio),
    requestAnimationFrame: vi.fn(() => 1),
  } as unknown as RecordEnvironment;

  return {
    audioContext,
    audioTrack,
    captureAudio,
    destination,
    environment,
    previewAudio,
    sourceNode,
    videoStream,
    videoTrack,
  };
}

describe('export browser boundaries', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('disables WebM when captureStream or MediaRecorder is unavailable', () => {
    const unsupportedWindow = {
      HTMLCanvasElement: { prototype: {} },
    };

    expect(detectExportCapabilities(unsupportedWindow)).toMatchObject({
      audio: false,
      mimeType: null,
      mp4: false,
      webm: false,
    });
  });

  it('keeps WebM enabled but disables MP4 when Worker is unavailable', () => {
    const hostWithoutWorker = {
      AudioContext: { prototype: { createMediaStreamDestination() {} } },
      HTMLCanvasElement: { prototype: { captureStream() {} } },
      MediaRecorder: { isTypeSupported: () => true },
      WebAssembly: {},
    };

    expect(detectExportCapabilities(hostWithoutWorker)).toMatchObject({
      mp4: false,
      webm: true,
    });
    expect(detectExportCapabilities({
      ...hostWithoutWorker,
      Worker: class FakeWorker {},
    })).toMatchObject({ mp4: true, webm: true });
  });

  it('stops capture tracks and restores preview state when aborted', async () => {
    const fixture = cancellationFixture();
    const controller = new AbortController();
    const promise = recordWebm({
      audio: fixture.previewAudio,
      canvas: {
        captureStream: vi.fn(() => fixture.videoStream),
      } as unknown as HTMLCanvasElement,
      durationSeconds: 10,
      environment: fixture.environment,
      frameRate: 30,
      signal: controller.signal,
    });

    controller.abort();

    await expect(promise).rejects.toMatchObject({ name: 'ExportCancelled' });
    expect(fixture.videoTrack.stop).toHaveBeenCalledOnce();
    expect(fixture.audioTrack.stop).toHaveBeenCalledOnce();
    expect(fixture.sourceNode.disconnect).toHaveBeenCalledOnce();
    expect(fixture.audioContext.close).toHaveBeenCalledOnce();
    expect(fixture.previewAudio.currentTime).toBe(4.25);
    expect(fixture.previewAudio.play).toHaveBeenCalledOnce();
  });

  it('records a WebM containing both the stage video and Web Audio tracks', async () => {
    const fixture = cancellationFixture();
    Object.assign(fixture.captureAudio, {
      play: vi.fn(async () => {
        queueMicrotask(() => fixture.captureAudio.dispatchEvent(new Event('ended')));
      }),
    });

    const result = await recordWebm({
      audio: fixture.previewAudio,
      canvas: Object.assign(document.createElement('canvas'), {
        captureStream: vi.fn(() => fixture.videoStream),
        width: 1280,
      }),
      durationSeconds: 10,
      environment: fixture.environment,
      frameRate: 30,
      signal: new AbortController().signal,
    });

    expect(result.type).toBe('video/webm;codecs=vp9,opus');
    expect(result.size).toBeGreaterThan(0);
    expect(FakeMediaRecorder.lastStream?.getVideoTracks()).toHaveLength(1);
    expect(FakeMediaRecorder.lastStream?.getAudioTracks()).toHaveLength(1);
    expect(fixture.videoTrack.stop).toHaveBeenCalledOnce();
    expect(fixture.audioTrack.stop).toHaveBeenCalledOnce();
    expect(fixture.sourceNode.disconnect).toHaveBeenCalledOnce();
    expect(fixture.destination.disconnect).toHaveBeenCalledOnce();
    expect(fixture.audioContext.close).toHaveBeenCalledOnce();
    expect(fixture.environment.cancelAnimationFrame).toHaveBeenCalledWith(1);
    expect(fixture.previewAudio.currentTime).toBe(4.25);
    expect(fixture.previewAudio.play).toHaveBeenCalledOnce();
  });

  it('releases capture resources and restores preview after MediaRecorder errors', async () => {
    const fixture = cancellationFixture();
    const promise = recordWebm({
      audio: fixture.previewAudio,
      canvas: { captureStream: vi.fn(() => fixture.videoStream) } as unknown as HTMLCanvasElement,
      durationSeconds: 10,
      environment: fixture.environment,
      frameRate: 30,
      signal: new AbortController().signal,
    });
    await vi.waitFor(() => expect(FakeMediaRecorder.lastRecorder?.state).toBe('recording'));

    FakeMediaRecorder.lastRecorder?.onerror?.(new Event('error'));

    await expect(promise).rejects.toThrow('The browser stopped recording unexpectedly.');
    expect(fixture.videoTrack.stop).toHaveBeenCalledOnce();
    expect(fixture.audioTrack.stop).toHaveBeenCalledOnce();
    expect(fixture.sourceNode.disconnect).toHaveBeenCalledOnce();
    expect(fixture.destination.disconnect).toHaveBeenCalledOnce();
    expect(fixture.audioContext.close).toHaveBeenCalledOnce();
    expect(fixture.environment.cancelAnimationFrame).toHaveBeenCalledWith(1);
    expect(fixture.previewAudio.currentTime).toBe(4.25);
    expect(fixture.previewAudio.play).toHaveBeenCalledOnce();
  });

  it('stops the canvas track when Web Audio unexpectedly provides no track', async () => {
    const fixture = cancellationFixture();
    fixture.destination.stream = new FakeMediaStream();

    await expect(recordWebm({
      audio: fixture.previewAudio,
      canvas: { captureStream: vi.fn(() => fixture.videoStream) } as unknown as HTMLCanvasElement,
      durationSeconds: 10,
      environment: fixture.environment,
      frameRate: 30,
      signal: new AbortController().signal,
    })).rejects.toThrow('Web Audio did not provide an audio track.');
    expect(fixture.videoTrack.stop).toHaveBeenCalledOnce();
  });
});

describe('locked export state', () => {
  beforeEach(() => {
    useAppStore.getState().finishExport();
    useAppStore.getState().setOffsetSeconds(1.25);
    useAppStore.getState().setSpeed(0.9);
  });

  it('freezes calibration, resolution, quality, frame rate, and seed until export finishes', () => {
    const lock = useAppStore.getState().beginExport({
      frameRate: 30,
      height: 720,
      quality: 'export-720p',
      resolution: '720p',
      seed: 42,
      width: 1280,
    });

    useAppStore.getState().setOffsetSeconds(9);
    useAppStore.getState().setSpeed(2);

    expect(lock).toMatchObject({ offsetSeconds: 1.25, speed: 0.9 });
    expect(useAppStore.getState()).toMatchObject({
      exportLock: lock,
      offsetSeconds: 1.25,
      speed: 0.9,
    });

    useAppStore.getState().finishExport();
    expect(useAppStore.getState().exportLock).toBeNull();
  });
});

describe('MP4 transcode and recovery', () => {
  beforeEach(() => {
    Object.values(ffmpegMocks).forEach((mock) => mock.mockClear());
    ffmpegMocks.exec.mockResolvedValue(0);
    ffmpegMocks.readFile.mockResolvedValue(new Uint8Array([4, 5, 6]));
    ffmpegMocks.on.mockImplementation((event, callback) => {
      if (event === 'progress') callback({ progress: 0.5, time: 500_000 });
    });
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn((blob: Blob) => `blob:${blob.type}`),
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads FFmpeg on demand, preserves both video and audio, reports progress, and cleans up', async () => {
    const onProgress = vi.fn();

    const result = await transcodeMp4(
      new Blob(['source'], { type: 'video/webm' }),
      onProgress,
      new AbortController().signal,
    );

    expect(result).toEqual(new Blob([new Uint8Array([4, 5, 6])], { type: 'video/mp4' }));
    expect(onProgress).toHaveBeenCalledWith(0.5);
    expect(ffmpegMocks.load).toHaveBeenCalledWith(expect.objectContaining({
      classWorkerURL: expect.stringContaining('worker'),
    }));
    expect(ffmpegMocks.exec).toHaveBeenCalledWith(expect.arrayContaining([
      '-map', '0:v:0', '-map', '0:a:0', '-c:v', 'libx264', '-c:a', 'aac',
    ]));
    expect(ffmpegMocks.deleteFile).toHaveBeenCalledTimes(2);
    expect(ffmpegMocks.terminate).toHaveBeenCalledOnce();
  });

  it('terminates the FFmpeg worker when an in-flight transcode is cancelled', async () => {
    let rejectExec!: (error: Error) => void;
    ffmpegMocks.exec.mockImplementation(() => new Promise<number>((_resolve, reject) => {
      rejectExec = reject;
    }));
    const controller = new AbortController();
    const promise = transcodeMp4(
      new Blob(['source'], { type: 'video/webm' }),
      vi.fn(),
      controller.signal,
    );
    await waitFor(() => expect(ffmpegMocks.exec).toHaveBeenCalledOnce());

    controller.abort();
    rejectExec(new Error('worker terminated'));

    await expect(promise).rejects.toMatchObject({ name: 'ExportCancelled' });
    expect(ffmpegMocks.terminate).toHaveBeenCalled();
  });

  it('keeps a downloadable WebM when optional MP4 conversion fails', async () => {
    const user = userEvent.setup();
    const restore = vi.fn();
    render(createElement(ExportPanel, {
      audioName: 'My Unsafe / Song.ogg',
      capabilities: { audio: true, mimeType: 'video/webm', mp4: true, webm: true },
      durationSeconds: 1,
      ready: true,
      record: vi.fn(async () => new Blob(['captured'], { type: 'video/webm' })),
      transcode: vi.fn(async () => { throw new Error('WASM ran out of memory'); }),
      onPrepare: vi.fn(async () => ({
          audio: document.createElement('audio'),
          canvas: document.createElement('canvas'),
          onFrame: vi.fn(),
      })),
      onRestore: restore,
    }));

    await user.selectOptions(screen.getByRole('combobox', { name: 'Export format' }), 'mp4');
    await user.click(screen.getByRole('button', { name: 'Start export' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('WASM ran out of memory');
    const fallback = screen.getByRole('link', { name: 'Download WebM fallback' });
    expect(fallback).toHaveAttribute('href', 'blob:video/webm');
    expect(fallback.getAttribute('download')).toMatch(/^My-Unsafe-Song-720p-\d{8}T\d{6}\.webm$/);
    await waitFor(() => expect(restore).toHaveBeenCalledOnce());
  });

  it('cancels preparation promptly and restores the unlocked app state', async () => {
    const user = userEvent.setup();
    const record = vi.fn();
    const onPrepare = vi.fn((settings: ExportLockOptions, signal: AbortSignal) => {
      useAppStore.getState().beginExport(settings);
      return new Promise<never>((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new ExportCancelled()), { once: true });
      });
    });
    render(createElement(ExportPanel, {
      audioName: 'waiting.ogg',
      capabilities: { audio: true, mimeType: 'video/webm', mp4: true, webm: true },
      durationSeconds: 10,
      ready: true,
      record,
      onPrepare,
      onRestore: () => useAppStore.getState().finishExport(),
    }));

    await user.click(screen.getByRole('button', { name: 'Start export' }));
    await waitFor(() => expect(useAppStore.getState().exportLock).not.toBeNull());
    await user.click(screen.getByRole('button', { name: 'Cancel export' }));

    expect(await screen.findByText(/Export cancelled/)).toBeInTheDocument();
    expect(record).not.toHaveBeenCalled();
    expect(useAppStore.getState().exportLock).toBeNull();
  });
});
