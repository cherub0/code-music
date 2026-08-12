import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Timeline } from './Timeline';

describe('Timeline', () => {
  it('shows current time and formatted duration', () => {
    render(
      <Timeline
        currentTime={8.25}
        duration={90}
        state="paused"
        onPause={vi.fn()}
        onPlay={vi.fn()}
        onSeek={vi.fn()}
      />,
    );

    expect(screen.getByText('00:08')).toBeInTheDocument();
    expect(screen.getByText('01:30')).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Timeline position' })).toHaveValue('8.25');
  });

  it('pauses during a drag, seeks, and resumes prior playback', () => {
    const onPause = vi.fn();
    const onPlay = vi.fn();
    const onSeek = vi.fn();
    render(
      <Timeline
        currentTime={8}
        duration={90}
        state="playing"
        onPause={onPause}
        onPlay={onPlay}
        onSeek={onSeek}
      />,
    );
    const slider = screen.getByRole('slider', { name: 'Timeline position' });

    fireEvent.pointerDown(slider);
    fireEvent.change(slider, { target: { value: '12.5' } });
    fireEvent.pointerUp(slider);

    expect(onPause).toHaveBeenCalledTimes(1);
    expect(onSeek).toHaveBeenLastCalledWith(12.5);
    expect(onPlay).toHaveBeenCalledTimes(1);
  });
});
