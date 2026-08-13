import { useMemo } from 'react';
import type { DirectorState } from '../performance/director';
import { mulberry32 } from '../performance/seed';
import type { PreviewRenderQuality, StageQuality } from './HologramStage';

export function CinematicLighting({ state, previewQuality, quality }: { state: DirectorState['lighting']; previewQuality: PreviewRenderQuality; quality: StageQuality }) {
  const low = quality === 'preview' && previewQuality === 'low';
  const particles = useMemo(() => { const r=mulberry32(0xa7105); return Array.from({length:low?40:96},()=>[(r()-.5)*40,(r()-.5)*22,r()*90] as [number,number,number]); },[low]);
  return <group data-atmosphere-count={particles.length}>
    <ambientLight color="#071626" intensity={0.32 + state.atmosphere * 0.25}/>
    <pointLight color="#48f5ff" intensity={12 * state.cyan} position={[-7,5,-2]} distance={45}/>
    <pointLight color="#ff35bd" intensity={10 * state.magenta} position={[7,-2,4]} distance={48}/>
    {!low && <spotLight color="#a7fbff" intensity={18*state.cyan} position={[0,7,-7]} angle={0.35} penumbra={0.7}/>} 
    {particles.map((p,i)=><mesh key={i} position={p} scale={0.012+(i%5)*0.006}><sphereGeometry args={[1,4,4]}/><meshBasicMaterial color={i%7===0?'#ff35bd':'#75f8ff'} opacity={0.2+state.atmosphere*0.25} transparent toneMapped={false}/></mesh>)}
  </group>;
}
