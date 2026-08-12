import { useFrame } from '@react-three/fiber';
import { useMemo } from 'react';
import { Vector3 } from 'three';
import type { PerformanceFrame } from '../performance/frame';
import type { ScoreLayout } from '../score/layout';

type CameraRigProps = {
  frame: PerformanceFrame;
  logicalTime: number;
  score: ScoreLayout;
};

function ribbonX(z: number): number {
  return Math.sin(z * 0.12) * 1.15;
}

export function CameraRig({ frame, logicalTime, score }: CameraRigProps) {
  const target = useMemo(() => new Vector3(), []);

  useFrame(({ camera }) => {
    const safeTime = Math.max(0, Math.min(logicalTime, score.durationSeconds));
    const scoreZ = safeTime * 1.5;
    const follow = frame.assemblyProgress;
    const phraseX = Math.sin(safeTime * 0.42) * 0.38 * frame.cameraProgress;
    const phraseY = Math.sin(safeTime * 0.29) * 0.22 * frame.cameraProgress;
    const targetZ = scoreZ * follow;

    camera.position.set(
      6.8 - follow * 2.2 + phraseX,
      3.2 - follow * 1.35 + phraseY,
      -10 + targetZ,
    );
    target.set(ribbonX(targetZ) * follow, phraseY * 0.3, targetZ + follow * 4.5);
    camera.lookAt(target);
  });

  return null;
}
