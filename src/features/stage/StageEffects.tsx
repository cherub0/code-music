import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import { useEffect, useMemo } from 'react';
import { BlendFunction, Effect } from 'postprocessing';
import { Uniform } from 'three';
import type { StageQuality } from './HologramStage';

type StageEffectsProps = {
  logicalTime: number;
  quality: StageQuality;
};

const QUALITY_SETTINGS: Record<StageQuality, {
  bloomIntensity: number;
  grainOpacity: number;
  multisampling: number;
  resolutionScale: number;
}> = {
  preview: { bloomIntensity: 0.72, grainOpacity: 0.035, multisampling: 0, resolutionScale: 0.72 },
  'export-720p': { bloomIntensity: 0.82, grainOpacity: 0.028, multisampling: 4, resolutionScale: 1 },
  'export-1080p': { bloomIntensity: 0.88, grainOpacity: 0.024, multisampling: 8, resolutionScale: 1 },
};

const DETERMINISTIC_GRAIN = `
uniform float logicalTime;
uniform float grainStrength;

float grain(vec2 coordinate) {
  return fract(sin(dot(coordinate + logicalTime * 0.01, vec2(12.9898, 78.233))) * 43758.5453);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  outputColor = vec4(vec3(grain(uv * 1800.0) * grainStrength), inputColor.a);
}
`;

export function StageEffects({ logicalTime, quality }: StageEffectsProps) {
  const settings = QUALITY_SETTINGS[quality];
  const grain = useMemo(() => new Effect('DeterministicGrain', DETERMINISTIC_GRAIN, {
    blendFunction: BlendFunction.SCREEN,
    uniforms: new Map([
      ['grainStrength', new Uniform(0)],
      ['logicalTime', new Uniform(0)],
    ]),
  }), []);
  const grainTime = grain.uniforms.get('logicalTime');
  const grainStrength = grain.uniforms.get('grainStrength');
  if (grainTime) grainTime.value = Math.max(0, logicalTime);
  if (grainStrength) grainStrength.value = settings.grainOpacity;

  useEffect(() => () => grain.dispose(), [grain]);

  return (
    <EffectComposer multisampling={settings.multisampling} resolutionScale={settings.resolutionScale}>
      <Bloom intensity={settings.bloomIntensity} luminanceThreshold={0.34} mipmapBlur />
      <primitive object={grain} />
      <Vignette darkness={0.76} eskil={false} offset={0.18} />
    </EffectComposer>
  );
}
