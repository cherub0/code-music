import type { ScoreLayout } from '../score/layout';

export type MusicalImpact = { time: number; energy: number; lowEnergy: number };
export type ImpactState = { age: number; energy: number; lowEnergy: number };

const GROUP_WINDOW = 0.06;
const IMPACT_DURATION = 0.32;
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export function buildImpactTimeline(score: ScoreLayout): MusicalImpact[] {
  const groups: Array<{ time: number; energy: number; low: number }> = [];
  score.notes.forEach((note) => {
    let group = groups.at(-1);
    if (!group || note.startSeconds - group.time > GROUP_WINDOW) {
      group = { time: note.startSeconds, energy: 0, low: 0 };
      groups.push(group);
    }
    const weight = clamp01(note.velocity) ** 2;
    group.energy += weight;
    if (note.pitch < 48) group.low += weight * (1 + (48 - note.pitch) / 24);
  });
  const peak = Math.max(1e-6, ...groups.map((group) => Math.sqrt(group.energy)));
  return groups.map((group) => ({
    time: group.time,
    energy: clamp01(Math.sqrt(group.energy) / peak),
    lowEnergy: clamp01(Math.sqrt(group.low) / peak),
  }));
}

export function impactStateAt(time: number, impacts: MusicalImpact[]): ImpactState {
  let low = 0;
  let high = impacts.length - 1;
  let match = -1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    if (impacts[middle].time <= time) { match = middle; low = middle + 1; }
    else high = middle - 1;
  }
  if (match < 0) return { age: Math.max(0, time), energy: 0, lowEnergy: 0 };
  const impact = impacts[match];
  const age = Math.max(0, time - impact.time);
  if (age >= IMPACT_DURATION) return { age, energy: 0, lowEnergy: 0 };
  const envelope = (1 - age / IMPACT_DURATION) ** 2;
  return { age, energy: impact.energy * envelope, lowEnergy: impact.lowEnergy * envelope };
}
