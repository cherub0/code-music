import { describe, expect, it, vi } from 'vitest';
import { directorStateAt } from '../performance/director';
import { stageComposition } from './HologramStage';

describe('cinematic stage director contract', () => {
  it('returns only props consumed by the city and note-flight component boundaries', () => {
    expect(stageComposition({ duration: 232.9, previewQuality: 'low', quality: 'preview', seed: 31 })).toEqual({
      city: { density: 'low', duration: 232.9, quality: 'preview', seed: 31 },
      noteFlight: { windowSeconds: 4 },
    });

    expect(stageComposition({ duration: 232.9, previewQuality: 'low', quality: 'export-720p', seed: 31 }).city.density).toBe('high');
  });

  it('preserves camera choreography while low quality reduces atmosphere', () => {
    const base = { time: 33, duration: 100, seed: 7, impact: { age: 1, energy: 0, lowEnergy: 0 } };
    const high = directorStateAt({ ...base, quality: 'high' });
    const low = directorStateAt({ ...base, quality: 'low' });
    expect(low.camera).toEqual(high.camera);
    expect(low.act).toBe(high.act);
  });

  it('exposes the director camera and cinematic lighting modules', async () => {
    vi.doMock('@react-three/fiber', () => ({ useFrame: () => undefined }));
    const [camera, lighting] = await Promise.all([import('./DirectorCamera'), import('./CinematicLighting')]);
    expect(camera.DirectorCamera).toBeTypeOf('function');
    expect(lighting.CinematicLighting).toBeTypeOf('function');
  });
});
