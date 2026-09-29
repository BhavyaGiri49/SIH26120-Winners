import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { telemetryRef } from '../../store/telemetryRef'
import { mapRange } from '../../lib/mapRange'
import { strutTransform } from '../../lib/three-helpers'
import { pumpMotion } from './motion'

const PIVOT = new THREE.Vector3(-1.6, 2.6, 0)
const BEAM_HALF_LENGTH = 1.6
const STUFFING_BOX = new THREE.Vector3(0, 0.35, 0)
const VISUAL_SPEEDUP = 5 // TR-V2: shown on screen (see WellScene3D overlay)

const STEEL = { color: '#5b6270', roughness: 0.55, metalness: 0.75 } as const
const STEEL_DARK = { color: '#333844', roughness: 0.65, metalness: 0.6 } as const
const RUST_ACCENT = { color: '#a3673a', roughness: 0.7, metalness: 0.3 } as const

function Strut({
  a,
  b,
  radius = 0.06,
  material = STEEL,
}: {
  a: [number, number, number]
  b: [number, number, number]
  radius?: number
  material?: { color: string; roughness: number; metalness: number }
}) {
  const { position, quaternion, length } = useMemo(
    () => strutTransform(new THREE.Vector3(...a), new THREE.Vector3(...b)),
    [a, b],
  )
  return (
    <mesh position={position} quaternion={quaternion} castShadow receiveShadow>
      <cylinderGeometry args={[radius, radius, length, 10]} />
      <meshStandardMaterial {...material} />
    </mesh>
  )
}

function useHorseheadGeometry() {
  return useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(-0.18, 0.18)
    shape.quadraticCurveTo(0.45, 0.28, 0.78, -0.02)
    shape.quadraticCurveTo(0.92, -0.32, 0.58, -0.56)
    shape.quadraticCurveTo(0.36, -0.66, 0.14, -0.52)
    shape.quadraticCurveTo(0.02, -0.44, -0.08, -0.46)
    shape.quadraticCurveTo(-0.24, -0.4, -0.22, -0.12)
    shape.lineTo(-0.18, 0.18)
    return new THREE.ExtrudeGeometry(shape, { depth: 0.22, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, curveSegments: 16 })
  }, [])
}

export default function PumpjackRig({ wellId }: { wellId: string }) {
  const beamRef = useRef<THREE.Group>(null)
  const horseheadTipRef = useRef<THREE.Group>(null)
  const rodRef = useRef<THREE.Mesh>(null)
  const crankRef = useRef<THREE.Mesh>(null)
  const counterweightRef = useRef<THREE.Group>(null)
  const horseheadGeometry = useHorseheadGeometry()
  const tmpTip = useMemo(() => new THREE.Vector3(), [])

  useFrame((_, delta) => {
    const t = telemetryRef[wellId]
    const N = t?.N ?? 0
    const S = t?.S ?? 100

    pumpMotion.amplitude = mapRange(S, 64, 144, 0.22, 0.48)
    const freqHz = (N / 60) * VISUAL_SPEEDUP
    pumpMotion.running = freqHz > 0.0001
    pumpMotion.phase += 2 * Math.PI * freqHz * delta
    pumpMotion.angle = pumpMotion.amplitude * Math.sin(pumpMotion.phase)
    pumpMotion.strokeFrac = (Math.sin(pumpMotion.phase) + 1) / 2

    if (beamRef.current) beamRef.current.rotation.z = pumpMotion.angle
    if (crankRef.current) crankRef.current.rotation.y += freqHz * 2 * Math.PI * delta * 0.6
    if (counterweightRef.current) counterweightRef.current.rotation.z = -pumpMotion.angle * 0.5

    if (horseheadTipRef.current && rodRef.current) {
      horseheadTipRef.current.getWorldPosition(tmpTip)
      const { position, quaternion, length } = strutTransform(tmpTip, STUFFING_BOX)
      rodRef.current.position.set(...position)
      rodRef.current.quaternion.copy(quaternion)
      rodRef.current.scale.set(1, length, 1)
    }
  })

  return (
    <group>
      {/* base skid */}
      <mesh position={[-0.5, 0.1, 0]} receiveShadow castShadow>
        <boxGeometry args={[2.6, 0.2, 1.6]} />
        <meshStandardMaterial {...STEEL_DARK} />
      </mesh>

      {/* Sampson post — 4-legged A-frame tower converging on the beam pivot */}
      <Strut a={[PIVOT.x - 0.55, 0.2, 0.55]} b={[PIVOT.x, PIVOT.y, PIVOT.z]} radius={0.07} />
      <Strut a={[PIVOT.x - 0.55, 0.2, -0.55]} b={[PIVOT.x, PIVOT.y, PIVOT.z]} radius={0.07} />
      <Strut a={[PIVOT.x + 0.55, 0.2, 0.55]} b={[PIVOT.x, PIVOT.y, PIVOT.z]} radius={0.07} />
      <Strut a={[PIVOT.x + 0.55, 0.2, -0.55]} b={[PIVOT.x, PIVOT.y, PIVOT.z]} radius={0.07} />
      <Strut a={[PIVOT.x - 0.55, 1.3, 0.55]} b={[PIVOT.x + 0.55, 1.3, 0.55]} radius={0.04} />
      <Strut a={[PIVOT.x - 0.55, 1.3, -0.55]} b={[PIVOT.x + 0.55, 1.3, -0.55]} radius={0.04} />

      {/* saddle bearing */}
      <mesh position={[PIVOT.x, PIVOT.y, PIVOT.z]} castShadow>
        <boxGeometry args={[0.3, 0.22, 0.5]} />
        <meshStandardMaterial {...RUST_ACCENT} />
      </mesh>

      {/* walking beam (rotates about the pivot) */}
      <group ref={beamRef} position={[PIVOT.x, PIVOT.y, PIVOT.z]}>
        <mesh castShadow>
          <boxGeometry args={[BEAM_HALF_LENGTH * 2, 0.18, 0.22]} />
          <meshStandardMaterial {...STEEL} />
        </mesh>

        {/* horsehead end */}
        <group position={[BEAM_HALF_LENGTH - 0.15, -0.05, -0.11]}>
          <mesh geometry={horseheadGeometry} castShadow>
            <meshStandardMaterial {...STEEL_DARK} />
          </mesh>
          <group ref={horseheadTipRef} position={[0.62, -0.56, 0.11]} />
        </group>

        {/* tail / pitman-arm side, simplified as a rigid extension (see module note) */}
        <Strut a={[-BEAM_HALF_LENGTH, 0, 0]} b={[-BEAM_HALF_LENGTH - 0.25, -0.85, 0]} radius={0.05} material={RUST_ACCENT} />
        <group ref={counterweightRef} position={[-BEAM_HALF_LENGTH - 0.25, -0.95, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.55, 0.4, 0.32]} />
            <meshStandardMaterial {...STEEL_DARK} />
          </mesh>
        </group>
      </group>

      {/* polished rod hanging from the horsehead down to the wellhead stuffing box */}
      <mesh ref={rodRef}>
        <cylinderGeometry args={[0.035, 0.035, 1, 8]} />
        <meshStandardMaterial color="#c9ccd2" roughness={0.3} metalness={0.85} />
      </mesh>

      {/* crank / counterweight wheel — decorative, driven by the same tempo */}
      <group position={[PIVOT.x - 0.15, 1.0, 0.9]} rotation={[Math.PI / 2, 0, 0]}>
        <mesh ref={crankRef} castShadow>
          <cylinderGeometry args={[0.42, 0.42, 0.16, 28]} />
          <meshStandardMaterial {...STEEL} />
        </mesh>
      </group>
      <mesh position={[PIVOT.x - 0.15, 1.0, 0.9]}>
        <cylinderGeometry args={[0.08, 0.08, 0.3, 12]} />
        <meshStandardMaterial {...STEEL_DARK} />
      </mesh>

      {/* wellhead stack */}
      <mesh position={[0, 0.12, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.16, 0.2, 0.24, 16]} />
        <meshStandardMaterial {...RUST_ACCENT} />
      </mesh>
      <mesh position={[0, 0.32, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.13, 0.2, 16]} />
        <meshStandardMaterial {...STEEL} />
      </mesh>
    </group>
  )
}
