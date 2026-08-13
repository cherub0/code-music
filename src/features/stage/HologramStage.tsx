import { addAfterEffect, addEffect, Canvas, useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import { performanceFrame } from '../performance/frame';
import { directorStateAt } from '../performance/director';
import { buildImpactTimeline, impactStateAt } from '../performance/impacts';
import type { ScoreLayout } from '../score/layout';
import { DirectorCamera } from './DirectorCamera';
import { CinematicLighting } from './CinematicLighting';
import { CodeMonolith } from './CodeMonolith';
import { ScoreReassembly } from './ScoreReassembly';
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

function StageTelemetry() {
  const camera = useThree((state) => state.camera);
  const renderer = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);

  useEffect(() => {
    const previousAutoReset = renderer.info.autoReset;
    renderer.info.autoReset = false;
    const resetBeforeFrame = addEffect(() => renderer.info.reset());
    const sampleAfterFrame = addAfterEffect(() => {
      const canvas = renderer.domElement;
      canvas.dataset.drawCalls = String(renderer.info.render.calls);
      canvas.dataset.geometries = String(renderer.info.memory.geometries);
      canvas.dataset.textures = String(renderer.info.memory.textures);
      canvas.dataset.sceneObjects = String(scene.children.length);
      canvas.dataset.instancedPools = String(scene.children.filter((child) => child.type === 'InstancedMesh').length);
      canvas.dataset.cameraPose = String(camera.userData.directorPose ?? '');
    });

    return () => {
      resetBeforeFrame();
      sampleAfterFrame();
      renderer.info.autoReset = previousAutoReset;
    };
  }, [camera, renderer, scene]);

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
      data-cinematic-stage="true"
      dpr={dpr}
      frameloop="always"
      gl={{ alpha: false, antialias: quality !== 'preview', powerPreference: 'high-performance' }}
    >
      <color args={['#02040c']} attach="background" />
      <fog args={['#030611', 16, 86]} attach="fog" />
      <CinematicLighting duration={score.durationSeconds} previewQuality={previewQuality} quality={quality} state={director.lighting} />

      <CodeMonolith logicalTime={logicalTime} seed={seed} state={director.monolith} />
      <CinematicFracture capacity={quality === 'preview' && previewQuality === 'low' ? 96 : 192} seed={seed} state={director} />
      <ScoreReassembly logicalTime={logicalTime} state={director} score={score} windowSeconds={previewQuality === 'low' && quality === 'preview' ? 4 : 8} />
      <DirectorCamera state={director.camera} />
      <StageEffects flash={director.fracture.flash} focusDistance={director.camera.focusDistance} logicalTime={logicalTime} previewQuality={previewQuality} quality={quality} />
      <StageTelemetry />
    </Canvas>
  );
}
