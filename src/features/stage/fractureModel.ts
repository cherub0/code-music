import type { DirectorState } from '../performance/director';
import { mulberry32 } from '../performance/seed';

type Vec3 = [number, number, number];
export type ShardModel = { id: number; origin: Vec3; apex: Vec3; destination: Vec3; rotation: Vec3; scale: Vec3; depthBand: number };
export type ShardTransform = { position: Vec3; rotation: Vec3; scale: Vec3; trail: number };
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const bezier = (a: number, b: number, c: number, t: number) => (1 - t) ** 2 * a + 2 * (1 - t) * t * b + t ** 2 * c;

export function buildShardModel(seed: number, capacity: number): ShardModel[] {
  const random = mulberry32(seed ^ 0x51a4d);
  return Array.from({ length: capacity }, (_, id) => {
    const column = id % 16; const row = Math.floor(id / 16);
    const origin: Vec3 = [(column / 15 - 0.5) * 8, (row / Math.max(1, Math.ceil(capacity / 16) - 1) - 0.5) * 5, 0];
    const destinationZ = -4 + id / Math.max(1, capacity - 1) * 12;
    const lane = [-2.8, 0, 2.8][id % 3];
    return { id, origin,
      apex: [origin[0] * 0.3 + (random() - 0.5) * 10, origin[1] + (random() - 0.35) * 6, 2 + random() * 7],
      destination: [lane + (random() - 0.5) * 0.2, ((id % 9) - 4) * 0.45, destinationZ],
      rotation: [random() * 7, random() * 8, random() * 9],
      scale: [0.18 + random() * 0.42, 0.07 + random() * 0.16, 0.035 + random() * 0.065], depthBand: id % 3,
    };
  });
}

export function shardTransformAt(model: ShardModel, state: DirectorState): ShardTransform {
  const f = state.fracture.progress;
  const a = state.fracture.assembly;
  const airborne: Vec3 = model.origin.map((v, i) => bezier(v, model.apex[i], model.destination[i], f)) as Vec3;
  const position = airborne.map((v, i) => mix(v, model.destination[i], a)) as Vec3;
  return { position, rotation: model.rotation.map((v) => v * f * (1 - a)) as Vec3,
    scale: model.scale.map((v) => v * (1 + Math.sin(f * Math.PI) * 0.45)) as Vec3,
    trail: state.fracture.trailEnergy * (1 - a) * (0.35 + model.depthBand * 0.25) };
}

export function worldShardTransformAt(model: ShardModel, state: DirectorState): ShardTransform {
  const transform = shardTransformAt(model, state);
  return {
    ...transform,
    position: transform.position.map((value, index) => value + state.narrative.anchor[index]) as Vec3,
  };
}
