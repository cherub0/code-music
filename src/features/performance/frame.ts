import { mulberry32 } from './seed';

export type PerformanceAct = 'boot' | 'fracture' | 'assemble' | 'perform';

export type PerformanceFrame = {
  act: PerformanceAct;
  actProgress: number;
  terminalOpacity: number;
  fractureProgress: number;
  assemblyProgress: number;
  cameraProgress: number;
};

type ActBoundaries = {
  bootEnd: number;
  fractureEnd: number;
  assemblyEnd: number;
};

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function easeInOut(value: number): number {
  const progress = clamp01(value);
  return progress * progress * (3 - 2 * progress);
}

function boundariesFor(duration: number, useFixedBoundaries: boolean): ActBoundaries {
  if (useFixedBoundaries) {
    return { bootEnd: 2, fractureEnd: 5, assemblyEnd: 8 };
  }

  return {
    bootEnd: 0.12,
    fractureEnd: 0.28,
    assemblyEnd: 0.45,
  };
}

function progressBetween(time: number, start: number, end: number): number {
  return easeInOut((time - start) / Math.max(end - start, Number.EPSILON));
}

export function performanceFrame(time: number, duration: number, seed: number): PerformanceFrame {
  const absoluteTime = Math.max(0, time);
  const safeDuration = Math.max(0, duration);
  const useFixedBoundaries = safeDuration < 20;
  const timelineTime = useFixedBoundaries
    ? absoluteTime
    : absoluteTime / Math.max(safeDuration, Number.EPSILON);
  const timelineDuration = useFixedBoundaries ? safeDuration : 1;
  const { bootEnd, fractureEnd, assemblyEnd } = boundariesFor(safeDuration, useFixedBoundaries);
  const act: PerformanceAct = timelineTime < bootEnd
    ? 'boot'
    : timelineTime < fractureEnd
      ? 'fracture'
      : timelineTime < assemblyEnd
        ? 'assemble'
        : 'perform';
  const actStart = act === 'boot' ? 0 : act === 'fracture' ? bootEnd : act === 'assemble' ? fractureEnd : assemblyEnd;
  const actEnd = act === 'boot' ? bootEnd : act === 'fracture' ? fractureEnd : act === 'assemble' ? assemblyEnd : timelineDuration;
  const random = mulberry32(seed);
  const cameraVariation = 0.9 + random() * 0.2;

  return {
    act,
    actProgress: progressBetween(timelineTime, actStart, actEnd),
    terminalOpacity: act === 'boot' ? progressBetween(timelineTime, 0, bootEnd) : 1,
    fractureProgress: progressBetween(timelineTime, bootEnd, fractureEnd),
    assemblyProgress: progressBetween(timelineTime, fractureEnd, assemblyEnd),
    cameraProgress: clamp01(easeInOut(absoluteTime / Math.max(safeDuration, Number.EPSILON)) * cameraVariation),
  };
}
