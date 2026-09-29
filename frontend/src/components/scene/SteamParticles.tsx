import { Sparkles } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { Group } from 'three'
import { telemetryRef } from '../../store/telemetryRef'
import type { QualityTier } from '../../store/qualityStore'

export default function SteamParticles({ wellId, tier }: { wellId: string; tier: QualityTier }) {
  const heavyRef = useRef<Group>(null)

  useFrame(() => {
    const t = telemetryRef[wellId]
    if (heavyRef.current) heavyRef.current.visible = t?.phase === 'STEAMING'
  })

  if (tier === 'low') return null

  return (
    <group>
      {/* always-on light heat shimmer at the wellhead */}
      <Sparkles count={20} scale={[0.6, 1.2, 0.6]} position={[0, 0.6, 0]} size={2} speed={0.3} opacity={0.25} color="#ffcf9e" />
      {/* denser steam-puff burst, only while STEAMING */}
      <group ref={heavyRef} visible={false}>
        <Sparkles count={60} scale={[1.2, 3, 1.2]} position={[0, 1.5, 0]} size={4} speed={0.6} opacity={0.5} color="#e8ecef" />
      </group>
    </group>
  )
}
