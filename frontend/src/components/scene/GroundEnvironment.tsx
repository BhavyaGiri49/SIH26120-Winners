import { MeshReflectorMaterial } from '@react-three/drei'
import { useMemo } from 'react'
import * as THREE from 'three'
import type { QualityTier } from '../../store/qualityStore'

const OUTER_RADIUS = 14
const HOLE_RADIUS = 0.95

// Matches CasingCutaway's WEDGE_START/WEDGE_LENGTH gap (the pipe's cylinder-angle
// convention differs from Shape's, but both were chosen to open toward the default
// camera position): the ground is missing the same 90° sector all the way out to
// the outer radius, so the viewer looks into an open trench rather than down a
// narrow hole that a curb/rim would otherwise occlude from any oblique angle.
const GAP_START = 0
const GAP_END = Math.PI * 1.5

function useTrenchGroundGeometry() {
  return useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(HOLE_RADIUS * Math.cos(GAP_START), HOLE_RADIUS * Math.sin(GAP_START))
    shape.lineTo(OUTER_RADIUS * Math.cos(GAP_START), OUTER_RADIUS * Math.sin(GAP_START))
    shape.absarc(0, 0, OUTER_RADIUS, GAP_START, GAP_END, false)
    shape.lineTo(HOLE_RADIUS * Math.cos(GAP_END), HOLE_RADIUS * Math.sin(GAP_END))
    shape.absarc(0, 0, HOLE_RADIUS, GAP_END, GAP_START, true)
    return new THREE.ShapeGeometry(shape, 96)
  }, [])
}

export default function GroundEnvironment({ tier }: { tier: QualityTier }) {
  const geometry = useTrenchGroundGeometry()

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} geometry={geometry} receiveShadow>
        {tier === 'high' ? (
          <MeshReflectorMaterial
            color="#6b5c47"
            roughness={0.95}
            metalness={0.05}
            blur={[400, 150]}
            mixBlur={0.9}
            mixStrength={0.15}
            resolution={512}
            mirror={0}
          />
        ) : (
          <meshStandardMaterial color="#6b5c47" roughness={0.97} metalness={0.02} />
        )}
      </mesh>
      {/* well-cellar curb, only along the arc where the ground actually exists */}
      <mesh position={[0, 0.03, 0]} rotation={[Math.PI / 2, 0, GAP_START]}>
        <torusGeometry args={[HOLE_RADIUS, 0.05, 12, 64, GAP_END - GAP_START]} />
        <meshStandardMaterial color="#4a4d55" roughness={0.6} metalness={0.5} />
      </mesh>
    </group>
  )
}
