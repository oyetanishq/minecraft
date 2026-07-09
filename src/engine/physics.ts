import type * as THREE from 'three'
import { WORLD_HEIGHT } from './constants'
import type { ChunkManager } from './chunk-manager'

export const PLAYER_HALF_WIDTH = 0.3
export const PLAYER_HEIGHT = 1.8
export const PLAYER_EYE = 1.62

const EPS = 1e-3

/**
 * Integrate `pos` by `vel * dt` against the voxel grid, resolving collisions
 * axis-by-axis. `pos` is the player's feet (bottom-centre). Returns onGround.
 */
export function moveAndCollide(
  world: ChunkManager,
  pos: THREE.Vector3,
  vel: THREE.Vector3,
  dt: number,
): boolean {
  // --- X ---
  pos.x += vel.x * dt
  if (vel.x !== 0) resolveX(world, pos, vel)

  // --- Z ---
  pos.z += vel.z * dt
  if (vel.z !== 0) resolveZ(world, pos, vel)

  // --- Y ---
  pos.y += vel.y * dt
  resolveY(world, pos, vel)

  // keep inside the world vertically
  if (pos.y < 1) {
    pos.y = 1
    if (vel.y < 0) vel.y = 0
  }
  if (pos.y > WORLD_HEIGHT) pos.y = WORLD_HEIGHT

  return groundProbe(world, pos)
}

function footprintY(pos: THREE.Vector3): [number, number] {
  return [Math.floor(pos.y + EPS), Math.floor(pos.y + PLAYER_HEIGHT - EPS)]
}

function resolveX(world: ChunkManager, pos: THREE.Vector3, vel: THREE.Vector3): void {
  const [minY, maxY] = footprintY(pos)
  const minZ = Math.floor(pos.z - PLAYER_HALF_WIDTH + EPS)
  const maxZ = Math.floor(pos.z + PLAYER_HALF_WIDTH - EPS)
  if (vel.x > 0) {
    const bx = Math.floor(pos.x + PLAYER_HALF_WIDTH)
    if (columnSolid(world, bx, bx, minY, maxY, minZ, maxZ)) {
      pos.x = bx - PLAYER_HALF_WIDTH - EPS
      vel.x = 0
    }
  } else {
    const bx = Math.floor(pos.x - PLAYER_HALF_WIDTH)
    if (columnSolid(world, bx, bx, minY, maxY, minZ, maxZ)) {
      pos.x = bx + 1 + PLAYER_HALF_WIDTH + EPS
      vel.x = 0
    }
  }
}

function resolveZ(world: ChunkManager, pos: THREE.Vector3, vel: THREE.Vector3): void {
  const [minY, maxY] = footprintY(pos)
  const minX = Math.floor(pos.x - PLAYER_HALF_WIDTH + EPS)
  const maxX = Math.floor(pos.x + PLAYER_HALF_WIDTH - EPS)
  if (vel.z > 0) {
    const bz = Math.floor(pos.z + PLAYER_HALF_WIDTH)
    if (columnSolid(world, minX, maxX, minY, maxY, bz, bz)) {
      pos.z = bz - PLAYER_HALF_WIDTH - EPS
      vel.z = 0
    }
  } else {
    const bz = Math.floor(pos.z - PLAYER_HALF_WIDTH)
    if (columnSolid(world, minX, maxX, minY, maxY, bz, bz)) {
      pos.z = bz + 1 + PLAYER_HALF_WIDTH + EPS
      vel.z = 0
    }
  }
}

function resolveY(world: ChunkManager, pos: THREE.Vector3, vel: THREE.Vector3): void {
  const minX = Math.floor(pos.x - PLAYER_HALF_WIDTH + EPS)
  const maxX = Math.floor(pos.x + PLAYER_HALF_WIDTH - EPS)
  const minZ = Math.floor(pos.z - PLAYER_HALF_WIDTH + EPS)
  const maxZ = Math.floor(pos.z + PLAYER_HALF_WIDTH - EPS)
  if (vel.y > 0) {
    const by = Math.floor(pos.y + PLAYER_HEIGHT)
    if (columnSolid(world, minX, maxX, by, by, minZ, maxZ)) {
      pos.y = by - PLAYER_HEIGHT - EPS
      vel.y = 0
    }
  } else if (vel.y < 0) {
    const by = Math.floor(pos.y)
    if (columnSolid(world, minX, maxX, by, by, minZ, maxZ)) {
      pos.y = by + 1
      vel.y = 0
    }
  }
}

function groundProbe(world: ChunkManager, pos: THREE.Vector3): boolean {
  const minX = Math.floor(pos.x - PLAYER_HALF_WIDTH + EPS)
  const maxX = Math.floor(pos.x + PLAYER_HALF_WIDTH - EPS)
  const minZ = Math.floor(pos.z - PLAYER_HALF_WIDTH + EPS)
  const maxZ = Math.floor(pos.z + PLAYER_HALF_WIDTH - EPS)
  const gy = Math.floor(pos.y - EPS * 2)
  return columnSolid(world, minX, maxX, gy, gy, minZ, maxZ)
}

function columnSolid(
  world: ChunkManager,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  minZ: number,
  maxZ: number,
): boolean {
  for (let y = minY; y <= maxY; y++) {
    for (let z = minZ; z <= maxZ; z++) {
      for (let x = minX; x <= maxX; x++) {
        if (world.isSolid(x, y, z)) return true
      }
    }
  }
  return false
}
