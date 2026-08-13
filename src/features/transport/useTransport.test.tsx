import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useTransport } from './useTransport';

class FakeAudioElement extends EventTarget {
  currentTime = 0;
  duration = 90;
  playbackRate = 1;
  paused = true;
  src = '';
  readonly load = vi.fn();
  readonly play = vi.fn(async () => {
    this.paused = false;
  });
  readonly pause = vi.fn(() => {
    this.paused = true;
  });
  readonly removeAttribute = vi.fn((name: string) => {
    if (name === 'src') this.src = '';
  });
}

function TransportHarness({ audioName = null, audioUrl }: { audioName?: string | null; audioUrl: string | null }) {
  const transport = useTransport(audioUrl, audioName);

  return (
    <>
      <output data-testid="state">{transport.state}</output>
      <output data-testid="time">{transport.currentTime}</output>
      <output data-testid="duration">{transport.duration}</output>
      <output data-testid="speed">{transport.speed}</output>
      <output data-testid="error">{transport.error}</output>
      <button type="button" onClick={() => void transport.play()}>play</button>
      <button type="button" onClick={transport.pause}>pause</button>
      <button type="button" onClick={() => transport.seek(12.5)}>seek</button>
      <button type="button" onClick={() => transport.setSpeed(1.5)}>speed</button>
    </>
  );
}

describe('useTransport', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reflects media playback, direct seeks, and logical-only speed changes', async () => {
    const audio = new FakeAudioElement();
    vi.stubGlobal('Audio', vi.fn(() => audio));
    render(<TransportHarness audioUrl="blob:demo" />);

    expect(screen.getByTestId('duration')).toHaveTextContent('90');
    expect(screen.getByTestId('time')).toHaveTextContent('0');

    await act(async () => {
      screen.getByRole('button', { name: 'play' }).click();
    });
    expect(screen.getByTestId('state')).toHaveTextContent('playing');

    act(() => {
      audio.currentTime = 8.25;
      audio.dispatchEvent(new Event('timeupdate'));
      screen.getByRole('button', { name: 'seek' }).click();
      screen.getByRole('button', { name: 'speed' }).click();
    });
    expect(audio.currentTime).toBe(12.5);
    expect(screen.getByTestId('time')).toHaveTextContent('12.5');
    expect(screen.getByTestId('speed')).toHaveTextContent('1.5');
    expect(audio.playbackRate).toBe(1);

    act(() => {
      screen.getByRole('button', { name: 'pause' }).click();
    });
    expect(screen.getByTestId('state')).toHaveTextContent('paused');
  });

  it('reports an actionable decode error for the affected file and clears it on replacement', () => {
    const audio = new FakeAudioElement() as FakeAudioElement & {
      error: { code: number; message: string } | null;
    };
    audio.error = null;
    vi.stubGlobal('Audio', vi.fn(() => audio));
    const view = render(<TransportHarness audioName="broken.wav" audioUrl="blob:broken" />);

    act(() => {
      audio.error = { code: 3, message: 'DEMUXER_ERROR_COULD_NOT_OPEN' };
      audio.dispatchEvent(new Event('error'));
    });

    expect(screen.getByTestId('state')).toHaveTextContent('error');
    expect(screen.getByTestId('error')).toHaveTextContent('broken.wav');
    expect(screen.getByTestId('error')).toHaveTextContent('浏览器无法解码');
    expect(screen.getByTestId('error')).toHaveTextContent('请更换该音频文件');
    expect(screen.getByTestId('error')).toHaveTextContent('重新编码为标准 MP3、WAV 或 OGG');

    view.rerender(<TransportHarness audioName="replacement.ogg" audioUrl="blob:replacement" />);

    expect(screen.getByTestId('state')).toHaveTextContent('paused');
    expect(screen.getByTestId('error')).toBeEmptyDOMElement();
  });

  it('does not assign an empty src while clearing the selected audio', () => {
    const audio = new FakeAudioElement() as FakeAudioElement & {
      emptySrcAssignments: number;
      error: { code: number; message: string } | null;
    };
    let source = '';
    audio.emptySrcAssignments = 0;
    audio.error = null;
    Object.defineProperty(audio, 'src', {
      configurable: true,
      get: () => source,
      set: (value: string) => {
        source = value;
        if (value === '') {
          audio.emptySrcAssignments += 1;
          audio.error = { code: 4, message: 'MEDIA_ELEMENT_ERROR: Empty src attribute' };
          audio.dispatchEvent(new Event('error'));
        }
      },
    });
    audio.removeAttribute.mockImplementation((name) => {
      if (name === 'src') source = '';
    });
    vi.stubGlobal('Audio', vi.fn(() => audio));
    const view = render(<TransportHarness audioName="demo.ogg" audioUrl="blob:demo" />);

    view.rerender(<TransportHarness audioName={null} audioUrl={null} />);

    expect(screen.getByTestId('state')).toHaveTextContent('idle');
    expect(screen.getByTestId('error')).toBeEmptyDOMElement();
    expect(audio.emptySrcAssignments).toBe(0);
  });

  it('removes media listeners when disposed', () => {
    const audio = new FakeAudioElement();
    const removeListener = vi.spyOn(audio, 'removeEventListener');
    vi.stubGlobal('Audio', vi.fn(() => audio));
    const view = render(<TransportHarness audioUrl="blob:demo" />);

    view.unmount();

    expect(removeListener).toHaveBeenCalledTimes(4);
  });

  it('does not pause a source-less element during disposal', () => {
    const audio = new FakeAudioElement();
    vi.stubGlobal('Audio', vi.fn(() => audio));
    const view = render(<TransportHarness audioUrl={null} />);
    audio.src = 'http://localhost/';

    view.unmount();

    expect(audio.pause).not.toHaveBeenCalled();
  });
});
