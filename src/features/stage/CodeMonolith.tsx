import { useLayoutEffect, useMemo, useRef } from 'react';
import { InstancedMesh, Object3D, Vector3 } from 'three';
import type { DirectorState } from '../performance/director';
import { mulberry32 } from '../performance/seed';

type CodeMonolithProps = { anchor: [number, number, number]; logicalTime: number; seed: number; state: DirectorState['monolith'] };
export type CrackSegment = { parent: number; threshold: number; start: [number, number]; end: [number, number] };
const CRACK_CAPACITY = 48;
export const MONOLITH_META = { crackCapacity: CRACK_CAPACITY, layerCount: 3 } as const;
const CODE_WIDTHS = [4.8, 3.1, 5.4, 2.6, 4.2, 5.8, 3.7, 4.9, 2.9, 5.2] as const;
const TOKEN_PATTERN = [0.18,0.32,0.12,0.46,0.22,0.14,0.38,0.17,0.28,0.11,0.42] as const;

export function buildCrackSegments(seed: number): CrackSegment[] {
  const random = mulberry32(seed ^ 0xc0de51);
  const segments: CrackSegment[] = [];
  for (let index = 0; index < CRACK_CAPACITY; index += 1) {
    const parent = index < 3 ? -1 : Math.floor(random() * index);
    const origin = parent < 0 ? [random() * 0.5 - 0.25, random() * 0.5 - 0.25] : segments[parent].end;
    const angle = (random() - 0.5) * 2.2 + (origin[0] > 0 ? 0.2 : -0.2);
    const length = 0.18 + random() * 0.52;
    segments.push({
      parent, threshold: index / CRACK_CAPACITY * 0.82,
      start: [origin[0], origin[1]],
      end: [origin[0] + Math.sin(angle) * length, origin[1] + Math.cos(angle) * length],
    });
  }
  return segments;
}

export function CodeMonolith({ anchor, logicalTime, seed, state }: CodeMonolithProps) {
  const crackRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const cracks = useMemo(() => buildCrackSegments(seed), [seed]);

  useLayoutEffect(() => {
    const mesh = crackRef.current;
    if (!mesh || typeof mesh.setMatrixAt !== 'function') return;
    cracks.forEach((segment, index) => {
      const start = new Vector3(segment.start[0] * 3.6, segment.start[1] * 2.2, 0.2);
      const end = new Vector3(segment.end[0] * 3.6, segment.end[1] * 2.2, 0.2);
      const delta = end.clone().sub(start);
      const active = state.crackEnergy >= segment.threshold;
      dummy.position.copy(start).add(end).multiplyScalar(0.5);
      dummy.rotation.set(0, 0, Math.atan2(delta.y, delta.x));
      dummy.scale.set(active ? delta.length() : 0, active ? 0.018 + state.crackEnergy * 0.018 : 0, 0.025);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [cracks, dummy, state.crackEnergy]);

  const scanY = 2.35 - state.scanOffset * 4.7;
  return (
    <group name="code-monolith" position={anchor} visible={state.opacity > 0.001}>
      {[0, 1, 2].map((layer) => (
        <group key={layer} position={[layer * 0.1 - 0.1, layer * 0.04, layer * -0.22]}>
          <mesh><boxGeometry args={[8.2 + layer * 0.25, 5.05 + layer * 0.18, 0.08]} />
            <meshStandardMaterial color="#020814" emissive={layer === 0 ? '#062b3a' : '#03131e'} emissiveIntensity={1.2} opacity={state.opacity * (1 - layer * 0.22)} transparent />
          </mesh>
          {CODE_WIDTHS.map((width, index) => (
            <mesh key={`${layer}-${index}`} position={[-3.45 + width / 2, 1.85 - index * 0.4, 0.08]}>
              <boxGeometry args={[width * (1 - layer * 0.05), 0.055, 0.02]} />
              <meshBasicMaterial color={(index + layer) % 4 === 0 ? '#ff35bd' : '#55f6ff'} opacity={state.opacity * (0.78 - layer * 0.2)} transparent toneMapped={false} />
            </mesh>
          ))}
          {TOKEN_PATTERN.map((width,index)=><mesh key={`token-${layer}-${index}`} position={[-3.55+(index%6)*1.18,1.67-Math.floor(index/6)*2.85,0.115]}>
            <boxGeometry args={[width,0.12,0.025]}/><meshBasicMaterial color={index%3===0?'#ff159f':'#9bfbff'} opacity={state.opacity*(.75-layer*.18)} transparent toneMapped={false}/>
          </mesh>)}
        </group>
      ))}
      <instancedMesh ref={crackRef} args={[undefined, undefined, CRACK_CAPACITY]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#eaffff" transparent opacity={state.opacity * 0.48} toneMapped={false} />
      </instancedMesh>
      <mesh position={[0, scanY, 0.3]}><boxGeometry args={[7.8, 0.018, 0.02]} />
        <meshBasicMaterial color="#ffffff" opacity={state.opacity * (0.5 + 0.25 * Math.sin(logicalTime * 17))} transparent toneMapped={false} />
      </mesh>
    </group>
  );
}
