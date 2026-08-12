import { useLayoutEffect, useMemo, useRef } from 'react';
import {
  CatmullRomCurve3,
  Color,
  InstancedMesh,
  Object3D,
  Vector3,
} from 'three';
import type { PerformanceFrame } from '../performance/frame';
import { visibleNotes, type ScoreLayout } from '../score/layout';

type ScoreRibbonProps = {
  frame: PerformanceFrame;
  logicalTime: number;
  noteWindowSeconds?: number;
  score: ScoreLayout;
};

const NOTE_WINDOW_SECONDS = 8;
const STAFF_SPACING = 0.34;

function ribbonX(z: number): number {
  return Math.sin(z * 0.12) * 1.15;
}

export function maximumWindowDemand(score: ScoreLayout, noteWindowSeconds = NOTE_WINDOW_SECONDS): number {
  let windowStart = 0;
  let maximum = 0;
  const span = noteWindowSeconds * 2;

  score.notes.forEach((note, windowEnd) => {
    while (note.startSeconds - score.notes[windowStart].startSeconds > span) windowStart += 1;
    maximum = Math.max(maximum, windowEnd - windowStart + 1);
  });

  return Math.max(1, maximum);
}

export function ScoreRibbon({
  frame,
  logicalTime,
  noteWindowSeconds = NOTE_WINDOW_SECONDS,
  score,
}: ScoreRibbonProps) {
  const noteMeshRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const color = useMemo(() => new Color(), []);
  const staffCurves = useMemo(() => {
    const length = Math.max(18, score.durationSeconds * 1.5 + 8);
    const segments = Math.min(512, Math.max(48, Math.ceil(length * 2)));

    return Array.from({ length: 5 }, (_, lineIndex) => {
      const y = (lineIndex - 2) * STAFF_SPACING;
      const points = Array.from({ length: segments + 1 }, (_, pointIndex) => {
        const z = (pointIndex / segments) * length;
        return new Vector3(ribbonX(z), y, z);
      });
      return { curve: new CatmullRomCurve3(points), segments };
    });
  }, [score.durationSeconds]);
  const nearbyNotes = useMemo(
    () => visibleNotes(score, logicalTime, noteWindowSeconds),
    [logicalTime, noteWindowSeconds, score],
  );
  const notePoolSize = useMemo(
    () => maximumWindowDemand(score, noteWindowSeconds),
    [noteWindowSeconds, score],
  );
  const scoreOpacity = frame.act === 'perform' ? 0.92 : frame.assemblyProgress * 0.92;

  useLayoutEffect(() => {
    const mesh = noteMeshRef.current;
    if (!mesh) return;

    mesh.count = nearbyNotes.length;
    nearbyNotes.forEach((note, index) => {
      const noteEnd = note.startSeconds + note.durationSeconds;
      const active = logicalTime >= note.startSeconds && logicalTime <= noteEnd;
      const pulse = active
        ? 1 + note.glow * (0.18 + 0.15 * Math.sin((logicalTime - note.startSeconds) * 14))
        : 0.86;
      const brightness = active ? 0.75 + note.glow * 0.65 : 0.18 + note.glow * 0.28;

      dummy.position.set(
        ribbonX(note.position.z),
        note.position.y,
        note.position.z + Math.max(0.12, note.trailLength) / 2,
      );
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(0.2 * pulse, 0.11 * pulse, Math.max(0.12, note.trailLength));
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
      color.setRGB(0.16 * brightness, 0.76 * brightness, 1 * brightness);
      const trackHash = Array.from(note.trackId).reduce((hash, character) => hash + character.charCodeAt(0), 0);
      if (trackHash % 3 === 0) {
        color.setRGB(1 * brightness, 0.2 * brightness, 0.72 * brightness);
      }
      mesh.setColorAt(index, color);
    });

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [color, dummy, logicalTime, nearbyNotes]);

  return (
    <group visible={scoreOpacity > 0.002}>
      {staffCurves.map(({ curve, segments }, index) => (
        <mesh key={index}>
          <tubeGeometry args={[curve, segments, 0.018, 5, false]} />
          <meshBasicMaterial
            color={index === 2 ? '#9dffff' : '#45e8ff'}
            opacity={scoreOpacity * (index === 2 ? 0.82 : 0.52)}
            transparent
            toneMapped={false}
          />
        </mesh>
      ))}
      <instancedMesh
        ref={noteMeshRef}
        args={[undefined, undefined, notePoolSize]}
        frustumCulled={false}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial opacity={scoreOpacity} transparent toneMapped={false} vertexColors />
      </instancedMesh>
    </group>
  );
}
