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
});
