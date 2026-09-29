import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { telemetryRef } from '../../store/telemetryRef'

export default function WarningRing({ wellId }: { wellId: string }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.MeshBasicMaterial>(null)

  useFrame(({ clock }) => {
    const t = telemetryRef[wellId]
    if (!meshRef.current || !materialRef.current) return
    const isRed = t?.status === 'RED'
    const pulse = 0.25 + 0.25 * Math.sin(clock.elapsedTime * 4)
    materialRef.current.opacity = isRed ? pulse : 0
    const scale = 1 + (isRed ? 0.04 * Math.sin(clock.elapsedTime * 4) : 0)
    meshRef.current.scale.set(scale, scale, scale)
  })

  return (
    <mesh ref={meshRef} position={[0, 0.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.5, 0.035, 12, 48]} />
      <meshBasicMaterial ref={materialRef} color="#ef4444" transparent opacity={0} toneMapped={false} />
    </mesh>
  )
}
