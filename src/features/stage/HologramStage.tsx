import { addAfterEffect, addEffect, Canvas, useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import { Box3, Frustum, Matrix4, type InstancedMesh } from 'three';
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

export function stageComposition({
  duration,
  previewQuality,
  quality,
  seed,
}: {
  duration: number;
  previewQuality: PreviewRenderQuality;
  quality: StageQuality;
  seed: number;
}) {
  const lowPreview = quality === 'preview' && previewQuality === 'low';
  return {
    city: { density: lowPreview ? 'low' as const : 'high' as const, duration, quality, seed },
    noteFlight: { windowSeconds: lowPreview ? 4 : 8 },
  };
}

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
      let cityLayers = 0;
      let cityPools = 0;
      let instancedPools = 0;
      let noteFlightLayers = 0;
      let noteFlightPools = 0;
      scene.traverse((object) => {
        if (object.name === 'cyberpunk-city') {
          cityLayers += 1;
          object.traverse((child) => { if ('isInstancedMesh' in child && child.isInstancedMesh === true) cityPools += 1; });
        }
        if (object.name === 'note-flight') {
          noteFlightLayers += 1;
          object.traverse((child) => { if ('isInstancedMesh' in child && child.isInstancedMesh === true) noteFlightPools += 1; });
        }
        if ('isInstancedMesh' in object && object.isInstancedMesh === true) instancedPools += 1;
      });
      const semanticObjectInFrustum = (name: string) => {
        const object = scene.getObjectByName(name);
        if (!object || !object.visible) return false;
        camera.updateMatrixWorld();
        object.updateWorldMatrix(true, true);
        const bounds = new Box3().setFromObject(object, true);
        const projection = new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
        return !bounds.isEmpty() && new Frustum().setFromProjectionMatrix(projection).intersectsBox(bounds);
      };
      const activeTrails = scene.getObjectByName('active-note-trails');
      canvas.dataset.drawCalls = String(renderer.info.render.calls);
      canvas.dataset.geometries = String(renderer.info.memory.geometries);
      canvas.dataset.textures = String(renderer.info.memory.textures);
      canvas.dataset.sceneObjects = String(scene.children.length);
      canvas.dataset.instancedPools = String(instancedPools);
      canvas.dataset.cityLayers = String(cityLayers);
      canvas.dataset.cityPools = String(cityPools);
      canvas.dataset.noteFlightLayers = String(noteFlightLayers);
      canvas.dataset.noteFlightPools = String(noteFlightPools);
      canvas.dataset.activeNoteTrails = String(
        activeTrails && 'isInstancedMesh' in activeTrails && activeTrails.isInstancedMesh === true
          ? (activeTrails as InstancedMesh).count
          : 0,
      );
      canvas.dataset.monolithInFrustum = String(semanticObjectInFrustum('code-monolith'));
      canvas.dataset.fractureInFrustum = String(semanticObjectInFrustum('cinematic-fracture'));
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
  const composition = useMemo(
    () => stageComposition({ duration: score.durationSeconds, previewQuality, quality, seed }),
    [previewQuality, quality, score.durationSeconds, seed],
  );
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
      <CinematicLighting {...composition.city} logicalTime={logicalTime} previewQuality={previewQuality} state={director.lighting} />

      <CodeMonolith anchor={director.narrative.anchor} logicalTime={logicalTime} seed={seed} state={director.monolith} />
      <CinematicFracture capacity={quality === 'preview' && previewQuality === 'low' ? 96 : 192} seed={seed} state={director} />
      <ScoreReassembly logicalTime={logicalTime} state={director} score={score} windowSeconds={composition.noteFlight.windowSeconds} />
      <DirectorCamera state={director.camera} />
      <StageEffects flash={director.fracture.flash} focusDistance={director.camera.focusDistance} logicalTime={logicalTime} previewQuality={previewQuality} quality={quality} />
      <StageTelemetry />
    </Canvas>
  );
}
