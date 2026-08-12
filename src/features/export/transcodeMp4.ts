/// <reference types="vite/client" />

import { ExportCancelled } from './recordWebm';

const INPUT_NAME = 'capture.webm';
const OUTPUT_NAME = 'capture.mp4';

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) throw new ExportCancelled();
}

export async function transcodeMp4(
  webm: Blob,
  onProgress: (ratio: number) => void,
  signal: AbortSignal,
): Promise<Blob> {
  throwIfAborted(signal);

  // These imports intentionally stay inside the MP4 action. WebM-only exports never
  // download the FFmpeg worker, JavaScript core, or 32 MB WASM binary.
  const [ffmpegModule, utilModule, classWorkerModule, coreModule, wasmModule] = await Promise.all([
    import('@ffmpeg/ffmpeg'),
    import('@ffmpeg/util'),
    import('@ffmpeg/ffmpeg/worker?url'),
    import('@ffmpeg/core?url'),
    import('@ffmpeg/core/wasm?url'),
  ]);
  throwIfAborted(signal);

  const ffmpeg = new ffmpegModule.FFmpeg();
  const abort = () => ffmpeg.terminate();
  signal.addEventListener('abort', abort, { once: true });
  ffmpeg.on('progress', ({ progress }) => {
    if (Number.isFinite(progress)) onProgress(Math.max(0, Math.min(1, progress)));
  });

  try {
    await ffmpeg.load({
      classWorkerURL: classWorkerModule.default,
      coreURL: coreModule.default,
      wasmURL: wasmModule.default,
    });
    throwIfAborted(signal);
    await ffmpeg.writeFile(INPUT_NAME, await utilModule.fetchFile(webm));
    throwIfAborted(signal);
    const exitCode = await ffmpeg.exec([
      '-i', INPUT_NAME,
      '-map', '0:v:0',
      '-map', '0:a:0',
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-crf', '20',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-movflags', '+faststart',
      OUTPUT_NAME,
    ]);
    throwIfAborted(signal);
    if (exitCode !== 0) throw new Error(`FFmpeg exited with code ${exitCode}.`);
    const output = await ffmpeg.readFile(OUTPUT_NAME);
    if (typeof output === 'string') throw new Error('FFmpeg returned an invalid MP4 payload.');
    onProgress(1);
    return new Blob([new Uint8Array(output)], { type: 'video/mp4' });
  } catch (error) {
    if (signal.aborted) throw new ExportCancelled();
    throw error;
  } finally {
    signal.removeEventListener('abort', abort);
    for (const name of [INPUT_NAME, OUTPUT_NAME]) {
      try {
        await ffmpeg.deleteFile(name);
      } catch {
        // An input/output may not exist if loading, transcoding, or cancellation failed.
      }
    }
    ffmpeg.terminate();
  }
}
