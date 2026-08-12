import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Midi } from '@tonejs/midi';
import { describe, expect, it } from 'vitest';
import { App } from './App';

function midiFile(midi: Midi, name: string): File {
  const source = midi.toArray();
  const bytes = new Uint8Array(source.byteLength);
  bytes.set(source);
  return new File([bytes], name, { type: 'audio/midi' });
}

describe('App file intake', () => {
  it('rejects an unsupported audio file before initialization', async () => {
    const user = userEvent.setup({ applyAccept: false });
    render(<App />);

    const unsupportedAudio = new File(['text'], 'demo.txt', { type: 'text/plain' });
    await user.upload(screen.getByLabelText('选择音乐文件'), unsupportedAudio);

    expect(screen.getByText('请选择 MP3、WAV 或 OGG 音乐文件。')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '启动演出' })).toBeDisabled();
  });

  it('enables initialization only after valid audio and MIDI are selected', async () => {
    const user = userEvent.setup();
    render(<App />);
    const audio = new File(['audio'], 'demo.mp3', { type: 'audio/mpeg' });
    const source = new Midi();
    source.header.setTempo(120);
    source.addTrack().addNote({ midi: 60, time: 0, duration: 0.5, velocity: 0.5 });
    const midi = midiFile(source, 'demo.mid');

    await user.upload(screen.getByLabelText('选择音乐文件'), audio);
    await user.upload(screen.getByLabelText('选择 MIDI 文件'), midi);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '启动演出' })).toBeEnabled();
    });
    expect(screen.getByRole('status')).toHaveTextContent('MIDI 摘要：1 个音轨 · 1 个音符 · 0.50 秒');
  });

  it('keeps valid audio when the selected MIDI has no playable notes', async () => {
    const user = userEvent.setup();
    render(<App />);
    const audio = new File(['audio'], 'demo.mp3', { type: 'audio/mpeg' });
    const midi = midiFile(new Midi(), 'empty.mid');

    await user.upload(screen.getByLabelText('选择音乐文件'), audio);
    await user.upload(screen.getByLabelText('选择 MIDI 文件'), midi);

    expect(screen.getByText('demo.mp3')).toBeInTheDocument();
    expect(await screen.findByText('MIDI 中没有可播放的音符')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '启动演出' })).toBeDisabled();
  });
});
