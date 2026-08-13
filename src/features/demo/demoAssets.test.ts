import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Midi } from '@tonejs/midi';
import { describe, expect, it } from 'vitest';

const demoDirectory = join(process.cwd(), 'public', 'demo');

function readWaveDuration(bytes: Buffer): number {
  expect(bytes.toString('ascii', 0, 4)).toBe('RIFF');
  expect(bytes.toString('ascii', 8, 12)).toBe('WAVE');
  const byteRate = bytes.readUInt32LE(28);
  const dataLength = bytes.readUInt32LE(40);
  return dataLength / byteRate;
}

describe('built-in demo assets', () => {
  it('ships a substantial public-domain Fur Elise performance with synchronized audio', async () => {
    const manifest = JSON.parse(
      await readFile(join(demoDirectory, 'manifest.json'), 'utf8'),
    ) as Array<{ title: string; audioUrl: string; midiUrl: string }>;

    expect(manifest).toHaveLength(1);
    expect(manifest[0]).toMatchObject({
      title: '贝多芬《致爱丽丝》',
      audioUrl: '/demo/fur-elise.wav',
      midiUrl: '/demo/fur-elise.mid',
    });

    const midi = new Midi(await readFile(join(demoDirectory, 'fur-elise.mid')));
    const audio = await readFile(join(demoDirectory, 'fur-elise.wav'));
    const noteCount = midi.tracks.reduce((total, track) => total + track.notes.length, 0);
    const audioDuration = readWaveDuration(audio);

    expect(noteCount).toBeGreaterThan(500);
    expect(midi.duration).toBeGreaterThan(120);
    expect(Math.abs(audioDuration - midi.duration)).toBeLessThan(0.1);
  });
});
