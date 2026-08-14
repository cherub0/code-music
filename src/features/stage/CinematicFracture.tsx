import { useLayoutEffect, useMemo, useRef } from 'react';
import { Color, InstancedMesh, Object3D } from 'three';
import type { DirectorState } from '../performance/director';
import { buildShardModel, shardTransformAt } from './fractureModel';
import { ensureInstanceColors } from './instanceColors';

export function CinematicFracture({ state, seed, capacity }: { state: DirectorState; seed: number; capacity: number }) {
  const shards = useMemo(() => buildShardModel(seed, capacity), [capacity, seed]);
  const shardRef = useRef<InstancedMesh>(null); const trailRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []); const color = useMemo(() => new Color(), []);
  useLayoutEffect(() => {
    const mesh = shardRef.current; const trails = trailRef.current;
    if (!mesh || !trails) return;
    ensureInstanceColors(mesh, capacity);
    shards.forEach((shard, index) => {
      const transform = shardTransformAt(shard, state);
      dummy.position.set(...transform.position); dummy.rotation.set(...transform.rotation); dummy.scale.set(...transform.scale); dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix); color.set(index % 4 === 0 ? '#ff35bd' : '#55f6ff'); mesh.setColorAt(index, color);
      dummy.scale.set(transform.scale[0] * 0.3, transform.scale[1] * 0.3, transform.trail * 4); dummy.position.z -= transform.trail * 2; dummy.updateMatrix(); trails.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true; trails.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [color, dummy, shards, state]);
  return <group name="cinematic-fracture" position={state.narrative.anchor} visible={state.act === 'fracture' || state.act === 'assemble'}>
    <instancedMesh ref={shardRef} args={[undefined, undefined, capacity]} frustumCulled={false}><boxGeometry args={[1, 1, 1]} /><meshStandardMaterial vertexColors metalness={0.72} roughness={0.18} emissive="#083e50" emissiveIntensity={2.4} /></instancedMesh>
    <instancedMesh ref={trailRef} args={[undefined, undefined, capacity]} frustumCulled={false}><boxGeometry args={[1, 1, 1]} /><meshBasicMaterial color="#6ff8ff" opacity={0.32} transparent toneMapped={false} /></instancedMesh>
    {[0,1,2].map((ring) => <mesh key={ring} scale={1 + state.fracture.shockwave * (8 + ring * 3)} visible={state.fracture.shockwave > 0}><ringGeometry args={[0.95,1,64]} /><meshBasicMaterial color={ring === 1 ? '#ff35bd' : '#9cffff'} opacity={(1-state.fracture.shockwave)*0.5} transparent toneMapped={false} /></mesh>)}
  </group>;
}
