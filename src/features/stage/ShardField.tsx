import { useLayoutEffect, useMemo, useRef } from 'react';
import { Color, InstancedMesh, Object3D, Vector3 } from 'three';
import type { PerformanceFrame } from '../performance/frame';
import { mulberry32 } from '../performance/seed';
import type { ScoreLayout } from '../score/layout';

type ShardFieldProps = {
  frame: PerformanceFrame;
  score: ScoreLayout;
};

type ShardTrajectory = {
  arc: Vector3;
  destination: Vector3;
  rotation: Vector3;
  scale: Vector3;
  start: Vector3;
};

const SHARD_COUNT = 96;
const SHARD_SEED = 0x5a17c9;

function ribbonX(z: number): number {
  return Math.sin(z * 0.12) * 1.15;
}

export function ShardField({ frame, score }: ShardFieldProps) {
  const meshRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const color = useMemo(() => new Color(), []);
  const trajectories = useMemo<ShardTrajectory[]>(() => {
    const random = mulberry32(SHARD_SEED);
    const ribbonLength = Math.max(16, Math.min(80, score.durationSeconds * 1.5));

    return Array.from({ length: SHARD_COUNT }, (_, index) => {
      const column = index % 12;
      const row = Math.floor(index / 12);
      const start = new Vector3((column / 11 - 0.5) * 7, (row / 7 - 0.5) * 4.35 + 0.2, 0);
      const destinationZ = 1.5 + (index / (SHARD_COUNT - 1)) * ribbonLength;
      const destination = new Vector3(
        ribbonX(destinationZ) + (random() - 0.5) * 0.24,
        ((index % 5) - 2) * 0.34,
        destinationZ,
      );
      const arc = new Vector3(
        start.x * 0.25 + (random() - 0.5) * 8,
        3.5 + random() * 5,
        destinationZ * 0.36 + random() * 5,
      );

      return {
        arc,
        destination,
        rotation: new Vector3(random() * Math.PI, random() * Math.PI, random() * Math.PI),
        scale: new Vector3(0.34 + random() * 0.45, 0.12 + random() * 0.16, 0.045 + random() * 0.06),
        start,
      };
    });
  }, [score.durationSeconds]);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const progress = Math.min(1, frame.fractureProgress * 0.45 + frame.assemblyProgress * 0.55);
    const inverse = 1 - progress;
    const curveA = inverse * inverse;
    const curveB = 2 * inverse * progress;
    const curveC = progress * progress;

    trajectories.forEach((trajectory, index) => {
      dummy.position.set(
        curveA * trajectory.start.x + curveB * trajectory.arc.x + curveC * trajectory.destination.x,
        curveA * trajectory.start.y + curveB * trajectory.arc.y + curveC * trajectory.destination.y,
        curveA * trajectory.start.z + curveB * trajectory.arc.z + curveC * trajectory.destination.z,
      );
      dummy.rotation.set(
        trajectory.rotation.x * progress,
        trajectory.rotation.y * progress,
        trajectory.rotation.z * progress,
      );
      dummy.scale.copy(trajectory.scale).multiplyScalar(1 + Math.sin(progress * Math.PI) * 0.35);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
      color.set(index % 4 === 0 ? '#ff52cf' : '#51efff');
      mesh.setColorAt(index, color);
    });

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [color, dummy, frame.assemblyProgress, frame.fractureProgress, trajectories]);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, SHARD_COUNT]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color="#ffffff"
        emissive="#135c72"
        emissiveIntensity={2.1}
        metalness={0.62}
        opacity={Math.max(0.18, frame.terminalOpacity)}
        roughness={0.28}
        transparent
        vertexColors
      />
    </instancedMesh>
  );
}
