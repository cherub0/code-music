import type { TransportState } from '../transport/useTransport';

export type PreviewQuality = 'Auto' | 'High' | 'Low';

type ControlPanelProps = {
  offsetSeconds: number;
  previewQuality?: PreviewQuality;
  qualityNotice?: string | null;
  speed: number;
  transportState: TransportState;
  onOffsetChange: (seconds: number) => void;
  onPreviewQualityChange?: (quality: PreviewQuality) => void;
  onSpeedChange: (speed: number) => void;
  onTogglePlayback: () => void;
};

function boundedInputValue(value: string, minimum: number, maximum: number): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.min(maximum, Math.max(minimum, parsed));
}

export function ControlPanel({
  offsetSeconds,
  previewQuality = 'Auto',
  qualityNotice = null,
  speed,
  transportState,
  onOffsetChange,
  onPreviewQualityChange = () => undefined,
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
          onChange={(event) => {
            const nextValue = boundedInputValue(event.currentTarget.value, -10, 10);
            if (nextValue !== null) onOffsetChange(nextValue);
          }}
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
          onChange={(event) => {
            const nextValue = boundedInputValue(event.currentTarget.value, 0.5, 2);
            if (nextValue !== null) onSpeedChange(nextValue);
          }}
        />
      </label>
      <p className="control-hint">Speed changes MIDI and animation timing only; audio stays at normal rate.</p>
      <label className="control-field">
        Preview Quality
        <select
          aria-label="Preview Quality"
          value={previewQuality}
          onChange={(event) => onPreviewQualityChange(event.currentTarget.value as PreviewQuality)}
        >
          <option value="Auto">Auto</option>
          <option value="High">High</option>
          <option value="Low">Low</option>
        </select>
      </label>
      {qualityNotice ? (
        <p aria-label="Preview quality status" className="control-hint" role="status">
          {qualityNotice}
        </p>
      ) : null}
    </section>
  );
}
