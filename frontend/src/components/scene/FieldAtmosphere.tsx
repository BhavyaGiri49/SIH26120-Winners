import type { QualityTier } from '../../store/qualityStore'

/** Static, cheap background dressing so the well reads as sitting in a real field
 * rather than floating in a void — a couple of storage tanks, a flare stack, and
 * a few distant silhouette pumpjacks. Nothing here is animated or wired to
 * telemetry; it's pure atmosphere and stays out of the draw-call budget that
 * matters (no shadows, simple materials, skipped entirely at 'low' tier). */
function StorageTank({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.9, 0.9, 1.2, 20]} />
        <meshStandardMaterial color="#8a8d90" roughness={0.6} metalness={0.4} />
      </mesh>
      <mesh position={[0, 1.24, 0]}>
        <coneGeometry args={[0.92, 0.22, 20]} />
        <meshStandardMaterial color="#6f7275" roughness={0.6} metalness={0.4} />
      </mesh>
    </group>
  )
}

function FlareStack({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.04, 0.05, 3, 8]} />
        <meshStandardMaterial color="#4a4d52" roughness={0.7} metalness={0.5} />
      </mesh>
      <mesh position={[0, 3.05, 0]}>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshStandardMaterial color="#ff7a3c" emissive="#ff7a3c" emissiveIntensity={1.4} />
      </mesh>
    </group>
  )
}

/** A very low-poly silhouette — legible as "a pumpjack" only at field-dressing
 * distance, deliberately not the detailed rig (that budget belongs to PumpjackRig). */
function DistantPumpjack({ position, rotationY = 0 }: { position: [number, number, number]; rotationY?: number }) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[0.08, 1, 0.08]} />
        <meshStandardMaterial color="#2a2d33" roughness={0.9} />
      </mesh>
      <mesh position={[0.15, 1, 0]} rotation={[0, 0, 0.15]}>
        <boxGeometry args={[0.9, 0.07, 0.07]} />
        <meshStandardMaterial color="#2a2d33" roughness={0.9} />
      </mesh>
    </group>
  )
}

export default function FieldAtmosphere({ tier }: { tier: QualityTier }) {
  if (tier === 'low') return null

  return (
    <group>
      <StorageTank position={[-8.5, 0, -6]} />
      <StorageTank position={[-7, 0, -7.2]} scale={0.8} />
      <FlareStack position={[9, 0, -4]} />
      <DistantPumpjack position={[10, 0, 3]} rotationY={0.6} />
      <DistantPumpjack position={[-11, 0, 5]} rotationY={-0.9} />
      <DistantPumpjack position={[6, 0, 11]} rotationY={2.1} />
    </group>
  )
}
