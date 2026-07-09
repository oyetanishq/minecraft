// Shared types that cross the main-thread <-> worker boundary.

/** Interleaved-free geometry arrays produced by the mesher. */
export interface GeometryData {
  positions: Float32Array
  normals: Float32Array
  uvs: Float32Array
  colors: Float32Array
  indices: Uint32Array
}

export interface GenerateRequest {
  type: 'generate'
  id: number
  cx: number
  cz: number
  seed: number
}

export interface MeshRequest {
  type: 'mesh'
  id: number
  cx: number
  cz: number
  /** Voxels of the target chunk. */
  center: Uint8Array
  /** Neighbour voxel arrays for correct border culling (null => treat as air). */
  px: Uint8Array | null
  nx: Uint8Array | null
  pz: Uint8Array | null
  nz: Uint8Array | null
}

export type WorkerRequest = GenerateRequest | MeshRequest

export interface GeneratedResponse {
  type: 'generated'
  id: number
  cx: number
  cz: number
  voxels: Uint8Array
}

export interface MeshedResponse {
  type: 'meshed'
  id: number
  cx: number
  cz: number
  opaque: GeometryData
  transparent: GeometryData
}

export type WorkerResponse = GeneratedResponse | MeshedResponse

/** Collect the transferable ArrayBuffers from a geometry payload. */
export function geometryTransferables(g: GeometryData): ArrayBuffer[] {
  return [
    g.positions.buffer as ArrayBuffer,
    g.normals.buffer as ArrayBuffer,
    g.uvs.buffer as ArrayBuffer,
    g.colors.buffer as ArrayBuffer,
    g.indices.buffer as ArrayBuffer,
  ]
}
