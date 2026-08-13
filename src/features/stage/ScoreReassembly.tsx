import { useLayoutEffect, useMemo, useRef } from 'react';
import { Color, InstancedMesh, Object3D } from 'three';
import type { DirectorState } from '../performance/director';
import { visibleNotes, type ScoreLayout } from '../score/layout';
import { maximumWindowDemand } from './ScoreRibbon';
import { notationForNote } from './notationModel';

export function ScoreReassembly({ score, logicalTime, state, windowSeconds=8 }: { score: ScoreLayout; logicalTime:number; state:DirectorState; windowSeconds?:number }) {
  const capacity=useMemo(()=>maximumWindowDemand(score,windowSeconds),[score,windowSeconds]);
  const records=useMemo(()=>visibleNotes(score,logicalTime,windowSeconds).map(n=>notationForNote(n,logicalTime)),[score,logicalTime,windowSeconds]);
  const heads=useRef<InstancedMesh>(null), stems=useRef<InstancedMesh>(null); const dummy=useMemo(()=>new Object3D(),[]), color=useMemo(()=>new Color(),[]);
  useLayoutEffect(()=>{ if(!heads.current||!stems.current)return; heads.current.count=records.length; stems.current.count=records.length;
    records.forEach((r,i)=>{ const x=Math.sin(r.head.position[2]*0.12)*1.15; dummy.position.set(x,r.head.position[1],r.head.position[2]); dummy.scale.set(r.head.scale*(1+r.activeEnergy*.45),r.head.scale*.7,0.06); dummy.updateMatrix(); heads.current!.setMatrixAt(i,dummy.matrix); color.set(r.activeEnergy>0?'#fff5ff':'#55f6ff'); heads.current!.setColorAt(i,color);
      dummy.position.set(x+r.stem.position[0],r.stem.position[1],r.stem.position[2]); dummy.scale.set(.025,r.stem.height,.025); dummy.updateMatrix(); stems.current!.setMatrixAt(i,dummy.matrix); }); heads.current.instanceMatrix.needsUpdate=true; stems.current.instanceMatrix.needsUpdate=true; if(heads.current.instanceColor)heads.current.instanceColor.needsUpdate=true;
  },[color,dummy,records]);
  const opacity=state.act==='perform'?0.9:state.fracture.assembly*0.9;
  return <group visible={opacity>0.001}>
    {[-2,-1,0,1,2].map(i=><mesh key={i} position={[0,i*.17,score.durationSeconds*.75]}><boxGeometry args={[.035,.018,score.durationSeconds*1.5+12]}/><meshBasicMaterial color="#48eaff" opacity={opacity*.5} transparent toneMapped={false}/></mesh>)}
    <instancedMesh ref={heads} args={[undefined,undefined,capacity]} frustumCulled={false}><sphereGeometry args={[1,12,8]}/><meshBasicMaterial vertexColors opacity={opacity} transparent toneMapped={false}/></instancedMesh>
    <instancedMesh ref={stems} args={[undefined,undefined,capacity]} frustumCulled={false}><boxGeometry args={[1,1,1]}/><meshBasicMaterial color="#8efaff" opacity={opacity*.8} transparent toneMapped={false}/></instancedMesh>
  </group>;
}
