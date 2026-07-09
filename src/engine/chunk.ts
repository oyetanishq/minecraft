import * as THREE from 'three'
import { voxelIndex } from './constants'
import { Block } from '@/world/blocks'

export type ChunkState = 'empty' | 'generating' | 'generated'

/** One column of the world (16 x WORLD_HEIGHT x 16). Data holder + mesh handles. */
export class Chunk {
  voxels: Uint8Array | null = null
  state: ChunkState = 'empty'

  opaqueMesh: THREE.Mesh | null = null
  transparentMesh: THREE.Mesh | null = null

  /** A mesh job is currently in flight. */
  meshing = false
  /** Voxels changed since the last mesh — needs (re)meshing. */
  dirty = false
  /** Bumped on every edit so stale mesh results can be detected. */
  version = 0

  constructor(
    readonly cx: number,
    readonly cz: number,
  ) {}

  getLocal(lx: number, ly: number, lz: number): Block {
    return this.voxels ? this.voxels[voxelIndex(lx, ly, lz)] : Block.Air
  }

  setLocal(lx: number, ly: number, lz: number, block: Block): void {
    if (this.voxels) this.voxels[voxelIndex(lx, ly, lz)] = block
  }

  dispose(scene: THREE.Scene): void {
    if (this.opaqueMesh) {
      scene.remove(this.opaqueMesh)
      this.opaqueMesh.geometry.dispose()
      this.opaqueMesh = null
    }
    if (this.transparentMesh) {
      scene.remove(this.transparentMesh)
      this.transparentMesh.geometry.dispose()
      this.transparentMesh = null
    }
  }
}
