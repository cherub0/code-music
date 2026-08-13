import { describe, expect, it, vi } from 'vitest';
import { directorStateAt } from '../performance/director';
import { stageComposition } from './HologramStage';

describe('cinematic stage director contract', () => {
  it('wires one city, note-flight, camera, and effects stack with low-preview density', () => {
    expect(stageComposition({ duration: 232.9, previewQuality: 'low', quality: 'preview', seed: 31 })).toEqual({
      city: { density: 'low', duration: 232.9, quality: 'preview' },
      effects: { count: 1 },
      noteFlight: { duration: 232.9, seed: 31, windowSeconds: 4 },
      camera: { count: 1 },
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
