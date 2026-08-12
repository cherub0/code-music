import type { LocalAudio } from './fileTypes';

export function readMidiBytes(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('无法读取 MIDI 文件，请重新选择。'));
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
        return;
      }

      reject(new Error('无法读取 MIDI 文件，请重新选择。'));
    };
    reader.readAsArrayBuffer(file);
  });
}

export function createAudioSource(file: File): LocalAudio {
  const url = URL.createObjectURL(file);

  return {
    file,
    url,
    dispose: () => URL.revokeObjectURL(url),
  };
}
