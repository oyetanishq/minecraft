import type {
  GeneratedResponse,
  MeshedResponse,
  MeshRequest,
  WorkerRequest,
  WorkerResponse,
} from '@/types'

type Resolver = (res: WorkerResponse) => void

interface Job {
  req: WorkerRequest
  transfer: Transferable[]
  resolve: Resolver
}

/**
 * Pool of chunk workers. Jobs are stateless (all data passed per-message), so
 * any idle worker can take any job. Meshing sends copies of voxel arrays (no
 * transfer) so the main thread keeps its authoritative data.
 */
export class WorkerPool {
  private workers: Worker[] = []
  private idle: Worker[] = []
  private queue: Job[] = []
  private pending = new Map<number, Resolver>()
  private nextId = 1

  constructor(size: number) {
    for (let i = 0; i < size; i++) {
      const worker = new Worker(new URL('../workers/chunk.worker.ts', import.meta.url), {
        type: 'module',
      })
      worker.onmessage = (e: MessageEvent<WorkerResponse>) => this.onDone(worker, e.data)
      this.workers.push(worker)
      this.idle.push(worker)
    }
  }

  get queueLength(): number {
    return this.queue.length
  }

  generate(cx: number, cz: number, seed: number): Promise<GeneratedResponse> {
    const id = this.nextId++
    return new Promise((resolve) => {
      this.enqueue({
        req: { type: 'generate', id, cx, cz, seed },
        transfer: [],
        resolve: resolve as Resolver,
      })
    })
  }

  mesh(
    cx: number,
    cz: number,
    center: Uint8Array,
    px: Uint8Array | null,
    nx: Uint8Array | null,
    pz: Uint8Array | null,
    nz: Uint8Array | null,
  ): Promise<MeshedResponse> {
    const id = this.nextId++
    const req: MeshRequest = { type: 'mesh', id, cx, cz, center, px, nx, pz, nz }
    // No transfer: voxel buffers are structured-cloned so we keep the originals.
    return new Promise((resolve) => {
      this.enqueue({ req, transfer: [], resolve: resolve as Resolver })
    })
  }

  private enqueue(job: Job): void {
    this.queue.push(job)
    this.flush()
  }

  private flush(): void {
    while (this.idle.length > 0 && this.queue.length > 0) {
      const job = this.queue.shift()!
      const worker = this.idle.pop()!
      this.pending.set(job.req.id, job.resolve)
      worker.postMessage(job.req, job.transfer)
    }
  }

  private onDone(worker: Worker, res: WorkerResponse): void {
    const resolve = this.pending.get(res.id)
    this.pending.delete(res.id)
    this.idle.push(worker)
    resolve?.(res)
    this.flush()
  }

  dispose(): void {
    for (const w of this.workers) w.terminate()
    this.workers = []
    this.idle = []
    this.queue = []
    this.pending.clear()
  }
}
