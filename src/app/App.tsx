import { useRef, useState } from 'react';
import { FilePanel } from '../features/files/FilePanel';
import { validateAudioFile, validateMidiFile } from '../features/files/fileTypes';
import { readMidiBytes } from '../features/files/loadLocal';
import { parseMidi } from '../features/midi/parseMidi';
import type { NormalizedScore } from '../features/midi/types';
import { useAppStore } from '../store/useAppStore';

function metadataFrom(file: File) {
  return { name: file.name, size: file.size, type: file.type };
}

function midiSummaryFrom(score: NormalizedScore): string {
  return `MIDI 摘要：${score.tracks.length} 个音轨 · ${score.notes.length} 个音符 · ${score.durationSeconds.toFixed(2)} 秒`;
}

export function App() {
  const audio = useAppStore((state) => state.audio);
  const midi = useAppStore((state) => state.midi);
  const setAudio = useAppStore((state) => state.setAudio);
  const setMidi = useAppStore((state) => state.setMidi);
  const audioFileRef = useRef<File | null>(null);
  const midiFileRef = useRef<File | null>(null);
  const midiRequestRef = useRef(0);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [midiError, setMidiError] = useState<string | null>(null);
  const [midiScore, setMidiScore] = useState<NormalizedScore | null>(null);

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

  const handleMidiSelected = async (file: File) => {
    const requestId = ++midiRequestRef.current;
    const result = validateMidiFile(file);
    if (!result.ok) {
      setMidiError(result.message);
      return;
    }

    try {
      const score = parseMidi(await readMidiBytes(file));
      if (midiRequestRef.current !== requestId) return;

      midiFileRef.current = file;
      setMidi(metadataFrom(file));
      setMidiScore(score);
      setMidiError(null);
    } catch (error) {
      if (midiRequestRef.current !== requestId) return;
      setMidiError(error instanceof Error ? error.message : 'MIDI 文件无法解析，请重新选择。');
    }
  };

  const canInitialize = audio !== null && midi !== null && midiScore !== null;

  return (
    <main className="app-shell">
      <aside className="control-panel" aria-label="文件和演出控制">
        <FilePanel
          audioName={audio?.name ?? null}
          midiName={midi?.name ?? null}
          audioError={audioError}
          midiError={midiError}
          midiSummary={midiScore ? midiSummaryFrom(midiScore) : null}
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
