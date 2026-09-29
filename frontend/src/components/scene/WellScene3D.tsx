import { OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import { useFieldStore } from '../../store/fieldStore'
import { useQualityStore } from '../../store/qualityStore'
import CasingCutaway from './CasingCutaway'
import DownholePump from './DownholePump'
import FieldAtmosphere from './FieldAtmosphere'
import GroundEnvironment from './GroundEnvironment'
import Lighting from './Lighting'
import PostFX from './PostFX'
import PumpjackRig from './PumpjackRig'
import ReservoirZone from './ReservoirZone'
import SteamParticles from './SteamParticles'
import WarningRing from './WarningRing'

export default function WellScene3D() {
  const wellId = useFieldStore((s) => s.selectedWellId)
  const tier = useQualityStore((s) => s.tier)

  if (!wellId) {
    return <div className="flex h-full items-center justify-center font-mono text-xs text-hmi-dim">No well selected</div>
  }

  return (
    <div className="relative h-full w-full">
      <Canvas
        shadows={tier === 'high'}
        camera={{ position: [3.6, 3.4, 5.2], fov: 44, near: 0.1, far: 60 }}
        dpr={[1, tier === 'high' ? 2 : 1.25]}
        gl={{ toneMappingExposure: 1.15 }}
      >
        <fog attach="fog" args={['#d9b98a', 16, 34]} />
        <Suspense fallback={null}>
          <Lighting tier={tier} />
          <GroundEnvironment tier={tier} />
          <FieldAtmosphere tier={tier} />
          <PumpjackRig wellId={wellId} />
          <CasingCutaway wellId={wellId} />
          <DownholePump wellId={wellId} />
          <ReservoirZone wellId={wellId} />
          <SteamParticles wellId={wellId} tier={tier} />
          <WarningRing wellId={wellId} />
          <PostFX tier={tier} />
        </Suspense>
        {/* Target sits between the surface rig (y ~0-2.6) and the reservoir glow
            (y=-2.85) so both are framed on load instead of favoring the rig. */}
        <OrbitControls target={[0, -1.7, 0]} minDistance={3} maxDistance={20} maxPolarAngle={Math.PI / 2 - 0.02} enableDamping dampingFactor={0.08} />
      </Canvas>
      <div className="pointer-events-none absolute bottom-2 left-2 rounded bg-black/40 px-2 py-1 font-mono text-[10px] text-hmi-dim">
        Rod speed visualised at 5× real time · not to depth scale
      </div>
    </div>
  )
}
