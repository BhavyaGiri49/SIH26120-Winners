import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { telemetryRef } from '../../store/telemetryRef'
import { mapRange } from '../../lib/mapRange'
import { pumpMotion } from './motion'

// Depth is deliberately compressed (a real wellbore is kilometers deep) so the
// whole cutaway — casing, tubing, rod, annulus fluid — fits inside the ground-level
// viewing hole and stays legible from the default camera angle.
export const CASING_TOP = 0
export const CASING_BOTTOM = -2.6
export const TUBING_BOTTOM = -2.5
const ROD_NOMINAL_Y = -1.25
const ANNULUS_TOP = -0.05 // stays just below the wellhead flange, not overflowing it
const ANNULUS_MAX_HEIGHT = ANNULUS_TOP - CASING_BOTTOM

const CASING_RADIUS = 0.36
const TUBING_RADIUS = 0.22
const ANNULUS_INNER_RADIUS = TUBING_RADIUS + 0.015
const ANNULUS_OUTER_RADIUS = CASING_RADIUS - 0.015

// 90° wedge cut out of the casing/tubing so the interior is visible (TR-V1),
// centered on the default camera azimuth so it reads immediately on load.
const WEDGE_START = Math.PI / 2
const WEDGE_LENGTH = Math.PI * 1.5

/** A real rod-pumped well's produced fluid accumulates in the casing-tubing
 * ANNULUS (confirmed against SLB's rod-pump reference and acoustic fluid-level
 * literature — that's literally what an acoustic fluid-level shot measures), not
 * inside the tubing bore, which instead carries fluid already being lifted to
 * surface. So this is a full 360° ring (real annulus fluid fills all the way
 * around), independent of the casing/tubing's viewing wedge. */
function useAnnulusFluidGeometry() {
  return useMemo(() => {
    const shape = new THREE.Shape()
    shape.absarc(0, 0, ANNULUS_OUTER_RADIUS, 0, Math.PI * 2, false)
    const hole = new THREE.Path()
    hole.absarc(0, 0, ANNULUS_INNER_RADIUS, 0, Math.PI * 2, true)
    shape.holes.push(hole)
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false, curveSegments: 40 })
    geometry.rotateX(-Math.PI / 2) // bake rotation into vertices so scale.y still just means "height"
    return geometry
  }, [])
}

export default function CasingCutaway({ wellId }: { wellId: string }) {
  const rodRef = useRef<THREE.Mesh>(null)
  const fluidRef = useRef<THREE.Mesh>(null)
  const waxMatRef = useRef<THREE.MeshStandardMaterial>(null)
  const annulusGeometry = useAnnulusFluidGeometry()

  useFrame(() => {
    const t = telemetryRef[wellId]
    const strokeMeters = mapRange(t?.S ?? 100, 64, 144, 0.22, 0.5)
    if (rodRef.current) {
      const offset = (pumpMotion.strokeFrac - 0.5) * strokeMeters
      rodRef.current.position.y = ROD_NOMINAL_Y + offset
    }
    if (fluidRef.current && t) {
      const height = Math.max(0.03, (t.fluidPct / 100) * ANNULUS_MAX_HEIGHT)
      fluidRef.current.scale.y = height
      fluidRef.current.position.y = CASING_BOTTOM + height
    }
    if (waxMatRef.current) {
      const target = t?.waxRisk ? 0.85 : 0
      waxMatRef.current.opacity += (target - waxMatRef.current.opacity) * 0.08
    }
  })

  return (
    <group>
      {/* outer casing, cemented into the formation */}
      <mesh position={[0, (CASING_TOP + CASING_BOTTOM) / 2, 0]} receiveShadow>
        <cylinderGeometry
          args={[CASING_RADIUS, CASING_RADIUS, CASING_TOP - CASING_BOTTOM, 32, 1, true, WEDGE_START, WEDGE_LENGTH]}
        />
        <meshStandardMaterial color="#5a5d64" roughness={0.85} metalness={0.5} side={THREE.DoubleSide} />
      </mesh>

      {/* production tubing, suspended concentrically inside the casing */}
      <mesh position={[0, (CASING_TOP + TUBING_BOTTOM) / 2, 0]}>
        <cylinderGeometry
          args={[TUBING_RADIUS, TUBING_RADIUS, CASING_TOP - TUBING_BOTTOM, 32, 1, true, WEDGE_START, WEDGE_LENGTH]}
        />
        <meshStandardMaterial color="#c3c8d0" roughness={0.4} metalness={0.75} side={THREE.DoubleSide} />
      </mesh>

      {/* produced fluid standing in the casing-tubing annulus — height tracks
          fluid_level_pct (full when inflow outpaces the pump, draws down when the
          pump outpaces inflow — an acoustic fluid-level shot measures exactly this) */}
      <mesh ref={fluidRef} geometry={annulusGeometry} position={[0, CASING_BOTTOM, 0]}>
        <meshPhysicalMaterial color="#2a1608" transparent opacity={0.85} roughness={0.2} transmission={0.2} thickness={0.15} />
      </mesh>

      {/* sucker rod string, inside the tubing bore, oscillating with the surface stroke */}
      <mesh ref={rodRef} position={[0, ROD_NOMINAL_Y, 0]}>
        <cylinderGeometry args={[0.045, 0.045, CASING_TOP - CASING_BOTTOM - 0.6, 8]} />
        <meshStandardMaterial color="#c9ccd2" roughness={0.35} metalness={0.8} />
      </mesh>

      {/* wax deposit build-up on the tubing's inner wall (FR9) — fades in once the
          well drops below the wax/pour-point threshold, fades out once it warms
          back up past it (e.g. after a steam job) */}
      <mesh position={[0, (CASING_TOP + TUBING_BOTTOM) / 2, 0]}>
        <cylinderGeometry
          args={[TUBING_RADIUS + 0.006, TUBING_RADIUS + 0.006, CASING_TOP - TUBING_BOTTOM, 32, 1, true, WEDGE_START, WEDGE_LENGTH]}
        />
        <meshStandardMaterial ref={waxMatRef} color="#c9a24a" roughness={1} transparent opacity={0} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}
