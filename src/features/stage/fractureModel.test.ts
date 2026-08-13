import { describe, expect, it } from 'vitest';
import { directorStateAt } from '../performance/director';
import { buildShardModel, shardTransformAt } from './fractureModel';

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
});
