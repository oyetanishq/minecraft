import {
  CHUNK_SIZE,
  CHUNK_VOLUME,
  SEA_LEVEL,
  WORLD_HEIGHT,
  voxelIndex,
} from '@/engine/constants'
import { Block } from '@/world/blocks'
import { Biome, BIOMES } from '@/world/biomes'
import { fbm, hash2, makeNoiseSet, type NoiseSet } from './noise'

// Cache the noise set per-seed so we don't rebuild permutation tables per chunk.
let cachedSeed: number | null = null
let cachedNoise: NoiseSet | null = null

function getNoise(seed: number): NoiseSet {
  if (cachedSeed !== seed || !cachedNoise) {
    cachedSeed = seed
    cachedNoise = makeNoiseSet(seed)
  }
  return cachedNoise
}

/** Continuous terrain height (in blocks) at a world column. */
function terrainHeight(wx: number, wz: number, n: NoiseSet): number {
  const continent = fbm(n.continent, wx, wz, 0.0016, 4) // [-1, 1] broad landmass
  const hills = fbm(n.height, wx, wz, 0.008, 4) // [-1, 1] rolling detail
  const ridged = Math.max(0, fbm(n.mountain, wx, wz, 0.003, 3))
  const mountains = Math.pow(ridged, 2) * 46 // sharp peaks
  return SEA_LEVEL + 2 + continent * 16 + hills * 7 + mountains
}

function selectBiome(wx: number, wz: number, height: number, n: NoiseSet): Biome {
  if (height < SEA_LEVEL - 1.5) return Biome.Ocean
  if (height > SEA_LEVEL + 30) return Biome.Mountains
  const temp = (fbm(n.temperature, wx, wz, 0.0022, 2) + 1) / 2
  const humid = (fbm(n.humidity, wx, wz, 0.0022, 2) + 1) / 2
  if (temp < 0.32) return Biome.Snowy
  if (temp > 0.66 && humid < 0.42) return Biome.Desert
  if (humid > 0.55) return Biome.Forest
  return Biome.Plains
}

function fillColumn(voxels: Uint8Array, lx: number, lz: number, heightF: number, biome: Biome): void {
  const h = Math.max(1, Math.min(WORLD_HEIGHT - 1, Math.floor(heightF)))
  const def = BIOMES[biome]
  for (let y = 0; y <= h; y++) {
    let block: Block
    if (y === 0) {
      block = Block.Bedrock
    } else if (y < h - 3) {
      block = Block.Stone
    } else if (y < h) {
      block = def.subsurface
    } else {
      // surface layer (y === h)
      if (biome === Biome.Mountains) {
        block = h > SEA_LEVEL + 46 ? Block.Snow : Block.Stone
      } else {
        block = def.surface
      }
      // sandy beaches where grassy land meets the sea
      if ((biome === Biome.Plains || biome === Biome.Forest) && h <= SEA_LEVEL + 1) {
        block = Block.Sand
      }
    }
    voxels[voxelIndex(lx, y, lz)] = block
  }
  // water fills open space up to sea level
  for (let y = h + 1; y <= SEA_LEVEL; y++) {
    voxels[voxelIndex(lx, y, lz)] = Block.Water
  }
}

function setLocal(voxels: Uint8Array, x: number, y: number, z: number, block: Block): void {
  if (x < 0 || x >= CHUNK_SIZE || z < 0 || z >= CHUNK_SIZE || y < 0 || y >= WORLD_HEIGHT) return
  const idx = voxelIndex(x, y, z)
  if (block === Block.Leaves) {
    if (voxels[idx] === Block.Air) voxels[idx] = Block.Leaves
  } else {
    voxels[idx] = block
  }
}

function stampTree(
  voxels: Uint8Array,
  lx: number,
  surfaceY: number,
  lz: number,
  trunkHeight: number,
  wx: number,
  wz: number,
  seed: number,
): void {
  // trunk
  for (let i = 1; i <= trunkHeight; i++) {
    setLocal(voxels, lx, surfaceY + i, lz, Block.Log)
  }
  const topY = surfaceY + trunkHeight
  // canopy: two wide layers, then a small cap
  for (let ly = topY - 2; ly <= topY; ly++) {
    const rad = ly < topY ? 2 : 1
    for (let ox = -rad; ox <= rad; ox++) {
      for (let oz = -rad; oz <= rad; oz++) {
        // round the corners of the widest layer, deterministically
        if (rad === 2 && Math.abs(ox) === rad && Math.abs(oz) === rad) {
          if (hash2(wx + ox, wz + oz, seed ^ 0x99) < 0.6) continue
        }
        setLocal(voxels, lx + ox, ly, lz + oz, Block.Leaves)
      }
    }
  }
  setLocal(voxels, lx, topY + 1, lz, Block.Leaves)
}

function placeTrees(voxels: Uint8Array, cx: number, cz: number, seed: number, n: NoiseSet): void {
  const baseX = cx * CHUNK_SIZE
  const baseZ = cz * CHUNK_SIZE
  const MARGIN = 2
  for (let dz = -MARGIN; dz < CHUNK_SIZE + MARGIN; dz++) {
    for (let dx = -MARGIN; dx < CHUNK_SIZE + MARGIN; dx++) {
      const wx = baseX + dx
      const wz = baseZ + dz
      const height = terrainHeight(wx, wz, n)
      const surfaceY = Math.floor(height)
      if (surfaceY <= SEA_LEVEL) continue
      const biome = selectBiome(wx, wz, height, n)
      const density = BIOMES[biome].treeDensity
      if (density <= 0) continue
      if (hash2(wx, wz, seed) > density) continue
      const trunkHeight = 4 + Math.floor(hash2(wx, wz, seed ^ 0x1234) * 3)
      stampTree(voxels, dx, surfaceY, dz, trunkHeight, wx, wz, seed)
    }
  }
}

/** Biome name at a world column — used by the main thread for the debug HUD. */
export function biomeNameAt(wx: number, wz: number, seed: number): string {
  const n = getNoise(seed)
  const height = terrainHeight(wx, wz, n)
  return BIOMES[selectBiome(wx, wz, height, n)].name
}

/** Generate the voxels for a chunk. Columns are independent; trees use a margin. */
export function generateChunk(cx: number, cz: number, seed: number): Uint8Array {
  const n = getNoise(seed)
  const voxels = new Uint8Array(CHUNK_VOLUME) // zero-filled => all Air
  const baseX = cx * CHUNK_SIZE
  const baseZ = cz * CHUNK_SIZE
  for (let lz = 0; lz < CHUNK_SIZE; lz++) {
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      const wx = baseX + lx
      const wz = baseZ + lz
      const height = terrainHeight(wx, wz, n)
      const biome = selectBiome(wx, wz, height, n)
      fillColumn(voxels, lx, lz, height, biome)
    }
  }
  placeTrees(voxels, cx, cz, seed, n)
  return voxels
}
