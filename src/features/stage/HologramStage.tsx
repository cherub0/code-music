import { addAfterEffect, addEffect, Canvas, useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import { performanceFrame } from '../performance/frame';
import { directorStateAt } from '../performance/director';
import { buildImpactTimeline, impactStateAt } from '../performance/impacts';
import type { ScoreLayout } from '../score/layout';
import { CameraRig } from './CameraRig';
import { CodeTerminal } from './CodeTerminal';
import { CodeMonolith } from './CodeMonolith';
import { ScoreRibbon } from './ScoreRibbon';
import { ShardField } from './ShardField';
import { CinematicFracture } from './CinematicFracture';
import { StageEffects } from './StageEffects';

export type StageQuality = 'preview' | 'export-720p' | 'export-1080p';
export type PreviewRenderQuality = 'high' | 'low';

export type HologramStageProps = {
  score: ScoreLayout;
  logicalTime: number;
  previewQuality?: PreviewRenderQuality;
  quality: StageQuality;
  seed?: number;
};

const CHOREOGRAPHY_SEED = 0x48f1a3;
const CINEMATIC_STAGE = true;

function StageTelemetry() {
  const renderer = useThree((state) => state.gl);

  useEffect(() => {
    const previousAutoReset = renderer.info.autoReset;
    renderer.info.autoReset = false;
    const resetBeforeFrame = addEffect(() => renderer.info.reset());
    const sampleAfterFrame = addAfterEffect(() => {
      const canvas = renderer.domElement;
      canvas.dataset.drawCalls = String(renderer.info.render.calls);
      canvas.dataset.geometries = String(renderer.info.memory.geometries);
      canvas.dataset.textures = String(renderer.info.memory.textures);
    });

    return () => {
      resetBeforeFrame();
      sampleAfterFrame();
      renderer.info.autoReset = previousAutoReset;
    };
  }, [renderer]);

  return null;
}

export function HologramStage({
  score,
  logicalTime,
  quality,
  previewQuality = 'high',
  seed = CHOREOGRAPHY_SEED,
}: HologramStageProps) {
  const frame = useMemo(
    () => performanceFrame(logicalTime, score.durationSeconds, seed),
    [logicalTime, score.durationSeconds, seed],
  );
  const impacts = useMemo(() => buildImpactTimeline(score), [score]);
  const director = useMemo(() => directorStateAt({
    time: logicalTime,
    duration: score.durationSeconds,
    seed,
    quality: previewQuality,
    impact: impactStateAt(logicalTime, impacts),
  }), [impacts, logicalTime, previewQuality, score.durationSeconds, seed]);
  const dpr: number | [number, number] = quality === 'preview' ? [1, 1.5] : 1;

  return (
    <Canvas
      aria-label="Holographic MIDI performance"
      camera={{ far: 420, fov: 48, near: 0.1, position: [6.8, 3.2, -10] }}
      data-act={frame.act}
      dpr={dpr}
      frameloop="always"
      gl={{ alpha: false, antialias: quality !== 'preview', powerPreference: 'high-performance' }}
    >
      <color args={['#02040c']} attach="background" />
      <fog args={['#030611', 16, 86]} attach="fog" />
      <ambientLight color="#204460" intensity={0.58} />
      <pointLight color="#46f7ff" intensity={18} position={[-6, 5, -2]} distance={30} />
      <pointLight color="#ff3fc8" intensity={14} position={[7, -2, 7]} distance={36} />

      {CINEMATIC_STAGE
        ? <CodeMonolith logicalTime={logicalTime} seed={seed} state={director.monolith} />
        : <CodeTerminal frame={frame} logicalTime={logicalTime} />}
      {CINEMATIC_STAGE
        ? <CinematicFracture capacity={quality === 'preview' && previewQuality === 'low' ? 96 : 192} seed={seed} state={director} />
        : <ShardField frame={frame} score={score} />}
      <ScoreRibbon
        frame={frame}
        logicalTime={logicalTime}
        noteWindowSeconds={previewQuality === 'low' && quality === 'preview' ? 4 : 8}
        score={score}
      />
      <CameraRig frame={frame} logicalTime={logicalTime} score={score} />
      <StageEffects logicalTime={logicalTime} previewQuality={previewQuality} quality={quality} />
      <StageTelemetry />
    </Canvas>
  );
}
