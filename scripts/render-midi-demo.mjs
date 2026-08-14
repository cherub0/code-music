import { readFile, writeFile } from 'node:fs/promises';
import midiPackage from '@tonejs/midi';

const { Midi } = midiPackage;

const [, , inputPath = 'public/demo/fur-elise.mid', outputPath = 'public/demo/fur-elise.wav'] = process.argv;
const sampleRate = 22_050;
const midi = new Midi(await readFile(inputPath));
const sampleCount = Math.ceil(midi.duration * sampleRate);
const mix = new Float32Array(sampleCount);

for (const track of midi.tracks) {
  for (const note of track.notes) {
    const start = Math.floor(note.time * sampleRate);
    const end = Math.min(sampleCount, Math.ceil((note.time + note.duration) * sampleRate));
    const frequency = 440 * 2 ** ((note.midi - 69) / 12);
    const gain = 0.12 * Math.max(0.15, note.velocity);

    for (let index = start; index < end; index += 1) {
      const age = (index - start) / sampleRate;
      const remaining = (end - index) / sampleRate;
      const attack = Math.min(1, age / 0.008);
      const decay = 0.35 + 0.65 * Math.exp(-age * 1.8);
      const release = Math.min(1, remaining / 0.08);
      const phase = 2 * Math.PI * frequency * age;
      const pianoTone = Math.sin(phase)
        + 0.42 * Math.sin(2 * phase + 0.12)
        + 0.18 * Math.sin(3 * phase + 0.31)
        + 0.08 * Math.sin(4 * phase + 0.53);
      mix[index] += pianoTone * gain * attack * decay * release;
    }
  }
}

const dataLength = sampleCount * 2;
const wave = Buffer.allocUnsafe(44 + dataLength);
wave.write('RIFF', 0);
wave.writeUInt32LE(36 + dataLength, 4);
wave.write('WAVE', 8);
wave.write('fmt ', 12);
wave.writeUInt32LE(16, 16);
wave.writeUInt16LE(1, 20);
wave.writeUInt16LE(1, 22);
wave.writeUInt32LE(sampleRate, 24);
wave.writeUInt32LE(sampleRate * 2, 28);
wave.writeUInt16LE(2, 32);
wave.writeUInt16LE(16, 34);
wave.write('data', 36);
wave.writeUInt32LE(dataLength, 40);

for (let index = 0; index < sampleCount; index += 1) {
  const sample = Math.tanh(mix[index] * 0.9);
  wave.writeInt16LE(Math.round(sample * 32_767), 44 + index * 2);
}

await writeFile(outputPath, wave);
console.log(`Rendered ${midi.duration.toFixed(3)}s MIDI to ${outputPath}`);
