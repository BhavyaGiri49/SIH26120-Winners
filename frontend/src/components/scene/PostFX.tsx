import { Bloom, DepthOfField, EffectComposer, Vignette } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import type { QualityTier } from '../../store/qualityStore'

export default function PostFX({ tier }: { tier: QualityTier }) {
  if (tier === 'low') return null

  return (
    <EffectComposer multisampling={tier === 'high' ? 4 : 0}>
      <Bloom intensity={0.5} luminanceThreshold={0.5} luminanceSmoothing={0.25} mipmapBlur />
      {tier === 'high' && <DepthOfField target={[0, 0.3, 0]} focalLength={0.01} bokehScale={1.1} />}
      <Vignette eskil={false} offset={0.25} darkness={0.6} blendFunction={BlendFunction.NORMAL} />
    </EffectComposer>
  )
}
