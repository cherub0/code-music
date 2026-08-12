import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Midi } from '@tonejs/midi';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { useAppStore } from '../store/useAppStore';

const { readMidiBytesMock } = vi.hoisted(() => ({ readMidiBytesMock: vi.fn() }));

vi.mock('../features/files/loadLocal', () => ({
  readMidiBytes: readMidiBytesMock,
}));

function midiFile(midi: Midi, name: string): File {
  const source = midi.toArray();
  const bytes = new Uint8Array(source.byteLength);
  bytes.set(source);
  return new File([bytes], name, { type: 'audio/midi' });
}

function midiBytes(midi: Midi): ArrayBuffer {
  return Uint8Array.from(midi.toArray()).buffer as ArrayBuffer;
}

function readFileBytes(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.readAsArrayBuffer(file);
  });
}

describe('App file intake', () => {
  beforeEach(() => {
    useAppStore.getState().setAudio(null);
    useAppStore.getState().setMidi(null);
    readMidiBytesMock.mockReset();
    readMidiBytesMock.mockImplementation(readFileBytes);
  });

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

  it('keeps the latest MIDI when an earlier file read finishes afterward', async () => {
    const user = userEvent.setup();
    const older = new Midi();
    older.addTrack().addNote({ midi: 60, time: 0, duration: 0.5, velocity: 0.5 });
    const newer = new Midi();
    newer.addTrack().addNote({ midi: 64, time: 0, duration: 0.5, velocity: 0.5 });
    const olderFile = midiFile(older, 'older.mid');
    const newerFile = midiFile(newer, 'newer.mid');
    let resolveOlder!: (bytes: ArrayBuffer) => void;
    let resolveNewer!: (bytes: ArrayBuffer) => void;
    const olderRead = new Promise<ArrayBuffer>((resolve) => { resolveOlder = resolve; });
    const newerRead = new Promise<ArrayBuffer>((resolve) => { resolveNewer = resolve; });
    readMidiBytesMock.mockImplementation((file: File) => (
      file === olderFile ? olderRead : newerRead
    ));
    render(<App />);

    await user.upload(screen.getByLabelText('选择 MIDI 文件'), olderFile);
    await user.upload(screen.getByLabelText('选择 MIDI 文件'), newerFile);
    resolveNewer(midiBytes(newer));

    await waitFor(() => {
      expect(screen.getByText('newer.mid')).toBeInTheDocument();
    });

    resolveOlder(midiBytes(older));

    await waitFor(() => {
      expect(screen.getByText('newer.mid')).toBeInTheDocument();
    });
    expect(screen.queryByText('older.mid')).not.toBeInTheDocument();
  });

  it('provides calibration controls and an absolute timeline before files are selected', () => {
    render(<App />);

    expect(screen.getByRole('spinbutton', { name: 'Calibration offset (seconds)' })).toHaveValue(0);
    expect(screen.getByRole('spinbutton', { name: 'Visual speed multiplier' })).toHaveValue(1);
    expect(screen.getByRole('slider', { name: 'Timeline position' })).toHaveValue('0');
    expect(screen.getAllByText('00:00')).toHaveLength(2);
  });
});
