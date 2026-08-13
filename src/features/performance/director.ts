import { performanceFrame, type PerformanceAct } from './frame';
import type { ImpactState } from './impacts';

export type DirectorQuality = 'high' | 'low';
export type DirectorInput = {
  time: number; duration: number; seed: number; quality: DirectorQuality; impact: ImpactState;
};
export type DirectorState = {
  act: PerformanceAct;
  camera: { position: [number, number, number]; target: [number, number, number]; fov: number; focusDistance: number };
  monolith: { opacity: number; crackEnergy: number; scanOffset: number };
  fracture: { progress: number; assembly: number; flash: number; shockwave: number; trailEnergy: number };
  lighting: { cyan: number; magenta: number; atmosphere: number };
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const fractureStart = (duration: number) => duration >= 20 ? duration * 0.12 : duration >= 8 ? 2 : duration * 0.2;

export function directorStateAt(input: DirectorInput): DirectorState {
  const time = Math.max(0, input.time);
  const duration = Math.max(0, input.duration);
  const frame = performanceFrame(time, duration, input.seed);
  const fractureAge = time - fractureStart(duration);
  const flash = fractureAge >= 0 && fractureAge < 0.12 ? (1 - fractureAge / 0.12) ** 2 : 0;
  const principalImpulse = fractureAge >= 0 && fractureAge < 0.18
    ? Math.sin(fractureAge / 0.18 * Math.PI) * (1 - fractureAge / 0.18)
    : 0;
  const shakeX = Math.sin(fractureAge * 34) * principalImpulse * 0.045;
  const shakeY = Math.sin(fractureAge * 27) * principalImpulse * 0.025;
  const scoreZ = time * 1.5;
  const orbit = frame.assemblyProgress * Math.PI * (2 / 3);
  const flight = frame.act === 'perform' ? frame.actProgress : 0;

  let position: [number, number, number];
  let target: [number, number, number];
  if (frame.act === 'boot') {
    position = [mix(0.9, 0.15, frame.actProgress) + shakeX, mix(0.55, 0.1, frame.actProgress) + shakeY, mix(-13, -7.2, frame.actProgress)];
    target = [0, 0.15, 0];
  } else if (frame.act === 'fracture') {
    position = [shakeX, 0.2 + shakeY, mix(-6.4, -8.8, frame.actProgress)];
    target = [0, 0.2, mix(0, 3, frame.actProgress)];
  } else if (frame.act === 'assemble') {
    position = [Math.cos(orbit) * 7 + shakeX, 2.8 + Math.sin(orbit * 0.6) + shakeY, scoreZ - 8 + Math.sin(orbit) * 5];
    target = [0, 0, scoreZ + 2];
  } else {
    position = [4.2 + Math.sin(time * 0.08) * 0.28 + shakeX, 2.25 + Math.sin(time * 0.11) * 0.1 + shakeY, scoreZ - mix(11, 8.5, flight)];
    target = [Math.sin((scoreZ + 6) * 0.12) * 0.5, 0, scoreZ + 7];
  }

  return {
    act: frame.act,
    camera: { position, target, fov: 48 + flash * 7 - frame.assemblyProgress * 3, focusDistance: frame.act === 'perform' ? 7 : 11 },
    monolith: {
      opacity: frame.act === 'boot' ? 1 : clamp01(1 - frame.fractureProgress * 1.35),
      crackEnergy: clamp01(frame.actProgress * 0.7 + input.impact.lowEnergy * 0.45),
      scanOffset: (time * 0.37) % 1,
    },
    fracture: {
      progress: frame.fractureProgress,
      assembly: frame.assemblyProgress,
      flash,
      shockwave: clamp01(fractureAge / 0.8) * clamp01(1 - fractureAge / 1.3),
      trailEnergy: clamp01(Math.sin(frame.fractureProgress * Math.PI) + input.impact.energy * 0.4),
    },
    lighting: {
      cyan: 0.6 + input.impact.energy * 0.55 + flash * 0.8,
      magenta: 0.35 + frame.fractureProgress * 0.55 + input.impact.lowEnergy * 0.35,
      atmosphere: 0.35 + frame.assemblyProgress * 0.35,
    },
  };
}
