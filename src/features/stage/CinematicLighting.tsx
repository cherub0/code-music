import { useEffect, useMemo, useRef } from 'react';
import { Color, Matrix4, type InstancedMesh } from 'three';
import type { DirectorState } from '../performance/director';
import type { BuildingRecord, CityLayout, CityVector } from './cityLayout';
import { buildCityLayout } from './cityLayout';
import { cityAtmosphereAt, type AtmosphereParticle } from './cityAtmosphere';
import { ensureInstanceColors } from './instanceColors';
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
    <meshStandardMaterial color="#01030a" emissive="#020817" emissiveIntensity={0.72} metalness={0.86} roughness={0.28} />
  </instancedMesh>;
}

function CityParticles({ particles, opacity }: { particles: AtmosphereParticle[]; opacity: number }) {
  const meshRef = useInstanceMatrices(particles);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    ensureInstanceColors(mesh, particles.length);
    particles.forEach((particle, index) => mesh.setColorAt(index, particle.magenta ? MAGENTA : CYAN));
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [meshRef, particles]);

  return <instancedMesh ref={meshRef} args={[undefined, undefined, particles.length]} frustumCulled={false}>
    <sphereGeometry args={[1, 5, 5]} />
    <meshBasicMaterial opacity={opacity} transparent toneMapped={false} vertexColors />
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

    ensureInstanceColors(mesh, trafficTrails.length);
    trafficTrails.forEach((trail, index) => mesh.setColorAt(index, trail.magenta ? MAGENTA : CYAN));
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [meshRef, trafficTrails]);

  return <instancedMesh ref={meshRef} args={[undefined, undefined, trafficTrails.length]} frustumCulled={false}>
    <boxGeometry args={[1, 1, 1]} />
    <meshBasicMaterial vertexColors toneMapped={false} />
  </instancedMesh>;
}

export function CinematicLighting({ duration, logicalTime, state, previewQuality, quality, seed = CITY_SEED, density }: { duration:number; logicalTime: number; state: DirectorState['lighting']; previewQuality: PreviewRenderQuality; quality: StageQuality; seed?: number; density?: 'high' | 'low' }) {
  const low = density ? density === 'low' : quality === 'preview' && previewQuality === 'low';
  const city = useMemo(() => cinematicCityLayout(duration, low ? 'low' : 'high', seed), [duration, low, seed]);
  const atmosphere = useMemo(
    () => cityAtmosphereAt(logicalTime, duration, seed, low ? 'low' : 'high'),
    [duration, logicalTime, low, seed],
  );
  const [cyanLight, magentaLight, overheadLight] = atmosphere.lights;

  return <group name="cyberpunk-city">
    <ambientLight color="#071323" intensity={0.28 + state.atmosphere * 0.2}/>
    <pointLight color="#48f5ff" decay={1.6} intensity={20 * state.cyan} position={cyanLight.position} distance={54}/>
    <pointLight color="#ff35bd" decay={1.6} intensity={16 * state.magenta} position={magentaLight.position} distance={46}/>
    {!low && <pointLight color="#a7fbff" decay={1.7} intensity={13 * state.cyan} position={overheadLight.position} distance={38}/>}
    <mesh position={[0, -4.7, city.length / 2]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[8.9, city.length + 8]} />
      <meshStandardMaterial color="#010207" metalness={0.88} roughness={0.3} />
    </mesh>
    <CityRoadSegments roadSegments={city.roadSegments} />
    <CityBuildings buildings={city.buildings} />
    <CityLightStrips lightStrips={city.lightStrips} />
    {!low && <TrafficTrails trafficTrails={city.trafficTrails} />}
    <CityParticles particles={atmosphere.particles} opacity={0.28 + state.atmosphere * 0.32} />
  </group>;
}
