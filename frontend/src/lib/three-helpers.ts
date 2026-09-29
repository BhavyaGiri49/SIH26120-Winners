import * as THREE from 'three'

const UP = new THREE.Vector3(0, 1, 0)

export interface StrutTransform {
  position: [number, number, number]
  quaternion: THREE.Quaternion
  length: number
}

/** Computes the transform for a cylinder mesh (default axis = local Y) so it spans
 * exactly between two world points — used for procedural struts, pitman arms, etc. */
export function strutTransform(a: THREE.Vector3, b: THREE.Vector3): StrutTransform {
  const mid = a.clone().add(b).multiplyScalar(0.5)
  const dir = b.clone().sub(a)
  const length = dir.length()
  const quaternion = new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize())
  return { position: [mid.x, mid.y, mid.z], quaternion, length }
}
