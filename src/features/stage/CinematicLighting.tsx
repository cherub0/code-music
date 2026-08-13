import { useMemo } from 'react';
import type { DirectorState } from '../performance/director';
import { mulberry32 } from '../performance/seed';
import type { PreviewRenderQuality, StageQuality } from './HologramStage';

type Tower = { position: [number,number,number]; scale: [number,number,number]; magenta: boolean; side: number };

export function cyberpunkTowerLayout(duration: number): Tower[] {
  const r=mulberry32(0xc17b3);
  const travelLength=Math.max(32,duration*1.5+18);
  return Array.from({length:28},(_,i)=>{
    const side=i%2?1:-1;
    return {
      position:[side*(5+r()*6),-4+r()*2,4+(i/27)*travelLength+r()*5] as [number,number,number],
      scale:[1.5+r()*3,5+r()*11,2+r()*3] as [number,number,number],
      magenta:i%4===0,
      side,
    };
  });
}

export function CinematicLighting({ duration, state, previewQuality, quality }: { duration:number; state: DirectorState['lighting']; previewQuality: PreviewRenderQuality; quality: StageQuality }) {
  const low = quality === 'preview' && previewQuality === 'low';
  const particles = useMemo(() => { const r=mulberry32(0xa7105); return Array.from({length:low?40:96},()=>[(r()-.5)*40,(r()-.5)*22,r()*90] as [number,number,number]); },[low]);
  const towers = useMemo(() => cyberpunkTowerLayout(duration),[duration]);
  return <group>
    <ambientLight color="#020611" intensity={0.18 + state.atmosphere * 0.15}/>
    <pointLight color="#48f5ff" intensity={12 * state.cyan} position={[-7,5,-2]} distance={45}/>
    <pointLight color="#ff35bd" intensity={10 * state.magenta} position={[7,-2,4]} distance={48}/>
    {!low && <spotLight color="#a7fbff" intensity={18*state.cyan} position={[0,7,-7]} angle={0.35} penumbra={0.7}/>} 
    {towers.map((tower,i)=><group key={`tower-${i}`} position={tower.position}>
      <mesh scale={tower.scale}><boxGeometry args={[1,1,1]}/><meshStandardMaterial color="#01030a" emissive={tower.magenta?'#090007':'#001016'} emissiveIntensity={0.7} metalness={0.9} roughness={0.24}/></mesh>
      <mesh position={[-tower.side*tower.scale[0]*.51,0,0]} scale={[.035,tower.scale[1]*.62,.055]}><boxGeometry args={[1,1,1]}/><meshBasicMaterial color={tower.magenta?'#ff159f':'#20e8ff'} toneMapped={false}/></mesh>
      <mesh position={[0,tower.scale[1]*.48,0]} scale={[tower.scale[0]*.8,.035,tower.scale[2]*.76]}><boxGeometry args={[1,1,1]}/><meshBasicMaterial color={tower.magenta?'#ff159f':'#20e8ff'} opacity={.72} transparent toneMapped={false}/></mesh>
    </group>)}
    {particles.map((p,i)=><mesh key={i} position={p} scale={0.012+(i%5)*0.006}><sphereGeometry args={[1,4,4]}/><meshBasicMaterial color={i%7===0?'#ff35bd':'#75f8ff'} opacity={0.2+state.atmosphere*0.25} transparent toneMapped={false}/></mesh>)}
  </group>;
}
