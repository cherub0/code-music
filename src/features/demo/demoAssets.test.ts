import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Midi } from '@tonejs/midi';
import { describe, expect, it } from 'vitest';
import { parseMidi } from '../midi/parseMidi';
import { BUILT_IN_DEMO } from './demoAssets';
import { inspectMp3 } from './inspectMp3';

const demoDirectory = join(process.cwd(), 'public', 'demo');

describe('built-in demo assets', () => {
  it('declares a redistributable Chinese-vocal demo with exact provenance', async () => {
    expect(BUILT_IN_DEMO).toMatchObject({
      title: '心跳的声音 (XinTiaoDeShengYin)',
      artist: 'Adeline Yeo (HP)',
      language: 'zh',
      hasVocals: true,
      redistributionAllowed: true,
      license: 'CC BY 4.0',
      sourceUrl: 'https://freemusicarchive.org/music/adeline-yeo-hp/single/xintiaodeshengyin/',
      licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
      audioUrl: '/demo/xintiaodeshengyin.mp3',
      midiUrl: '/demo/xintiaodeshengyin.mid',
    });

    expect(BUILT_IN_DEMO.modificationNotes).toContain('MIDI');
    expect(BUILT_IN_DEMO.calibrationNotes).toContain('0.000');
  });

  it('ships decodable MP3 frames synchronized to a nonempty Standard MIDI File', async () => {
    const bytes = await readFile(join(demoDirectory, 'xintiaodeshengyin.mid'));
    const midi = new Midi(bytes);
    const projectScore = parseMidi(Uint8Array.from(bytes).buffer);
    const noteCount = midi.tracks.reduce(
      (total, track) => total + track.notes.length,
      0,
    );

    expect(midi.tracks.length).toBeGreaterThan(0);
    expect(noteCount).toBeGreaterThan(500);
    expect(projectScore.tracks).toHaveLength(2);
    expect(projectScore.notes).toHaveLength(noteCount);
    expect(midi.duration).toBeGreaterThan(220);
    const audioBytes = await readFile(
      join(demoDirectory, 'xintiaodeshengyin.mp3'),
    );
    const audio = inspectMp3(audioBytes);

    expect(audioBytes.byteLength).toBeGreaterThan(0);
    expect(audio.frameCount).toBeGreaterThan(0);
    expect(audio.durationSeconds).toBeGreaterThan(220);
    expect(audio.sampleRate).toBe(48_000);
    expect(Math.abs(audio.durationSeconds - midi.duration)).toBeLessThanOrEqual(0.25);
  });

  it('publishes the same licensed metadata through the runtime manifest', async () => {
    const manifest = JSON.parse(
      await readFile(join(demoDirectory, 'manifest.json'), 'utf8'),
    );

    expect(manifest).toEqual([BUILT_IN_DEMO]);
  });
});
