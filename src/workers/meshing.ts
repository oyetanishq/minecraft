import {
  ATLAS_COLS,
  ATLAS_PX,
  CHUNK_SIZE,
  WORLD_HEIGHT,
  voxelIndex,
} from '@/engine/constants'
import { Block, BLOCKS, isOpaque, shouldRenderFace, tileForFace } from '@/world/blocks'
import type { GeometryData } from '@/types'

export type Sampler = (x: number, y: number, z: number) => Block

/**
 * Neighbour-aware voxel sampler. Reads the centre chunk for in-range coords and
 * the four edge neighbours for +-1 out-of-range coords. Diagonals / unloaded
 * neighbours read as Air; below the world reads solid (to cull the base faces).
 */
export function makeSampler(
  center: Uint8Array,
  px: Uint8Array | null,
  nx: Uint8Array | null,
  pz: Uint8Array | null,
  nz: Uint8Array | null,
): Sampler {
  return (x, y, z) => {
    if (y < 0) return Block.Stone
    if (y >= WORLD_HEIGHT) return Block.Air
    const xIn = x >= 0 && x < CHUNK_SIZE
    const zIn = z >= 0 && z < CHUNK_SIZE
    if (xIn && zIn) return center[voxelIndex(x, y, z)]
    if (!xIn && !zIn) return Block.Air
    if (!xIn) {
      if (x < 0) return nx ? nx[voxelIndex(x + CHUNK_SIZE, y, z)] : Block.Air
      return px ? px[voxelIndex(x - CHUNK_SIZE, y, z)] : Block.Air
    }
    if (z < 0) return nz ? nz[voxelIndex(x, y, z + CHUNK_SIZE)] : Block.Air
    return pz ? pz[voxelIndex(x, y, z - CHUNK_SIZE)] : Block.Air
  }
}

// Face table: normal, lower corner (base), and two in-plane axes (u, v) such
// that u x v = normal, giving outward (CCW) winding for corners base, +u, +u+v, +v.
interface Face {
  normal: [number, number, number]
  base: [number, number, number]
  u: [number, number, number]
  v: [number, number, number]
}

const FACES: Face[] = [
  { normal: [1, 0, 0], base: [1, 0, 0], u: [0, 1, 0], v: [0, 0, 1] }, // +X
  { normal: [-1, 0, 0], base: [0, 0, 0], u: [0, 0, 1], v: [0, 1, 0] }, // -X
  { normal: [0, 1, 0], base: [0, 1, 0], u: [0, 0, 1], v: [1, 0, 0] }, // +Y
  { normal: [0, -1, 0], base: [0, 0, 0], u: [1, 0, 0], v: [0, 0, 1] }, // -Y
  { normal: [0, 0, 1], base: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] }, // +Z
  { normal: [0, 0, -1], base: [0, 0, 0], u: [0, 1, 0], v: [1, 0, 0] }, // -Z
]

// Corner (a along u, b along v) order — CCW around the quad.
const CORNERS: [number, number][] = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
]

// AO brightness by occlusion level (0 = most occluded .. 3 = open).
const AO_LEVELS = [0.5, 0.66, 0.83, 1.0]

const INSET = 0.5 / ATLAS_PX // half-texel inset to avoid atlas bleeding

function vertexAO(side1: number, side2: number, corner: number): number {
  if (side1 && side2) return 0
  return 3 - (side1 + side2 + corner)
}

class Builder {
  positions: number[] = []
  normals: number[] = []
  uvs: number[] = []
  colors: number[] = []
  indices: number[] = []
  private vertexCount = 0

  addQuad(
    px: number,
    py: number,
    pz: number,
    face: Face,
    ao: number[],
    verts: [number, number, number][],
    uvCorners: [number, number][],
  ): void {
    const base = this.vertexCount
    for (let i = 0; i < 4; i++) {
      const v = verts[i]
      this.positions.push(px + v[0], py + v[1], pz + v[2])
      this.normals.push(face.normal[0], face.normal[1], face.normal[2])
      this.uvs.push(uvCorners[i][0], uvCorners[i][1])
      const c = AO_LEVELS[ao[i]]
      this.colors.push(c, c, c)
    }
    this.vertexCount += 4
    // Flip the split so both triangles share the darker diagonal (anti-artifact).
    const flip = ao[0] + ao[2] < ao[1] + ao[3]
    if (flip) {
      this.indices.push(base + 1, base + 2, base + 3, base + 3, base + 0, base + 1)
    } else {
      this.indices.push(base + 0, base + 1, base + 2, base + 0, base + 2, base + 3)
    }
  }

  toGeometry(): GeometryData {
    return {
      positions: new Float32Array(this.positions),
      normals: new Float32Array(this.normals),
      uvs: new Float32Array(this.uvs),
      colors: new Float32Array(this.colors),
      indices: new Uint32Array(this.indices),
    }
  }
}

function tileUV(tile: number): [number, number, number, number] {
  const col = tile % ATLAS_COLS
  const row = Math.floor(tile / ATLAS_COLS)
  const s = 1 / ATLAS_COLS
  const u0 = col * s + INSET
  const v0 = row * s + INSET
  const u1 = (col + 1) * s - INSET
  const v1 = (row + 1) * s - INSET
  return [u0, v0, u1, v1]
}

/** Build opaque + transparent geometry for one chunk from a neighbour-aware sampler. */
export function meshChunk(sample: Sampler): {
  opaque: GeometryData
  transparent: GeometryData
} {
  const opaque = new Builder()
  const transparent = new Builder()

  for (let y = 0; y < WORLD_HEIGHT; y++) {
    for (let z = 0; z < CHUNK_SIZE; z++) {
      for (let x = 0; x < CHUNK_SIZE; x++) {
        const block = sample(x, y, z)
        if (block === Block.Air) continue
        const builder = BLOCKS[block].layer === 'transparent' ? transparent : opaque

        for (let f = 0; f < 6; f++) {
          const face = FACES[f]
          const nx = x + face.normal[0]
          const ny = y + face.normal[1]
          const nz = z + face.normal[2]
          const neighbour = sample(nx, ny, nz)
          if (!shouldRenderFace(block, neighbour)) continue

          const [u0, v0, u1, v1] = tileUV(tileForFace(block, f))
          const verts: [number, number, number][] = []
          const uvCorners: [number, number][] = []
          const ao: number[] = []

          for (let k = 0; k < 4; k++) {
            const [a, b] = CORNERS[k]
            // vertex position (unit cube corner)
            verts.push([
              face.base[0] + a * face.u[0] + b * face.v[0],
              face.base[1] + a * face.u[1] + b * face.v[1],
              face.base[2] + a * face.u[2] + b * face.v[2],
            ])
            // top of a side face (b === 1) samples the top of the tile
            uvCorners.push([a ? u1 : u0, b ? v0 : v1])

            // ambient occlusion from the three occluders around this corner,
            // in the neighbour-cell plane (offset by the face normal).
            const du = a ? 1 : -1
            const dv = b ? 1 : -1
            const s1 = isOpaque(
              sample(nx + du * face.u[0], ny + du * face.u[1], nz + du * face.u[2]),
            )
              ? 1
              : 0
            const s2 = isOpaque(
              sample(nx + dv * face.v[0], ny + dv * face.v[1], nz + dv * face.v[2]),
            )
              ? 1
              : 0
            const cor = isOpaque(
              sample(
                nx + du * face.u[0] + dv * face.v[0],
                ny + du * face.u[1] + dv * face.v[1],
                nz + du * face.u[2] + dv * face.v[2],
              ),
            )
              ? 1
              : 0
            ao.push(vertexAO(s1, s2, cor))
          }

          builder.addQuad(x, y, z, face, ao, verts, uvCorners)
        }
      }
    }
  }

  return { opaque: opaque.toGeometry(), transparent: transparent.toGeometry() }
}
