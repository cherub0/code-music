import type { TransportState } from '../transport/useTransport';

type ControlPanelProps = {
  offsetSeconds: number;
  speed: number;
  transportState: TransportState;
  onOffsetChange: (seconds: number) => void;
  onSpeedChange: (speed: number) => void;
  onTogglePlayback: () => void;
};

export function ControlPanel({
  offsetSeconds,
  speed,
  transportState,
  onOffsetChange,
  onSpeedChange,
  onTogglePlayback,
}: ControlPanelProps) {
  const playing = transportState === 'playing';

  return (
    <section aria-label="Performance controls" className="transport-controls">
      <button
        className="primary-action"
        disabled={transportState === 'idle' || transportState === 'error'}
        type="button"
        onClick={onTogglePlayback}
      >
        {playing ? 'Pause performance' : 'Play performance'}
      </button>
      <label className="control-field">
        Calibration offset (seconds)
        <input
          aria-label="Calibration offset (seconds)"
          max="10"
          min="-10"
          step="0.01"
          type="number"
          value={offsetSeconds}
          onChange={(event) => onOffsetChange(Number(event.currentTarget.value))}
        />
      </label>
      <label className="control-field">
        Visual speed multiplier
        <input
          aria-label="Visual speed multiplier"
          max="2"
          min="0.5"
          step="0.001"
          type="number"
          value={speed}
          onChange={(event) => onSpeedChange(Number(event.currentTarget.value))}
        />
      </label>
      <p className="control-hint">Speed changes MIDI and animation timing only; audio stays at normal rate.</p>
    </section>
  );
}
