import { useEffect, useMemo, useRef } from 'react';
import { Color, Matrix4, type InstancedMesh } from 'three';
import type { DirectorState } from '../performance/director';
import { mulberry32 } from '../performance/seed';
import type { BuildingRecord, CityLayout, CityVector } from './cityLayout';
import { buildCityLayout } from './cityLayout';
import type { PreviewRenderQuality, StageQuality } from './HologramStage';

const CITY_SEED = 0xc17b3;
const CYAN = new Color('#20e8ff');
const MAGENTA = new Color('#ff159f');

type TransformRecord = { position: CityVector; scale: CityVector };

export function cinematicCityLayout(duration: number, density: 'high' | 'low', seed = CITY_SEED): CityLayout {
  return buildCityLayout(duration, seed, density);
}

export function cyberpunkTowerLayout(duration: number): BuildingRecord[] {
  return cinematicCityLayout(duration, 'high').buildings;
}

function useInstanceMatrices(records: TransformRecord[]) {
  const meshRef = useRef<InstancedMesh>(null);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const matrix = new Matrix4();
    records.forEach((record, index) => {
      matrix.makeScale(...record.scale).setPosition(...record.position);
      mesh.setMatrixAt(index, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [records]);

  return meshRef;
}

function CityBuildings({ buildings }: Pick<CityLayout, 'buildings'>) {
  const meshRef = useInstanceMatrices(buildings);

  return <instancedMesh ref={meshRef} args={[undefined, undefined, buildings.length]} frustumCulled={false}>
    <boxGeometry args={[1, 1, 1]} />
    <meshStandardMaterial color="#01030a" metalness={0.9} roughness={0.24} />
  </instancedMesh>;
}

function CityLightStrips({ lightStrips }: Pick<CityLayout, 'lightStrips'>) {
  const cyanStrips = useMemo(() => lightStrips.filter((strip) => !strip.magenta), [lightStrips]);
  const magentaStrips = useMemo(() => lightStrips.filter((strip) => strip.magenta), [lightStrips]);
  const cyanRef = useInstanceMatrices(cyanStrips);
  const magentaRef = useInstanceMatrices(magentaStrips);

  return <>
    <instancedMesh ref={cyanRef} args={[undefined, undefined, cyanStrips.length]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color={CYAN} toneMapped={false} />
    </instancedMesh>
    <instancedMesh ref={magentaRef} args={[undefined, undefined, magentaStrips.length]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color={MAGENTA} toneMapped={false} />
    </instancedMesh>
  </>;
}

function CityRoadSegments({ roadSegments }: Pick<CityLayout, 'roadSegments'>) {
  const meshRef = useInstanceMatrices(roadSegments);

  return <instancedMesh ref={meshRef} args={[undefined, undefined, roadSegments.length]} frustumCulled={false}>
    <boxGeometry args={[1, 1, 1]} />
    <meshStandardMaterial color="#06111b" metalness={0.82} roughness={0.36} />
  </instancedMesh>;
}

function TrafficTrails({ trafficTrails }: Pick<CityLayout, 'trafficTrails'>) {
  const meshRef = useInstanceMatrices(trafficTrails);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    trafficTrails.forEach((trail, index) => mesh.setColorAt(index, trail.magenta ? MAGENTA : CYAN));
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [meshRef, trafficTrails]);

  return <instancedMesh ref={meshRef} args={[undefined, undefined, trafficTrails.length]} frustumCulled={false}>
    <boxGeometry args={[1, 1, 1]} />
    <meshBasicMaterial vertexColors toneMapped={false} />
  </instancedMesh>;
}

export function CinematicLighting({ duration, state, previewQuality, quality, seed = CITY_SEED, density }: { duration:number; state: DirectorState['lighting']; previewQuality: PreviewRenderQuality; quality: StageQuality; seed?: number; density?: 'high' | 'low' }) {
  const low = density ? density === 'low' : quality === 'preview' && previewQuality === 'low';
  const particles = useMemo(() => {
    const random = mulberry32(0xa7105);
    return Array.from({ length: low ? 40 : 96 }, () => [
      (random() - 0.5) * 40,
      (random() - 0.5) * 22,
      random() * 90,
    ] as CityVector);
  }, [low]);
  const city = useMemo(() => cinematicCityLayout(duration, low ? 'low' : 'high', seed), [duration, low, seed]);

  return <group name="cyberpunk-city">
    <ambientLight color="#020611" intensity={0.18 + state.atmosphere * 0.15}/>
    <pointLight color="#48f5ff" intensity={12 * state.cyan} position={[-7,5,-2]} distance={45}/>
    <pointLight color="#ff35bd" intensity={10 * state.magenta} position={[7,-2,4]} distance={48}/>
    {!low && <spotLight color="#a7fbff" intensity={18 * state.cyan} position={[0,7,-7]} angle={0.35} penumbra={0.7}/>}
    <mesh position={[0, -4.7, city.length / 2]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[8.9, city.length + 8]} />
      <meshStandardMaterial color="#010207" metalness={0.88} roughness={0.3} />
    </mesh>
    <CityRoadSegments roadSegments={city.roadSegments} />
    <CityBuildings buildings={city.buildings} />
    <CityLightStrips lightStrips={city.lightStrips} />
    {!low && <TrafficTrails trafficTrails={city.trafficTrails} />}
    {particles.map((particle, index) => <mesh key={index} position={particle} scale={0.012 + (index % 5) * 0.006}>
      <sphereGeometry args={[1,4,4]}/>
      <meshBasicMaterial color={index % 7 === 0 ? '#ff35bd' : '#75f8ff'} opacity={0.2 + state.atmosphere * 0.25} transparent toneMapped={false}/>
    </mesh>)}
  </group>;
}
