import * as THREE from 'three'
import {
  CHUNK_SIZE,
  MESH_UPLOADS_PER_FRAME,
  WORLD_HEIGHT,
  chunkKey,
  voxelIndex,
} from './constants'
import { Chunk } from './chunk'
import { WorkerPool } from './worker-pool'
import { Block, isCollidable } from '@/world/blocks'
import type { GeometryData, MeshedResponse } from '@/types'

const MAX_GEN_REQUESTS_PER_UPDATE = 6
const MAX_MESH_REQUESTS_PER_UPDATE = 4

interface ReadyMesh {
  chunk: Chunk
  res: MeshedResponse
  version: number
}

export interface ChunkMaterials {
  opaque: THREE.Material
  transparent: THREE.Material
}

/** Streams chunks in/out around the player, driving generation + meshing workers. */
export class ChunkManager {
  private chunks = new Map<string, Chunk>()
  private readyMeshes: ReadyMesh[] = []

  constructor(
    private scene: THREE.Scene,
    private pool: WorkerPool,
    private materials: ChunkMaterials,
    private seed: number,
  ) {}

  get loadedCount(): number {
    return this.chunks.size
  }

  /** Called every frame with the player's current chunk coordinates. */
  update(centerCX: number, centerCZ: number, renderDistance: number): void {
    const genR = renderDistance + 1

    this.unloadDistant(centerCX, centerCZ, genR + 1)
    this.requestGeneration(centerCX, centerCZ, genR)
    this.requestMeshing(centerCX, centerCZ, renderDistance)
    this.uploadReady()
  }

  private unloadDistant(cx: number, cz: number, maxDist: number): void {
    for (const [key, chunk] of this.chunks) {
      const dist = Math.max(Math.abs(chunk.cx - cx), Math.abs(chunk.cz - cz))
      if (dist > maxDist) {
        chunk.dispose(this.scene)
        this.chunks.delete(key)
      }
    }
  }

  private requestGeneration(cx: number, cz: number, genR: number): void {
    const candidates: { c: Chunk; d: number }[] = []
    for (let dz = -genR; dz <= genR; dz++) {
      for (let dx = -genR; dx <= genR; dx++) {
        const kx = cx + dx
        const kz = cz + dz
        const key = chunkKey(kx, kz)
        let chunk = this.chunks.get(key)
        if (!chunk) {
          chunk = new Chunk(kx, kz)
          this.chunks.set(key, chunk)
        }
        if (chunk.state === 'empty') {
          candidates.push({ c: chunk, d: dx * dx + dz * dz })
        }
      }
    }
    candidates.sort((a, b) => a.d - b.d)
    for (let i = 0; i < Math.min(candidates.length, MAX_GEN_REQUESTS_PER_UPDATE); i++) {
      this.startGeneration(candidates[i].c)
    }
  }

  private startGeneration(chunk: Chunk): void {
    chunk.state = 'generating'
    void this.pool.generate(chunk.cx, chunk.cz, this.seed).then((res) => {
      if (this.chunks.get(chunkKey(res.cx, res.cz)) !== chunk) return
      chunk.voxels = res.voxels
      chunk.state = 'generated'
      chunk.dirty = true
    })
  }

  private requestMeshing(cx: number, cz: number, meshR: number): void {
    const candidates: { c: Chunk; d: number }[] = []
    for (let dz = -meshR; dz <= meshR; dz++) {
      for (let dx = -meshR; dx <= meshR; dx++) {
        const chunk = this.chunks.get(chunkKey(cx + dx, cz + dz))
        if (!chunk || chunk.state !== 'generated' || chunk.meshing || !chunk.dirty) continue
        if (!this.neighboursReady(chunk.cx, chunk.cz)) continue
        candidates.push({ c: chunk, d: dx * dx + dz * dz })
      }
    }
    candidates.sort((a, b) => a.d - b.d)
    for (let i = 0; i < Math.min(candidates.length, MAX_MESH_REQUESTS_PER_UPDATE); i++) {
      this.startMeshing(candidates[i].c)
    }
  }

  private neighbourVoxels(cx: number, cz: number): Uint8Array | null {
    const c = this.chunks.get(chunkKey(cx, cz))
    return c && c.state === 'generated' ? c.voxels : null
  }

  private neighboursReady(cx: number, cz: number): boolean {
    return (
      this.neighbourVoxels(cx + 1, cz) !== null &&
      this.neighbourVoxels(cx - 1, cz) !== null &&
      this.neighbourVoxels(cx, cz + 1) !== null &&
      this.neighbourVoxels(cx, cz - 1) !== null
    )
  }

  private startMeshing(chunk: Chunk): void {
    if (!chunk.voxels) return
    chunk.meshing = true
    const requestVersion = chunk.version
    const px = this.neighbourVoxels(chunk.cx + 1, chunk.cz)
    const nx = this.neighbourVoxels(chunk.cx - 1, chunk.cz)
    const pz = this.neighbourVoxels(chunk.cx, chunk.cz + 1)
    const nz = this.neighbourVoxels(chunk.cx, chunk.cz - 1)
    void this.pool.mesh(chunk.cx, chunk.cz, chunk.voxels, px, nx, pz, nz).then((res) => {
      chunk.meshing = false
      if (this.chunks.get(chunkKey(res.cx, res.cz)) !== chunk) return
      this.readyMeshes.push({ chunk, res, version: requestVersion })
    })
  }

  private uploadReady(): void {
    let uploads = 0
    while (this.readyMeshes.length > 0 && uploads < MESH_UPLOADS_PER_FRAME) {
      const { chunk, res, version } = this.readyMeshes.shift()!
      if (this.chunks.get(chunkKey(chunk.cx, chunk.cz)) !== chunk) continue
      this.buildMeshes(chunk, res)
      // if edited while meshing, keep dirty so it re-meshes
      chunk.dirty = chunk.version !== version
      uploads++
    }
  }

  private buildMeshes(chunk: Chunk, res: MeshedResponse): void {
    chunk.dispose(this.scene)
    const originX = chunk.cx * CHUNK_SIZE
    const originZ = chunk.cz * CHUNK_SIZE

    const opaque = this.makeMesh(res.opaque, this.materials.opaque)
    if (opaque) {
      opaque.position.set(originX, 0, originZ)
      opaque.updateMatrix()
      chunk.opaqueMesh = opaque
      this.scene.add(opaque)
    }
    const transparent = this.makeMesh(res.transparent, this.materials.transparent)
    if (transparent) {
      transparent.position.set(originX, 0, originZ)
      transparent.updateMatrix()
      transparent.renderOrder = 1
      chunk.transparentMesh = transparent
      this.scene.add(transparent)
    }
  }

  private makeMesh(data: GeometryData, material: THREE.Material): THREE.Mesh | null {
    if (data.indices.length === 0) return null
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(data.positions, 3))
    geo.setAttribute('normal', new THREE.BufferAttribute(data.normals, 3))
    geo.setAttribute('uv', new THREE.BufferAttribute(data.uvs, 2))
    geo.setAttribute('color', new THREE.BufferAttribute(data.colors, 3))
    geo.setIndex(new THREE.BufferAttribute(data.indices, 1))
    geo.computeBoundingSphere()
    const mesh = new THREE.Mesh(geo, material)
    mesh.matrixAutoUpdate = false
    return mesh
  }

  // --- World voxel access (integer world coords) --------------------------

  getVoxel(wx: number, wy: number, wz: number): Block {
    wx = Math.floor(wx)
    wy = Math.floor(wy)
    wz = Math.floor(wz)
    if (wy < 0 || wy >= WORLD_HEIGHT) return Block.Air
    const cx = Math.floor(wx / CHUNK_SIZE)
    const cz = Math.floor(wz / CHUNK_SIZE)
    const chunk = this.chunks.get(chunkKey(cx, cz))
    if (!chunk || !chunk.voxels) return Block.Air
    return chunk.voxels[voxelIndex(wx - cx * CHUNK_SIZE, wy, wz - cz * CHUNK_SIZE)]
  }

  isSolid(wx: number, wy: number, wz: number): boolean {
    return isCollidable(this.getVoxel(wx, wy, wz))
  }

  /** True when the chunk owning this column has generated (safe to spawn on). */
  isColumnLoaded(wx: number, wz: number): boolean {
    const cx = Math.floor(Math.floor(wx) / CHUNK_SIZE)
    const cz = Math.floor(Math.floor(wz) / CHUNK_SIZE)
    const chunk = this.chunks.get(chunkKey(cx, cz))
    return !!chunk && chunk.state === 'generated'
  }

  /** True when the chunk has an uploaded mesh in the scene. */
  hasVisibleMesh(cx: number, cz: number): boolean {
    const chunk = this.chunks.get(chunkKey(cx, cz))
    return !!chunk && (chunk.opaqueMesh !== null || chunk.transparentMesh !== null)
  }

  /** Place/break a block at world coords; marks affected chunks dirty. */
  setVoxel(wx: number, wy: number, wz: number, block: Block): boolean {
    wx = Math.floor(wx)
    wy = Math.floor(wy)
    wz = Math.floor(wz)
    if (wy < 0 || wy >= WORLD_HEIGHT) return false
    const cx = Math.floor(wx / CHUNK_SIZE)
    const cz = Math.floor(wz / CHUNK_SIZE)
    const chunk = this.chunks.get(chunkKey(cx, cz))
    if (!chunk || !chunk.voxels) return false
    const lx = wx - cx * CHUNK_SIZE
    const lz = wz - cz * CHUNK_SIZE
    chunk.voxels[voxelIndex(lx, wy, lz)] = block
    chunk.version++
    chunk.dirty = true
    // border edits change the neighbour's culling too
    if (lx === 0) this.markDirty(cx - 1, cz)
    if (lx === CHUNK_SIZE - 1) this.markDirty(cx + 1, cz)
    if (lz === 0) this.markDirty(cx, cz - 1)
    if (lz === CHUNK_SIZE - 1) this.markDirty(cx, cz + 1)
    return true
  }

  private markDirty(cx: number, cz: number): void {
    const chunk = this.chunks.get(chunkKey(cx, cz))
    if (chunk && chunk.state === 'generated') {
      chunk.version++
      chunk.dirty = true
    }
  }

  dispose(): void {
    for (const chunk of this.chunks.values()) chunk.dispose(this.scene)
    this.chunks.clear()
    this.readyMeshes = []
  }
}
