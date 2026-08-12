import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ControlPanel } from './ControlPanel';

describe('ControlPanel', () => {
  it('offers Auto, High, and Low preview quality and reports an automatic fallback', () => {
    const onPreviewQualityChange = vi.fn();
    render(
      <ControlPanel
        offsetSeconds={0}
        previewQuality="Auto"
        qualityNotice="Auto switched to Low: bloom resolution and the visible note window were reduced."
        speed={1}
        transportState="paused"
        onOffsetChange={vi.fn()}
        onPreviewQualityChange={onPreviewQualityChange}
        onSpeedChange={vi.fn()}
        onTogglePlayback={vi.fn()}
      />,
    );

    const quality = screen.getByRole('combobox', { name: 'Preview Quality' });
    expect(quality).toHaveValue('Auto');
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Auto',
      'High',
      'Low',
    ]);
    expect(screen.getByRole('status')).toHaveTextContent('bloom resolution');
    expect(screen.getByRole('status')).toHaveTextContent('visible note window');

    fireEvent.change(quality, { target: { value: 'High' } });
    expect(onPreviewQualityChange).toHaveBeenCalledWith('High');
  });

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
