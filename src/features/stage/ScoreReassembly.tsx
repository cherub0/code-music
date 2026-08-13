import { useLayoutEffect, useMemo, useRef } from 'react';
import { Color, InstancedMesh, Object3D } from 'three';
import type { DirectorState } from '../performance/director';
import { visibleNotes, type ScoreLayout } from '../score/layout';
import { maximumWindowDemand } from './ScoreRibbon';
import { noteFlightRecord } from './noteFlight';

export function ScoreReassembly({ score, logicalTime, state, windowSeconds = 8 }: { score: ScoreLayout; logicalTime: number; state: DirectorState; windowSeconds?: number }) {
  const capacity = useMemo(() => maximumWindowDemand(score, windowSeconds), [score, windowSeconds]);
  const records = useMemo(
    () => visibleNotes(score, logicalTime, windowSeconds).map((note) => noteFlightRecord(note, logicalTime)),
    [score, logicalTime, windowSeconds],
  );
  const heads = useRef<InstancedMesh>(null);
  const stems = useRef<InstancedMesh>(null);
  const trails = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const color = useMemo(() => new Color(), []);

  useLayoutEffect(() => {
    if (!heads.current || !stems.current || !trails.current) return;

    heads.current.count = records.length;
    stems.current.count = records.length;
    trails.current.count = records.length;
    records.forEach((record, index) => {
      const [x, y, z] = record.position;
      const headScale = record.scale * (1 + record.energy * 0.3);

      dummy.position.set(x, y, z);
      dummy.scale.set(headScale, headScale * 0.7, 0.07);
      dummy.updateMatrix();
      heads.current!.setMatrixAt(index, dummy.matrix);
      color.set(record.color);
      heads.current!.setColorAt(index, color);

      dummy.position.set(x, y + 0.34, z);
      dummy.scale.set(0.022, 0.68, 0.022);
      dummy.updateMatrix();
      stems.current!.setMatrixAt(index, dummy.matrix);

      dummy.position.set(x, y, z - record.trailLength / 2);
      dummy.scale.set(Math.max(0.028, record.scale * 0.28), Math.max(0.022, record.scale * 0.18), record.trailLength);
      dummy.updateMatrix();
      trails.current!.setMatrixAt(index, dummy.matrix);
      trails.current!.setColorAt(index, color);
    });
    heads.current.instanceMatrix.needsUpdate = true;
    stems.current.instanceMatrix.needsUpdate = true;
    trails.current.instanceMatrix.needsUpdate = true;
    if (heads.current.instanceColor) heads.current.instanceColor.needsUpdate = true;
    if (trails.current.instanceColor) trails.current.instanceColor.needsUpdate = true;
  }, [color, dummy, records]);

  const opacity=state.act==='perform'?0.9:state.fracture.assembly*0.9;
  const guideLength = Math.min(7, Math.max(3, windowSeconds * 0.6));
  const guideCenter = logicalTime * 1.5;
  return <group visible={opacity>0.001}>
    {[-2,-1,0,1,2].map(i=><mesh key={i} position={[0,i*.17,guideCenter]}><boxGeometry args={[4.6,.012,guideLength]}/><meshBasicMaterial color="#48eaff" opacity={opacity*.16} transparent toneMapped={false}/></mesh>)}
    <instancedMesh ref={trails} args={[undefined,undefined,capacity]} frustumCulled={false}><boxGeometry args={[1,1,1]}/><meshBasicMaterial vertexColors opacity={opacity*.52} transparent toneMapped={false}/></instancedMesh>
    <instancedMesh ref={heads} args={[undefined,undefined,capacity]} frustumCulled={false}><sphereGeometry args={[1,12,8]}/><meshBasicMaterial vertexColors opacity={opacity} transparent toneMapped={false}/></instancedMesh>
    <instancedMesh ref={stems} args={[undefined,undefined,capacity]} frustumCulled={false}><boxGeometry args={[1,1,1]}/><meshBasicMaterial color="#8efaff" opacity={opacity*.8} transparent toneMapped={false}/></instancedMesh>
  </group>;
}
