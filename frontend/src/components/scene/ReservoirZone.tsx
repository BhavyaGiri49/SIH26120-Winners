import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { telemetryRef } from '../../store/telemetryRef'
import { mapRange } from '../../lib/mapRange'

const RESERVOIR_Y = -2.85
const COLD = new THREE.Color('#2f6fb0') // 50°C
const HOT = new THREE.Color('#e0402a') // 200°C

export default function ReservoirZone({ wellId }: { wellId: string }) {
  const materialRef = useRef<THREE.MeshStandardMaterial>(null)
  const scratch = useMemo(() => new THREE.Color(), [])

  // Reservoir color changes ONLY because streamed T changes (TR-V3) — no
  // independent animation, so this stays a plain color lerp, not a shader loop.
  useFrame(() => {
    const t = telemetryRef[wellId]
    if (!materialRef.current || !t) return
    const frac = mapRange(t.T, 50, 200, 0, 1)
    scratch.copy(COLD).lerp(HOT, frac)
    materialRef.current.color.copy(scratch)
    materialRef.current.emissive.copy(scratch)
    materialRef.current.emissiveIntensity = 0.2 + frac * 0.45
  })

  return (
    <mesh position={[0, RESERVOIR_Y, 0]} receiveShadow>
      <cylinderGeometry args={[0.45, 0.55, 0.5, 24]} />
      <meshStandardMaterial ref={materialRef} color={COLD} roughness={0.85} metalness={0} />
    </mesh>
  )
}
