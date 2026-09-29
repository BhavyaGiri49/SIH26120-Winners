import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { telemetryRef } from '../../store/telemetryRef'
import { pumpMotion } from './motion'

// Positioned at the base of the tubing (TUBING_BOTTOM in CasingCutaway), i.e.
// where a real insert pump's barrel is seated. Mechanism per SLB's rod-pump
// reference: a standing valve (fixed, bottom of barrel) opens on the upstroke to
// draw reservoir fluid into the barrel chamber; a traveling valve (rides with the
// plunger) opens on the downstroke to let that fluid pass above the plunger so
// the next upstroke lifts it. The two valves are never open at the same time.
const BARREL_TOP = -2.42
const BARREL_HEIGHT = 0.42
const BARREL_BOTTOM = BARREL_TOP - BARREL_HEIGHT
const PLUNGER_TRAVEL = 0.22

const OPEN_COLOR = new THREE.Color('#35d0e0')
const SHUT_COLOR = new THREE.Color('#4a4f58')

export default function DownholePump({ wellId }: { wellId: string }) {
  const plungerRef = useRef<THREE.Group>(null)
  const travelingValveMatRef = useRef<THREE.MeshStandardMaterial>(null)
  const standingValveMatRef = useRef<THREE.MeshStandardMaterial>(null)
  const barrelMatRef = useRef<THREE.MeshStandardMaterial>(null)

  useFrame(({ clock }) => {
    const t = telemetryRef[wellId]
    const active = (t?.output ?? 0) > 0.3 && pumpMotion.running

    if (plungerRef.current) {
      plungerRef.current.position.y = BARREL_BOTTOM + 0.14 + pumpMotion.strokeFrac * PLUNGER_TRAVEL
    }

    // upstroke (strokeFrac increasing) => standing valve open, traveling valve shut
    const upstroke = Math.cos(pumpMotion.phase) > 0
    const travelingOpen = active && !upstroke
    const standingOpen = active && upstroke

    if (travelingValveMatRef.current) {
      travelingValveMatRef.current.emissive.copy(travelingOpen ? OPEN_COLOR : SHUT_COLOR)
      travelingValveMatRef.current.emissiveIntensity = travelingOpen ? 0.8 : 0.05
    }
    if (standingValveMatRef.current) {
      standingValveMatRef.current.emissive.copy(standingOpen ? OPEN_COLOR : SHUT_COLOR)
      standingValveMatRef.current.emissiveIntensity = standingOpen ? 0.8 : 0.05
    }
    if (barrelMatRef.current) {
      const pulse = active ? 0.12 + 0.1 * Math.abs(Math.sin(clock.elapsedTime * 6)) : 0.04
      barrelMatRef.current.emissiveIntensity = pulse
    }
  })

  return (
    <group>
      {/* working barrel — fixed, seated at the bottom of the tubing string */}
      <mesh position={[0, (BARREL_TOP + BARREL_BOTTOM) / 2, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.1, BARREL_HEIGHT, 16, 1, true]} />
        <meshStandardMaterial
          ref={barrelMatRef}
          color="#787d86"
          emissive="#35d0e0"
          emissiveIntensity={0.05}
          roughness={0.4}
          metalness={0.75}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* standing valve — fixed at the barrel's base, admits fluid on the upstroke */}
      <mesh position={[0, BARREL_BOTTOM - 0.02, 0]}>
        <sphereGeometry args={[0.075, 14, 14]} />
        <meshStandardMaterial ref={standingValveMatRef} color="#3a3f47" roughness={0.35} metalness={0.6} />
      </mesh>

      {/* plunger + traveling valve — rides with the sucker rod inside the barrel */}
      <group ref={plungerRef}>
        <mesh castShadow>
          <cylinderGeometry args={[0.085, 0.085, 0.16, 16]} />
          <meshStandardMaterial color="#c9ccd2" roughness={0.3} metalness={0.85} />
        </mesh>
        <mesh position={[0, 0.11, 0]}>
          <sphereGeometry args={[0.06, 14, 14]} />
          <meshStandardMaterial ref={travelingValveMatRef} color="#3a3f47" roughness={0.35} metalness={0.6} />
        </mesh>
      </group>
    </group>
  )
}
