type FilePanelProps = {
  audioName: string | null;
  midiName: string | null;
  audioError: string | null;
  midiError: string | null;
  midiRecovery?: string | null;
  midiSummary: string | null;
  durationWarning?: string | null;
  demoError?: string | null;
  demoStatus?: string | null;
  demoLoading?: boolean;
  onAudioSelected: (file: File) => void;
  onDemoRequested?: () => void;
  onMidiSelected: (file: File) => void;
};

function firstSelectedFile(event: React.ChangeEvent<HTMLInputElement>): File | null {
  return event.currentTarget.files?.item(0) ?? null;
}

export function FilePanel({
  audioName,
  midiName,
  audioError,
  midiError,
  midiRecovery = null,
  midiSummary,
  durationWarning = null,
  demoError = null,
  demoStatus = null,
  demoLoading = false,
  onAudioSelected,
  onDemoRequested = () => undefined,
  onMidiSelected,
}: FilePanelProps) {
  return (
    <section aria-labelledby="file-panel-title" className="file-panel">
      <p className="eyebrow">LOCAL INPUT</p>
      <h1 id="file-panel-title">全息 MIDI 可视化器</h1>
      <p className="local-notice">音频和 MIDI 仅在当前浏览器本地处理，不会上传。</p>

      <button
        className="secondary-action"
        disabled={demoLoading}
        type="button"
        onClick={onDemoRequested}
      >
        {demoLoading ? 'Loading built-in demo…' : 'Load built-in demo'}
      </button>
      {demoStatus ? <p className="file-status" role="status">{demoStatus}</p> : null}
      {demoError ? <p className="input-error" role="alert">{demoError}</p> : null}

      <div className="file-input-group">
        <label htmlFor="audio-file">选择音乐文件</label>
        <input
          id="audio-file"
          accept=".mp3,.wav,.ogg,audio/mpeg,audio/wav,audio/ogg"
          type="file"
          onChange={(event) => {
            const file = firstSelectedFile(event);
            if (file) onAudioSelected(file);
          }}
        />
        <p className="file-status">{audioName ?? '支持 MP3、WAV、OGG（最大 250 MB）'}</p>
        {audioError ? <p className="input-error" role="alert">{audioError}</p> : null}
      </div>

      <div className="file-input-group">
        <label htmlFor="midi-file">选择 MIDI 文件</label>
        <input
          id="midi-file"
          accept=".mid,.midi,audio/midi"
          type="file"
          onChange={(event) => {
            const file = firstSelectedFile(event);
            if (file) onMidiSelected(file);
          }}
        />
        <p className="file-status">{midiName ?? '支持 MID、MIDI（最大 20 MB）'}</p>
        {midiSummary ? <p className="file-status" role="status">{midiSummary}</p> : null}
        {midiError ? (
          <p className="input-error" role="alert">
            <span>{midiError}</span>{midiRecovery ? <> <span>{midiRecovery}</span></> : null}
          </p>
        ) : null}
      </div>
      {durationWarning ? <p className="input-error">{durationWarning}</p> : null}
    </section>
  );
}
