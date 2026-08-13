import { describe, expect, it } from 'vitest';
import { buildCrackSegments, MONOLITH_META } from './CodeMonolith';

describe('CodeMonolith', () => {
  it('declares three code layers and a fixed crack capacity', () => {
    expect(MONOLITH_META).toEqual({ crackCapacity: 48, layerCount: 3 });
  });

  it('generates stable branching cracks from the seed', () => {
    expect(buildCrackSegments(17)).toEqual(buildCrackSegments(17));
    expect(buildCrackSegments(17)).toHaveLength(48);
    expect(buildCrackSegments(17).some((segment) => segment.parent >= 0)).toBe(true);
  });
});
