import { Environment, Sky } from '@react-three/drei'
import type { QualityTier } from '../../store/qualityStore'

export default function Lighting({ tier }: { tier: QualityTier }) {
  const shadows = tier === 'high'

  return (
    <>
      <Sky sunPosition={[80, 12, 30]} turbidity={9} rayleigh={1.4} mieCoefficient={0.012} mieDirectionalG={0.85} />
      <hemisphereLight args={['#cfd9e6', '#3a3226', 0.65]} />
      <directionalLight
        position={[8, 10, 4]}
        intensity={2.6}
        color="#ffb877"
        castShadow={shadows}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={1}
        shadow-camera-far={30}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
      />
      <directionalLight position={[-6, 4, -6]} intensity={0.6} color="#7fb3ff" />
      <spotLight position={[0, 6, -8]} intensity={0.8} color="#35d0e0" angle={0.5} penumbra={1} />
      {/* lights the underground cutaway — without this the shaft interior (casing,
          rod, fluid, reservoir) is essentially unlit and reads as a black hole.
          Kept deliberately dim: at close range even modest intensity blows out
          into an overexposed halo that swamps the geometry underneath it. */}
      <pointLight position={[0.8, -0.3, 0.8]} intensity={1.2} distance={6} decay={2} color="#ffddb0" />
      <pointLight position={[0, -1.8, 0]} intensity={0.5} distance={4.5} decay={2} color="#ff8a5c" />
      {tier !== 'low' && <Environment preset="sunset" environmentIntensity={0.5} />}
    </>
  )
}
