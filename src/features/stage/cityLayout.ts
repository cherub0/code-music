import { mulberry32 } from '../performance/seed';

export type CityVector = [number, number, number];

export type BuildingRecord = {
  position: CityVector;
  scale: CityVector;
  magenta: boolean;
  side: -1 | 1;
};

export type LightStripRecord = {
  position: CityVector;
  scale: CityVector;
  magenta: boolean;
};

export type RoadRecord = {
  position: CityVector;
  scale: CityVector;
};

export type TrafficTrailRecord = {
  position: CityVector;
  scale: CityVector;
  magenta: boolean;
};

export type CityLayout = {
  buildings: BuildingRecord[];
  lightStrips: LightStripRecord[];
  roadSegments: RoadRecord[];
  trafficTrails: TrafficTrailRecord[];
  length: number;
};

const BLOCK_LENGTH = 5;

export function buildCityLayout(durationSeconds: number, seed: number, density: 'high' | 'low'): CityLayout {
  const length = Math.max(18, durationSeconds * 1.5 + 18);
  const random = mulberry32(seed);
  const blockCount = Math.ceil(length / BLOCK_LENGTH) + 1;
  const buildings: BuildingRecord[] = [];
  const lightStrips: LightStripRecord[] = [];
  const roadSegments: RoadRecord[] = [];
  const trafficTrails: TrafficTrailRecord[] = [];

  for (let blockIndex = 0; blockIndex < blockCount; blockIndex += 1) {
    const z = 3 + blockIndex * BLOCK_LENGTH;
    const includeBlock = density === 'high' || blockIndex % 2 === 0;

    roadSegments.push({
      position: [0, -4.65, z],
      scale: [8.8, 0.1, BLOCK_LENGTH - 0.16],
    });

    for (const side of [-1, 1] as const) {
      const index = blockIndex * 2 + (side === -1 ? 0 : 1);
      const width = 1.45 + random() * 2.8;
      const height = 5 + random() * 11;
      const depth = 2 + random() * 3;
      const setback = 4.5 + width / 2 + random() * 5.5;
      const magenta = index % 7 === 0;
      const building: BuildingRecord = {
        position: [side * setback, -4 + height / 2, z + (random() - 0.5) * 1.1],
        scale: [width, height, depth],
        magenta,
        side,
      };

      if (includeBlock) {
        buildings.push(building);
        lightStrips.push({
          position: [
            building.position[0] - side * (width / 2 + 0.055),
            building.position[1],
            building.position[2],
          ],
          scale: [0.08, height * 0.66, 0.14],
          magenta,
        });
        lightStrips.push({
          position: [building.position[0], -4 + height * 0.62, building.position[2] - depth / 2 - 0.055],
          scale: [width * 0.78, 0.08, 0.11],
          magenta,
        });
      }
    }

    if (blockIndex % 2 === 0) {
      const trafficTrail: TrafficTrailRecord = {
        position: [random() > 0.5 ? -1.4 : 1.4, -4.47, z + 1.2],
        scale: [0.07, 0.018, 2.2 + random() * 1.5],
        magenta: blockIndex % 6 === 0,
      };

      if (density === 'high') trafficTrails.push(trafficTrail);
    }
  }

  return { buildings, lightStrips, roadSegments, trafficTrails, length };
}
