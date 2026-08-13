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
const SCORE_TRAVEL = 1.5;
const PRINCIPAL_IMPULSE_DURATION = 0.18;

export function directorStateAt(input: DirectorInput): DirectorState {
  const time = Math.max(0, input.time);
  const duration = Math.max(0, input.duration);
  const frame = performanceFrame(time, duration, input.seed);
  const fractureAge = time - fractureStart(duration);
  const flash = fractureAge >= 0 && fractureAge < 0.12 ? (1 - fractureAge / 0.12) ** 2 : 0;
  const principalImpulse = fractureAge >= 0 && fractureAge < PRINCIPAL_IMPULSE_DURATION - 1e-9
    ? Math.sin(fractureAge / PRINCIPAL_IMPULSE_DURATION * Math.PI) * (1 - fractureAge / PRINCIPAL_IMPULSE_DURATION)
    : 0;
  const shakeX = principalImpulse === 0 ? 0 : Math.sin(fractureAge * 34) * principalImpulse * 0.045;
  const shakeY = principalImpulse === 0 ? 0 : Math.sin(fractureAge * 27) * principalImpulse * 0.025;
  const scoreZ = time * SCORE_TRAVEL;
  const flightBlend = frame.act === 'perform' ? clamp01(frame.actProgress * 4) : 0;

  let position: [number, number, number];
  let target: [number, number, number];
  if (frame.act === 'boot') {
    position = [mix(-0.55, -0.18, frame.actProgress) + shakeX, mix(0.65, 0.45, frame.actProgress) + shakeY, scoreZ - 10.6];
    target = [0.1, 0.15, scoreZ + 8.8];
  } else if (frame.act === 'fracture') {
    position = [shakeX, 0.4 + shakeY, scoreZ - 9.8];
    target = [0, 0.15, scoreZ + 8.9];
  } else if (frame.act === 'assemble') {
    position = [mix(-0.1, 0.45, frame.actProgress) + shakeX, mix(0.4, 0.65, frame.actProgress) + shakeY, scoreZ - 9.4];
    target = [mix(0, 0.3, frame.actProgress), 0.1, scoreZ + 9.5];
  } else {
    position = [mix(0.45, 4.3, flightBlend) + shakeX, mix(0.65, 2.35, flightBlend) + shakeY, scoreZ - mix(9.4, 3.7, flightBlend)];
    target = [mix(0.3, 0, flightBlend), mix(0.1, 0.25, flightBlend), scoreZ + mix(9.5, 3.75, flightBlend)];
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
