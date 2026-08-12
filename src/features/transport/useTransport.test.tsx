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
}

function TransportHarness({ audioUrl }: { audioUrl: string | null }) {
  const transport = useTransport(audioUrl);

  return (
    <>
      <output data-testid="state">{transport.state}</output>
      <output data-testid="time">{transport.currentTime}</output>
      <output data-testid="duration">{transport.duration}</output>
      <output data-testid="speed">{transport.speed}</output>
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
