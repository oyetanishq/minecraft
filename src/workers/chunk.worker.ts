/// <reference lib="webworker" />
import { generateChunk } from './generation'
import { makeSampler, meshChunk } from './meshing'
import { geometryTransferables, type WorkerRequest, type WorkerResponse } from '@/types'

const ctx = self as unknown as DedicatedWorkerGlobalScope

ctx.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const msg = e.data

  if (msg.type === 'generate') {
    const voxels = generateChunk(msg.cx, msg.cz, msg.seed)
    const res: WorkerResponse = {
      type: 'generated',
      id: msg.id,
      cx: msg.cx,
      cz: msg.cz,
      voxels,
    }
    ctx.postMessage(res, [voxels.buffer])
    return
  }

  // mesh
  const sampler = makeSampler(msg.center, msg.px, msg.nx, msg.pz, msg.nz)
  const { opaque, transparent } = meshChunk(sampler)
  const res: WorkerResponse = {
    type: 'meshed',
    id: msg.id,
    cx: msg.cx,
    cz: msg.cz,
    opaque,
    transparent,
  }
  ctx.postMessage(res, [
    ...geometryTransferables(opaque),
    ...geometryTransferables(transparent),
  ])
}
