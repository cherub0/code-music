import { describe, expect, it } from 'vitest';
import { directorStateAt } from '../performance/director';
import { buildShardModel, shardTransformAt, worldShardTransformAt } from './fractureModel';

const stateAt = (time: number) => directorStateAt({ time, duration: 10, seed: 7, quality: 'high', impact: { age: 1, energy: 0, lowEnergy: 0 } });

describe('fracture model', () => {
  it('builds stable seeded shard identities at fixed capacity', () => {
    expect(buildShardModel(7, 192)).toEqual(buildShardModel(7, 192));
    expect(buildShardModel(7, 192)).toHaveLength(192);
  });
  it('returns the same transform regardless of evaluation order', () => {
    const shard = buildShardModel(7, 1)[0];
    const expected = shardTransformAt(shard, stateAt(3));
    shardTransformAt(shard, stateAt(7));
    expect(shardTransformAt(shard, stateAt(3))).toEqual(expected);
  });

  it.each([
    [232.968 * 0.2, 'fracture'],
    [232.968 * 0.365, 'assemble'],
  ] as const)('keeps most shards inside the camera target window at the real demo %s-second %s sample', (time, _act) => {
    const state = directorStateAt({
      time,
      duration: 232.968,
      seed: 7,
      quality: 'high',
      impact: { age: 1, energy: 0, lowEnergy: 0 },
    });
    const visible = buildShardModel(7, 192)
      .map((shard) => worldShardTransformAt(shard, state))
      .filter(({ position }) => (
        position[2] > state.camera.position[2]
        && Math.abs(position[2] - state.camera.target[2]) < 14
        && Math.abs(position[0] - state.camera.target[0]) < 8
        && Math.abs(position[1] - state.camera.target[1]) < 7
      ));

    expect(visible.length / 192).toBeGreaterThan(0.7);
  });
});
