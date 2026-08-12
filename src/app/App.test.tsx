import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Midi } from '@tonejs/midi';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { useAppStore } from '../store/useAppStore';

const { hologramStageMock, readMidiBytesMock } = vi.hoisted(() => ({
  hologramStageMock: vi.fn((_props: unknown) => null),
  readMidiBytesMock: vi.fn(),
}));

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../features/stage/HologramStage', () => ({
  HologramStage: hologramStageMock,
}));

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

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => { resolve = promiseResolve; });
  return { promise, resolve };
}

function demoManifest() {
  return [{
    title: 'Project Signal Etude',
    audioUrl: '/demo/demo.ogg',
    midiUrl: '/demo/demo.mid',
    offsetSeconds: 0.125,
    speed: 1.25,
    seed: 9234,
  }];
}

class FrameSampleAudio extends EventTarget {
  currentTime = 0;
  duration = 60;
  src = '';
  readonly load = vi.fn();
  readonly pause = vi.fn();
  readonly play = vi.fn(async () => undefined);
}

class DurationAudio extends EventTarget {
  currentTime = 0;
  duration: number;
  src = '';
  readonly load = vi.fn();
  readonly pause = vi.fn();
  readonly play = vi.fn(async () => undefined);

  constructor(duration: number) {
    super();
    this.duration = duration;
  }
}

describe('App file intake', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    useAppStore.getState().setAudio(null);
    useAppStore.getState().setMidi(null);
    useAppStore.getState().setOffsetSeconds(0);
    useAppStore.getState().setSpeed(1);
    hologramStageMock.mockClear();
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

  it('gives a concrete recovery action for invalid MIDI', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.upload(
      screen.getByLabelText('选择 MIDI 文件'),
      new File(['not midi'], 'broken.mid', { type: 'audio/midi' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('Choose another MIDI file');
    expect(screen.getByRole('button', { name: '启动演出' })).toBeDisabled();
  });

  it('blocks empty MIDI with a concrete recovery action', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.upload(
      screen.getByLabelText('选择 MIDI 文件'),
      midiFile(new Midi(), 'empty.mid'),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('Choose a MIDI file with at least one note');
    expect(screen.getByRole('button', { name: '启动演出' })).toBeDisabled();
  });

  it('blocks initialization when an empty MIDI replaces a valid MIDI but keeps valid audio', async () => {
    const user = userEvent.setup();
    const valid = new Midi();
    valid.addTrack().addNote({ midi: 60, time: 0, duration: 1, velocity: 0.5 });
    render(<App />);

    await user.upload(
      screen.getByLabelText('选择音乐文件'),
      new File(['audio'], 'keeper.ogg', { type: 'audio/ogg' }),
    );
    await user.upload(screen.getByLabelText('选择 MIDI 文件'), midiFile(valid, 'valid.mid'));
    await waitFor(() => expect(screen.getByRole('button', { name: '启动演出' })).toBeEnabled());
    await user.upload(screen.getByLabelText('选择 MIDI 文件'), midiFile(new Midi(), 'empty.mid'));

    expect(await screen.findByRole('alert')).toHaveTextContent('Choose a MIDI file with at least one note');
    expect(screen.getByText('keeper.ogg')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '启动演出' })).toBeDisabled();
  });

  it('warns about a duration mismatch without blocking initialization', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('Audio', vi.fn(() => new DurationAudio(30)));
    const source = new Midi();
    source.addTrack().addNote({ midi: 60, time: 0, duration: 50, velocity: 0.5 });
    render(<App />);

    await user.upload(
      screen.getByLabelText('选择音乐文件'),
      new File(['audio'], 'short.ogg', { type: 'audio/ogg' }),
    );
    await user.upload(screen.getByLabelText('选择 MIDI 文件'), midiFile(source, 'long.mid'));

    const warning = await screen.findByText(/durations differ/i);
    expect(warning).toHaveTextContent('replace the audio or MIDI file');
    expect(screen.getByRole('button', { name: '启动演出' })).toBeEnabled();
  });

  it('replaces one valid file without clearing the other valid file', async () => {
    const user = userEvent.setup();
    const source = new Midi();
    source.addTrack().addNote({ midi: 60, time: 0, duration: 1, velocity: 0.5 });
    render(<App />);

    await user.upload(
      screen.getByLabelText('选择音乐文件'),
      new File(['first'], 'first.ogg', { type: 'audio/ogg' }),
    );
    await user.upload(screen.getByLabelText('选择 MIDI 文件'), midiFile(source, 'score.mid'));
    await user.upload(
      screen.getByLabelText('选择音乐文件'),
      new File(['second'], 'second.ogg', { type: 'audio/ogg' }),
    );

    expect(screen.getByText('second.ogg')).toBeInTheDocument();
    expect(screen.getByText('score.mid')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '启动演出' })).toBeEnabled();
  });

  it('loads the licensed built-in demo from local URLs', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('Audio', vi.fn(() => new FrameSampleAudio()));
    const source = new Midi();
    source.addTrack().addNote({ midi: 64, time: 0, duration: 1, velocity: 0.7 });
    const manifest = demoManifest();
    const audioBlob = new Blob(['audio'], { type: 'audio/ogg' });
    const fetchMock = vi.fn(async (url: string) => {
      if (url === '/demo/manifest.json') return new Response(JSON.stringify(manifest));
      if (url === '/demo/demo.ogg') return new Response(audioBlob);
      if (url === '/demo/demo.mid') return new Response(midiBytes(source));
      return new Response(null, { status: 404 });
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:demo-audio'),
      revokeObjectURL: vi.fn(),
    });
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Load built-in demo' }));

    expect(await screen.findByText('Project Signal Etude loaded.')).toBeInTheDocument();
    expect(screen.getByText('demo.ogg')).toBeInTheDocument();
    expect(screen.getByText('demo.mid')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: 'Calibration offset (seconds)' })).toHaveValue(0.125);
    expect(screen.getByRole('spinbutton', { name: 'Visual speed multiplier' })).toHaveValue(1.25);
    expect(hologramStageMock.mock.lastCall?.[0]).toMatchObject({ seed: 9234 });
  });

  it('cancels a pending demo when manual audio is selected and ignores late demo assets', async () => {
    const user = userEvent.setup();
    const audioResponse = deferred<Response>();
    const midiResponse = deferred<Response>();
    const demoMidi = new Midi();
    demoMidi.addTrack().addNote({ midi: 64, time: 0, duration: 1, velocity: 0.7 });
    const fetchMock = vi.fn(async (url: string) => {
      if (url === '/demo/manifest.json') return new Response(JSON.stringify(demoManifest()));
      if (url === '/demo/demo.ogg') return audioResponse.promise;
      if (url === '/demo/demo.mid') return midiResponse.promise;
      return new Response(null, { status: 404 });
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Load built-in demo' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(screen.getByRole('button', { name: 'Loading built-in demo…' })).toBeDisabled();

    await user.upload(
      screen.getByLabelText('选择音乐文件'),
      new File(['manual'], 'manual.ogg', { type: 'audio/ogg' }),
    );
    expect(screen.getByRole('button', { name: 'Load built-in demo' })).toBeEnabled();
    expect(screen.getByText('manual.ogg')).toBeInTheDocument();

    const lateAudioResponse = new Response(new Blob(['demo audio'], { type: 'audio/ogg' }));
    const lateMidiResponse = new Response(midiBytes(demoMidi));
    await act(async () => {
      audioResponse.resolve(lateAudioResponse);
      midiResponse.resolve(lateMidiResponse);
      await Promise.all([audioResponse.promise, midiResponse.promise]);
    });
    await waitFor(() => {
      expect(lateAudioResponse.bodyUsed).toBe(true);
      expect(lateMidiResponse.bodyUsed).toBe(true);
    });
    expect(screen.queryByText('Project Signal Etude loaded.')).not.toBeInTheDocument();
    expect(screen.queryByText('demo.mid')).not.toBeInTheDocument();
  });

  it('cancels a pending demo when manual MIDI is selected and ignores late demo assets', async () => {
    const user = userEvent.setup();
    const audioResponse = deferred<Response>();
    const midiResponse = deferred<Response>();
    const demoMidi = new Midi();
    demoMidi.addTrack().addNote({ midi: 64, time: 0, duration: 1, velocity: 0.7 });
    const manualMidi = new Midi();
    manualMidi.addTrack().addNote({ midi: 72, time: 0, duration: 1, velocity: 0.6 });
    const fetchMock = vi.fn(async (url: string) => {
      if (url === '/demo/manifest.json') return new Response(JSON.stringify(demoManifest()));
      if (url === '/demo/demo.ogg') return audioResponse.promise;
      if (url === '/demo/demo.mid') return midiResponse.promise;
      return new Response(null, { status: 404 });
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Load built-in demo' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(screen.getByRole('button', { name: 'Loading built-in demo…' })).toBeDisabled();

    await user.upload(screen.getByLabelText('选择 MIDI 文件'), midiFile(manualMidi, 'manual.mid'));
    expect(await screen.findByText('manual.mid')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Load built-in demo' })).toBeEnabled();

    const lateAudioResponse = new Response(new Blob(['demo audio'], { type: 'audio/ogg' }));
    const lateMidiResponse = new Response(midiBytes(demoMidi));
    await act(async () => {
      audioResponse.resolve(lateAudioResponse);
      midiResponse.resolve(lateMidiResponse);
      await Promise.all([audioResponse.promise, midiResponse.promise]);
    });
    await waitFor(() => {
      expect(lateAudioResponse.bodyUsed).toBe(true);
      expect(lateMidiResponse.bodyUsed).toBe(true);
    });
    expect(screen.queryByText('Project Signal Etude loaded.')).not.toBeInTheDocument();
    expect(screen.queryByText('demo.ogg')).not.toBeInTheDocument();
  });

  it('requires 120 consecutive slow intervals, resets after a healthy interval, and allows High restore', async () => {
    const user = userEvent.setup();
    let nextFrame: FrameRequestCallback | undefined;
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
      nextFrame = callback;
      return 1;
    }));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    const source = new Midi();
    source.addTrack().addNote({ midi: 60, time: 0, duration: 1, velocity: 0.6 });
    render(<App />);
    await user.upload(screen.getByLabelText('选择 MIDI 文件'), midiFile(source, 'quality.mid'));
    await waitFor(() => expect(nextFrame).toBeDefined());

    act(() => nextFrame?.(0));
    act(() => {
      for (let interval = 1; interval <= 119; interval += 1) nextFrame?.(interval * 25);
    });
    expect(screen.queryByRole('status', { name: 'Preview quality status' })).not.toBeInTheDocument();
    expect(hologramStageMock.mock.lastCall?.[0]).toMatchObject({ previewQuality: 'high' });

    const healthyTimestamp = 119 * 25 + 16;
    act(() => nextFrame?.(healthyTimestamp));
    act(() => {
      for (let interval = 1; interval <= 119; interval += 1) {
        nextFrame?.(healthyTimestamp + interval * 25);
      }
    });
    expect(screen.queryByRole('status', { name: 'Preview quality status' })).not.toBeInTheDocument();
    expect(hologramStageMock.mock.lastCall?.[0]).toMatchObject({ previewQuality: 'high' });

    act(() => nextFrame?.(healthyTimestamp + 120 * 25));

    expect(await screen.findByRole('status', { name: 'Preview quality status' })).toHaveTextContent(
      'bloom resolution and the visible note window were reduced',
    );
    expect(hologramStageMock.mock.lastCall?.[0]).toMatchObject({ previewQuality: 'low' });

    await user.selectOptions(screen.getByRole('combobox', { name: 'Preview Quality' }), 'High');
    expect(hologramStageMock.mock.lastCall?.[0]).toMatchObject({ previewQuality: 'high' });
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

  it('passes the loaded score layout and absolute logical time to the holographic stage', async () => {
    const user = userEvent.setup();
    const source = new Midi();
    source.addTrack().addNote({ midi: 67, time: 0, duration: 0.75, velocity: 0.8 });
    useAppStore.getState().setOffsetSeconds(-1);
    useAppStore.getState().setSpeed(2);
    render(<App />);

    await user.upload(screen.getByLabelText('选择 MIDI 文件'), midiFile(source, 'stage.mid'));

    await waitFor(() => {
      expect(hologramStageMock).toHaveBeenCalled();
    });
    const props = hologramStageMock.mock.lastCall?.[0];
    expect(props).toMatchObject({
      logicalTime: 2,
      quality: 'preview',
      score: {
        durationSeconds: 0.75,
        notes: [{ position: { x: 0, y: 1.26, z: 0 } }],
      },
    });
  });

  it('samples the audio master clock at display cadence for the stage', async () => {
    const user = userEvent.setup();
    const audio = new FrameSampleAudio();
    let nextFrame: FrameRequestCallback | undefined;
    vi.stubGlobal('Audio', vi.fn(() => audio));
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
      nextFrame = callback;
      return 1;
    }));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    const source = new Midi();
    source.addTrack().addNote({ midi: 60, time: 0, duration: 1, velocity: 0.6 });
    render(<App />);
    await user.upload(screen.getByLabelText('选择 MIDI 文件'), midiFile(source, 'clock.mid'));
    await waitFor(() => expect(nextFrame).toBeDefined());
    hologramStageMock.mockClear();

    audio.currentTime = 4.25;
    act(() => nextFrame?.(16));

    expect(hologramStageMock.mock.lastCall?.[0]).toMatchObject({ logicalTime: 4.25 });
  });
});
