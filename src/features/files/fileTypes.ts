export type FileValidation = { ok: true } | { ok: false; message: string };

export type LocalAudio = {
  file: File;
  url: string;
  dispose: () => void;
};

export type LocalMidi = {
  file: File;
  bytes: ArrayBuffer;
};

const MAX_AUDIO_BYTES = 250 * 1024 * 1024;
const MAX_MIDI_BYTES = 20 * 1024 * 1024;

function extensionOf(file: File): string {
  return file.name.split('.').pop()?.toLowerCase() ?? '';
}

function validateFile(
  file: File,
  extensions: readonly string[],
  maxBytes: number,
  kind: '音乐' | 'MIDI',
  acceptedFormats: string,
): FileValidation {
  if (file.size === 0) {
    return { ok: false, message: `${kind}文件不能为空，请重新选择。` };
  }

  if (!extensions.includes(extensionOf(file))) {
    return { ok: false, message: `请选择 ${acceptedFormats} ${kind}文件。` };
  }

  if (file.size > maxBytes) {
    return { ok: false, message: `${kind} 文件不能超过 ${maxBytes / 1024 / 1024} MB，请选择较小的文件。` };
  }

  return { ok: true };
}

export function validateAudioFile(file: File): FileValidation {
  return validateFile(file, ['mp3', 'wav', 'ogg'], MAX_AUDIO_BYTES, '音乐', 'MP3、WAV 或 OGG');
}

export function validateMidiFile(file: File): FileValidation {
  return validateFile(file, ['mid', 'midi'], MAX_MIDI_BYTES, 'MIDI', 'MID 或 MIDI');
}
