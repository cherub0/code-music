import { useLayoutEffect, useMemo, useRef } from 'react';
import { Color, InstancedMesh, Object3D } from 'three';
import type { DirectorState } from '../performance/director';
import { visibleNotes, type ScoreLayout } from '../score/layout';
import { maximumWindowDemand } from './ScoreRibbon';
import { noteFlightRecord, noteFlightRenderBatch } from './noteFlight';
import { ensureInstanceColors } from './instanceColors';

export function ScoreReassembly({ score, logicalTime, state, windowSeconds = 8 }: { score: ScoreLayout; logicalTime: number; state: DirectorState; windowSeconds?: number }) {
  const capacity = useMemo(() => maximumWindowDemand(score, windowSeconds), [score, windowSeconds]);
  const records = useMemo(
    () => visibleNotes(score, logicalTime, windowSeconds).map((note) => noteFlightRecord(note, logicalTime)),
    [score, logicalTime, windowSeconds],
  );
  const batch = useMemo(() => noteFlightRenderBatch(records), [records]);
  const heads = useRef<InstancedMesh>(null);
  const stems = useRef<InstancedMesh>(null);
  const trails = useRef<InstancedMesh>(null);
  const activeGlows = useRef<InstancedMesh>(null);
  const magentaGlows = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const color = useMemo(() => new Color(), []);
  const instanceColors = useMemo(() => new Float32Array(capacity * 3).fill(1), [capacity]);

  useLayoutEffect(() => {
    if (!heads.current || !stems.current || !trails.current || !activeGlows.current || !magentaGlows.current) return;
    [heads.current, stems.current, trails.current, activeGlows.current]
      .forEach((mesh) => ensureInstanceColors(mesh, capacity));

    heads.current.count = batch.notes.length;
    stems.current.count = batch.notes.length;
    trails.current.count = batch.trails.length;
    activeGlows.current.count = batch.activeCyan.length;
    magentaGlows.current.count = batch.activeMagenta.length;
    batch.notes.forEach(({ record, style }, index) => {
      const [x, y, z] = record.position;
      const headScale = record.scale * (1 + record.energy * 0.3);

      dummy.position.set(x, y, z);
      dummy.scale.set(headScale, headScale * 0.7, 0.07);
      dummy.updateMatrix();
      heads.current!.setMatrixAt(index, dummy.matrix);
      color.setRGB(...style.rgb);
      heads.current!.setColorAt(index, color);

      dummy.position.set(x, y + 0.34, z);
      dummy.scale.set(0.022, 0.68, 0.022);
      dummy.updateMatrix();
      stems.current!.setMatrixAt(index, dummy.matrix);
      stems.current!.setColorAt(index, color);
    });
    batch.trails.forEach(({ record, style }, index) => {
      const [x, y, z] = record.position;
      dummy.position.set(x, y, z - style.trailLength / 2);
      dummy.scale.set(Math.max(0.028, record.scale * 0.28), Math.max(0.022, record.scale * 0.18), style.trailLength);
      dummy.updateMatrix();
      trails.current!.setMatrixAt(index, dummy.matrix);
      color.setRGB(...style.rgb);
      trails.current!.setColorAt(index, color);
    });
    const updateGlowPool = (pool: InstancedMesh, entries: typeof batch.activeNotes) => entries.forEach(({ record }, index) => {
      const [x, y, z] = record.position;
      dummy.position.set(x, y, z);
      dummy.scale.set(record.scale * (1.65 + record.energy * 0.5), record.scale * (1.2 + record.energy * 0.4), 0.12);
      dummy.updateMatrix();
      pool.setMatrixAt(index, dummy.matrix);
    });
    updateGlowPool(activeGlows.current, batch.activeCyan);
    updateGlowPool(magentaGlows.current, batch.activeMagenta);
    heads.current.instanceMatrix.needsUpdate = true;
    stems.current.instanceMatrix.needsUpdate = true;
    trails.current.instanceMatrix.needsUpdate = true;
    activeGlows.current.instanceMatrix.needsUpdate = true;
    magentaGlows.current.instanceMatrix.needsUpdate = true;
    if (heads.current.instanceColor) heads.current.instanceColor.needsUpdate = true;
    if (stems.current.instanceColor) stems.current.instanceColor.needsUpdate = true;
    if (trails.current.instanceColor) trails.current.instanceColor.needsUpdate = true;
    if (activeGlows.current.instanceColor) activeGlows.current.instanceColor.needsUpdate = true;
  }, [batch, color, dummy]);

  const opacity=state.act==='perform'?0.9:state.fracture.assembly*0.9;
  return <group name="note-flight" visible={opacity>0.001}>
    <instancedMesh ref={trails} name="active-note-trails" args={[undefined,undefined,capacity]} frustumCulled={false}><instancedBufferAttribute attach="instanceColor" args={[instanceColors,3]}/><boxGeometry args={[1,1,1]}/><meshBasicMaterial color="#43eaff" opacity={opacity*.58} transparent toneMapped={false}/></instancedMesh>
    <instancedMesh ref={heads} args={[undefined,undefined,capacity]} frustumCulled={false}><sphereGeometry args={[1,12,8]}/><meshBasicMaterial color="#1b7184" opacity={opacity*.7} transparent toneMapped={false}/></instancedMesh>
    <instancedMesh ref={activeGlows} args={[undefined,undefined,capacity]} frustumCulled={false}><sphereGeometry args={[1,12,8]}/><meshBasicMaterial blending={2} color="#70ffff" depthWrite={false} opacity={opacity*.92} transparent toneMapped={false}/></instancedMesh>
    <instancedMesh ref={magentaGlows} args={[undefined,undefined,capacity]} frustumCulled={false}><sphereGeometry args={[1,12,8]}/><meshBasicMaterial blending={2} color="#ff35bd" depthWrite={false} opacity={opacity*.92} transparent toneMapped={false}/></instancedMesh>
    <instancedMesh ref={stems} args={[undefined,undefined,capacity]} frustumCulled={false}><boxGeometry args={[1,1,1]}/><meshBasicMaterial color="#2db8c8" opacity={opacity*.7} transparent toneMapped={false}/></instancedMesh>
  </group>;
}
