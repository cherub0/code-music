import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ControlPanel } from './ControlPanel';

describe('ControlPanel', () => {
  it('exposes calibrated offset and logical speed controls', () => {
    const onOffsetChange = vi.fn();
    const onSpeedChange = vi.fn();
    render(
      <ControlPanel
        offsetSeconds={-1.25}
        speed={1}
        transportState="paused"
        onOffsetChange={onOffsetChange}
        onSpeedChange={onSpeedChange}
        onTogglePlayback={vi.fn()}
      />,
    );
    const offset = screen.getByRole('spinbutton', { name: 'Calibration offset (seconds)' });
    const speed = screen.getByRole('spinbutton', { name: 'Visual speed multiplier' });

    expect(offset).toHaveAttribute('min', '-10');
    expect(offset).toHaveAttribute('max', '10');
    expect(offset).toHaveAttribute('step', '0.01');
    expect(speed).toHaveAttribute('min', '0.5');
    expect(speed).toHaveAttribute('max', '2');
    expect(speed).toHaveAttribute('step', '0.001');

    fireEvent.change(offset, { target: { value: '2.5' } });
    fireEvent.change(speed, { target: { value: '1.25' } });
    expect(onOffsetChange).toHaveBeenCalledWith(2.5);
    expect(onSpeedChange).toHaveBeenCalledWith(1.25);
  });

  it('clamps pasted, empty, and non-finite calibration input', () => {
    const onOffsetChange = vi.fn();
    const onSpeedChange = vi.fn();
    render(
      <ControlPanel
        offsetSeconds={0}
        speed={1}
        transportState="paused"
        onOffsetChange={onOffsetChange}
        onSpeedChange={onSpeedChange}
        onTogglePlayback={vi.fn()}
      />,
    );
    const offset = screen.getByRole('spinbutton', { name: 'Calibration offset (seconds)' });
    const speed = screen.getByRole('spinbutton', { name: 'Visual speed multiplier' });

    fireEvent.change(offset, { target: { value: '12' } });
    fireEvent.change(offset, { target: { value: '-12' } });
    fireEvent.change(speed, { target: { value: '3' } });
    fireEvent.change(speed, { target: { value: '' } });
    fireEvent.change(speed, { target: { value: 'Infinity' } });

    expect(onOffsetChange).toHaveBeenNthCalledWith(1, 10);
    expect(onOffsetChange).toHaveBeenNthCalledWith(2, -10);
    expect(onSpeedChange).toHaveBeenNthCalledWith(1, 2);
    expect(onSpeedChange).toHaveBeenNthCalledWith(2, 0.5);
    expect(onSpeedChange).toHaveBeenNthCalledWith(3, 0.5);
  });
});
