import { describe, expect, it, vi } from 'vitest';
import { validateAudioFile, validateMidiFile } from './fileTypes';
import { createAudioSource, readMidiBytes } from './loadLocal';

describe('local file helpers', () => {
  it('accepts supported extensions regardless of filename casing', () => {
    expect(validateAudioFile(new File(['audio'], 'SET.MP3'))).toEqual({ ok: true });
    expect(validateMidiFile(new File(['midi'], 'score.MIDI'))).toEqual({ ok: true });
  });

  it('rejects an empty audio file before it can enter the app', () => {
    expect(validateAudioFile(new File([], 'empty.wav'))).toEqual({
      ok: false,
      message: '音乐文件不能为空，请重新选择。',
    });
  });

  it('rejects MIDI files larger than 20 MB with a next step', () => {
    const oversizedMidi = new File([new Uint8Array(20 * 1024 * 1024 + 1)], 'large.mid');

    expect(validateMidiFile(oversizedMidi)).toEqual({
      ok: false,
      message: 'MIDI 文件不能超过 20 MB，请选择较小的文件。',
    });
  });

  it('reads the selected MIDI as raw bytes', async () => {
    const bytes = await readMidiBytes(new File([new Uint8Array([0x4d, 0x54, 0x68, 0x64])], 'score.mid'));

    expect([...new Uint8Array(bytes)]).toEqual([0x4d, 0x54, 0x68, 0x64]);
  });

  it('revokes the object URL when an audio source is disposed', () => {
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:audio'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });

    const source = createAudioSource(new File(['audio'], 'demo.mp3'));
    source.dispose();

    expect(source.url).toBe('blob:audio');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:audio');
  });
});
