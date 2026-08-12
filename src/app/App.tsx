import { useRef, useState } from 'react';
import { FilePanel } from '../features/files/FilePanel';
import { validateAudioFile, validateMidiFile } from '../features/files/fileTypes';
import { useAppStore } from '../store/useAppStore';

function metadataFrom(file: File) {
  return { name: file.name, size: file.size, type: file.type };
}

export function App() {
  const audio = useAppStore((state) => state.audio);
  const midi = useAppStore((state) => state.midi);
  const setAudio = useAppStore((state) => state.setAudio);
  const setMidi = useAppStore((state) => state.setMidi);
  const audioFileRef = useRef<File | null>(null);
  const midiFileRef = useRef<File | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [midiError, setMidiError] = useState<string | null>(null);

  const handleAudioSelected = (file: File) => {
    const result = validateAudioFile(file);
    if (!result.ok) {
      setAudioError(result.message);
      return;
    }

    audioFileRef.current = file;
    setAudio(metadataFrom(file));
    setAudioError(null);
  };

  const handleMidiSelected = (file: File) => {
    const result = validateMidiFile(file);
    if (!result.ok) {
      setMidiError(result.message);
      return;
    }

    midiFileRef.current = file;
    setMidi(metadataFrom(file));
    setMidiError(null);
  };

  const canInitialize = audio !== null && midi !== null;

  return (
    <main className="app-shell">
      <aside className="control-panel" aria-label="文件和演出控制">
        <FilePanel
          audioName={audio?.name ?? null}
          midiName={midi?.name ?? null}
          audioError={audioError}
          midiError={midiError}
          onAudioSelected={handleAudioSelected}
          onMidiSelected={handleMidiSelected}
        />
        <button className="primary-action" disabled={!canInitialize} type="button">
          启动演出
        </button>
        <button className="secondary-action" disabled type="button">
          导出视频（即将推出）
        </button>
      </aside>

      <section aria-labelledby="stage-title" className="stage-placeholder">
        <p className="eyebrow">STAGE / STANDBY</p>
        <h2 id="stage-title">等待本地音频与 MIDI</h2>
        <p>选择两个有效文件后即可初始化演出预览。</p>
      </section>

      <section aria-label="时间轴占位" className="timeline-placeholder">
        <span>00:00</span>
        <div aria-hidden="true" className="timeline-track"><i /></div>
        <span>--:--</span>
      </section>
    </main>
  );
}
