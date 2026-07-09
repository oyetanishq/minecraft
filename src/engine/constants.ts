// World / chunk dimensions --------------------------------------------------

/** Horizontal size of a chunk in blocks (X and Z). */
export const CHUNK_SIZE = 16
/** Vertical size of the world in blocks. */
export const WORLD_HEIGHT = 128
/** Y level that water fills up to. */
export const SEA_LEVEL = 48

export const CHUNK_AREA = CHUNK_SIZE * CHUNK_SIZE
export const CHUNK_VOLUME = CHUNK_AREA * WORLD_HEIGHT

/** Flat index of a voxel inside a chunk's Uint8Array. */
export function voxelIndex(x: number, y: number, z: number): number {
  return x + CHUNK_SIZE * (z + CHUNK_SIZE * y)
}

/** True when local coords fall inside a chunk (x,z in [0,16), y in [0,128)). */
export function inChunkBounds(x: number, y: number, z: number): boolean {
  return (
    x >= 0 &&
    x < CHUNK_SIZE &&
    z >= 0 &&
    z < CHUNK_SIZE &&
    y >= 0 &&
    y < WORLD_HEIGHT
  )
}

export function chunkKey(cx: number, cz: number): string {
  return `${cx},${cz}`
}

// Rendering / gameplay tunables ---------------------------------------------

export const DEFAULT_RENDER_DISTANCE = 8
export const MIN_RENDER_DISTANCE = 3
export const MAX_RENDER_DISTANCE = 16

/** How far (in blocks) the player can reach to break/place. */
export const REACH = 5

/** Max chunk meshes uploaded to the GPU per frame (avoids frame hitches). */
export const MESH_UPLOADS_PER_FRAME = 2

// Texture atlas layout ------------------------------------------------------

export const TILE_PX = 16
export const ATLAS_COLS = 8
export const ATLAS_ROWS = 8
export const ATLAS_PX = ATLAS_COLS * TILE_PX // 128
