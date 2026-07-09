import type * as THREE from 'three'
import { REACH } from './constants'
import type { ChunkManager } from './chunk-manager'
import { Block } from '@/world/blocks'

export interface RaycastHit {
  /** Coordinates of the hit voxel. */
  x: number
  y: number
  z: number
  /** Face normal of the hit (points to the adjacent empty cell). */
  nx: number
  ny: number
  nz: number
}

function targetable(block: Block): boolean {
  return block !== Block.Air && block !== Block.Water
}

/**
 * Amanatides & Woo voxel traversal from `origin` along `dir` (normalised),
 * returning the first targetable voxel and the face normal, or null.
 */
export function raycastVoxel(
  world: ChunkManager,
  origin: THREE.Vector3,
  dir: THREE.Vector3,
  maxDist = REACH,
): RaycastHit | null {
  let x = Math.floor(origin.x)
  let y = Math.floor(origin.y)
  let z = Math.floor(origin.z)

  const stepX = Math.sign(dir.x)
  const stepY = Math.sign(dir.y)
  const stepZ = Math.sign(dir.z)

  const tDeltaX = stepX !== 0 ? Math.abs(1 / dir.x) : Infinity
  const tDeltaY = stepY !== 0 ? Math.abs(1 / dir.y) : Infinity
  const tDeltaZ = stepZ !== 0 ? Math.abs(1 / dir.z) : Infinity

  let tMaxX =
    stepX !== 0 ? (stepX > 0 ? x + 1 - origin.x : origin.x - x) * tDeltaX : Infinity
  let tMaxY =
    stepY !== 0 ? (stepY > 0 ? y + 1 - origin.y : origin.y - y) * tDeltaY : Infinity
  let tMaxZ =
    stepZ !== 0 ? (stepZ > 0 ? z + 1 - origin.z : origin.z - z) * tDeltaZ : Infinity

  let nx = 0
  let ny = 0
  let nz = 0
  let t = 0

  // Handle starting inside a solid voxel.
  if (targetable(world.getVoxel(x, y, z))) {
    return { x, y, z, nx: 0, ny: 1, nz: 0 }
  }

  while (t <= maxDist) {
    if (tMaxX < tMaxY) {
      if (tMaxX < tMaxZ) {
        x += stepX
        t = tMaxX
        tMaxX += tDeltaX
        nx = -stepX
        ny = 0
        nz = 0
      } else {
        z += stepZ
        t = tMaxZ
        tMaxZ += tDeltaZ
        nx = 0
        ny = 0
        nz = -stepZ
      }
    } else {
      if (tMaxY < tMaxZ) {
        y += stepY
        t = tMaxY
        tMaxY += tDeltaY
        nx = 0
        ny = -stepY
        nz = 0
      } else {
        z += stepZ
        t = tMaxZ
        tMaxZ += tDeltaZ
        nx = 0
        ny = 0
        nz = -stepZ
      }
    }

    if (t > maxDist) break
    if (targetable(world.getVoxel(x, y, z))) {
      return { x, y, z, nx, ny, nz }
    }
  }

  return null
}
