import { mulberry32 } from '../performance/seed';
import type { CityVector } from './cityLayout';

export type CityKeyLight = {
  color: 'cyan' | 'magenta' | 'white';
  position: CityVector;
};

export type AtmosphereParticle = {
  magenta: boolean;
  position: CityVector;
  scale: CityVector;
};

export type CityAtmosphere = {
  cityLength: number;
  corridorZ: number;
  lights: CityKeyLight[];
  particles: AtmosphereParticle[];
};

const SCORE_TRAVEL = 1.5;

export function cityAtmosphereAt(
  logicalTime: number,
  duration: number,
  seed: number,
  density: 'high' | 'low',
): CityAtmosphere {
  const cityLength = Math.max(18, Math.max(0, duration) * SCORE_TRAVEL + 18);
  const corridorZ = Math.min(cityLength, Math.max(0, logicalTime) * SCORE_TRAVEL);
  const random = mulberry32(seed ^ 0xa7105);
  const candidates = Array.from({ length: 72 }, (_, index): AtmosphereParticle => ({
    magenta: index % 9 === 0,
    position: [
      (random() - 0.5) * 12,
      -4.1 + random() * 11,
      Math.min(cityLength, Math.max(0, corridorZ + (random() - 0.5) * 36)),
    ],
    scale: [0.035 + random() * 0.07, 0.035 + random() * 0.07, 0.035 + random() * 0.07],
  }));

  return {
    cityLength,
    corridorZ,
    lights: [
      { color: 'cyan', position: [-5.4, 4.6, corridorZ + 2] },
      { color: 'magenta', position: [5.2, 1.4, corridorZ + 6] },
      { color: 'white', position: [0, 7.2, corridorZ - 6] },
    ],
    particles: density === 'low' ? candidates.filter((_, index) => index % 2 === 0) : candidates,
  };
}
