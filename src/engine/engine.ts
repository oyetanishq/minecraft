import * as THREE from 'three'
import Stats from 'stats.js'
import {
  CHUNK_SIZE,
  WORLD_HEIGHT,
} from './constants'
import { ChunkManager } from './chunk-manager'
import { WorkerPool } from './worker-pool'
import { Player } from './player'
import { PLAYER_HALF_WIDTH, PLAYER_HEIGHT } from './physics'
import { Sky } from './sky'
import { raycastVoxel, type RaycastHit } from './voxel-raycast'
import { getAtlas } from '@/textures/generate-atlas'
import { Block, BLOCKS } from '@/world/blocks'
import { biomeNameAt } from '@/workers/generation'
import { useGameStore } from '@/state/game-store'
import { usePlayerStore } from '@/state/player-store'

const FIXED_STEP = 1 / 60
const MAX_STEPS = 5
const HUD_INTERVAL = 100 // ms

export class Engine {
  private renderer: THREE.WebGLRenderer
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private fog: THREE.Fog
  private sky: Sky
  private pool: WorkerPool
  private chunks: ChunkManager
  private player: Player
  private stats: Stats
  private highlight: THREE.LineSegments

  private seed: number
  private running = false
  private rafId = 0
  private lastTime = 0
  private accumulator = 0
  private spawned = false
  private ready = false
  private frameMs = 16.7
  private lastHud = 0

  private currentHit: RaycastHit | null = null
  private tmpDir = new THREE.Vector3()

  private appliedFov = 0
  private appliedRenderDistance = 0

  constructor(private canvas: HTMLCanvasElement) {
    this.seed = useGameStore.getState().seed
    const settings = useGameStore.getState().settings

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight, false)

    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(
      settings.fov,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      1000,
    )

    this.fog = new THREE.Fog(0x87bdec, 32, settings.renderDistance * CHUNK_SIZE)
    this.scene.fog = this.fog

    this.sky = new Sky()
    this.sky.addTo(this.scene)

    // materials from the procedural atlas
    const atlas = getAtlas()
    const opaqueMaterial = new THREE.MeshLambertMaterial({
      map: atlas.texture,
      vertexColors: true,
      alphaTest: 0.5,
    })
    const transparentMaterial = new THREE.MeshLambertMaterial({
      map: atlas.texture,
      vertexColors: true,
      transparent: true,
      opacity: 0.82,
      side: THREE.DoubleSide,
      depthWrite: false,
    })

    const workerCount = Math.max(2, (navigator.hardwareConcurrency || 4) - 1)
    this.pool = new WorkerPool(workerCount)
    this.chunks = new ChunkManager(
      this.scene,
      this.pool,
      { opaque: opaqueMaterial, transparent: transparentMaterial },
      this.seed,
    )

    this.player = new Player(this.camera, this.chunks)
    this.player.pitch = -0.15
    this.player.syncCamera()

    // targeted-block wireframe highlight
    const box = new THREE.BoxGeometry(1.002, 1.002, 1.002)
    const edges = new THREE.EdgesGeometry(box)
    box.dispose()
    this.highlight = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4 }),
    )
    this.highlight.visible = false
    this.scene.add(this.highlight)

    this.stats = new Stats()
    this.stats.showPanel(0)
    Object.assign(this.stats.dom.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      display: 'none',
    })
    canvas.parentElement?.appendChild(this.stats.dom)

    this.appliedFov = settings.fov
    this.appliedRenderDistance = settings.renderDistance

    this.bindInput()
    useGameStore.getState().setPhase('loading')
  }

  // --- lifecycle -----------------------------------------------------------

  start(): void {
    if (this.running) return
    this.running = true
    this.lastTime = performance.now()
    this.rafId = requestAnimationFrame(this.loop)
  }

  dispose(): void {
    this.running = false
    cancelAnimationFrame(this.rafId)
    this.unbindInput()
    if (document.pointerLockElement === this.canvas) document.exitPointerLock()
    this.chunks.dispose()
    this.pool.dispose()
    this.renderer.dispose()
    this.stats.dom.remove()
    useGameStore.getState().setPhase('menu')
  }

  /** Request pointer lock (must be called from a user gesture). */
  lock(): void {
    this.canvas.requestPointerLock()
  }

  private get locked(): boolean {
    return document.pointerLockElement === this.canvas
  }

  // --- main loop -----------------------------------------------------------

  private loop = (now: number): void => {
    if (!this.running) return
    this.rafId = requestAnimationFrame(this.loop)
    this.stats.begin()

    const dt = Math.min((now - this.lastTime) / 1000, 0.1)
    this.lastTime = now
    this.frameMs += (dt * 1000 - this.frameMs) * 0.1

    const playing = this.locked && this.ready

    this.applySettings()
    this.ensureSpawn()

    if (playing) {
      this.accumulator += dt
      let steps = 0
      while (this.accumulator >= FIXED_STEP && steps < MAX_STEPS) {
        this.player.update(FIXED_STEP)
        this.accumulator -= FIXED_STEP
        steps++
      }
    }

    const settings = useGameStore.getState().settings
    const pcx = Math.floor(this.player.position.x / CHUNK_SIZE)
    const pcz = Math.floor(this.player.position.z / CHUNK_SIZE)
    this.chunks.update(pcx, pcz, settings.renderDistance)

    if (playing) this.sky.update(dt, settings.dayLength, this.player.position, this.scene)
    else this.sky.update(0, settings.dayLength, this.player.position, this.scene)

    this.updateHighlight()
    this.renderer.render(this.scene, this.camera)

    if (now - this.lastHud > HUD_INTERVAL) {
      this.updateHud()
      this.lastHud = now
    }

    this.stats.end()
  }

  private ensureSpawn(): void {
    if (this.spawned) {
      if (!this.ready && this.chunks.hasVisibleMesh(0, 0)) {
        this.ready = true
        if (useGameStore.getState().phase === 'loading') {
          useGameStore.getState().setPhase('paused')
        }
      }
      return
    }
    if (!this.chunks.isColumnLoaded(0, 0)) return
    let spawnY = WORLD_HEIGHT - 1
    for (let y = WORLD_HEIGHT - 1; y > 1; y--) {
      if (this.chunks.isSolid(0, y, 0)) {
        spawnY = y + 1
        break
      }
    }
    this.player.setPosition(0.5, spawnY + 0.05, 0.5)
    this.player.syncCamera()
    this.spawned = true
  }

  private applySettings(): void {
    const { fov, renderDistance } = useGameStore.getState().settings
    if (fov !== this.appliedFov) {
      this.camera.fov = fov
      this.camera.updateProjectionMatrix()
      this.appliedFov = fov
    }
    if (renderDistance !== this.appliedRenderDistance) {
      this.fog.far = renderDistance * CHUNK_SIZE
      this.fog.near = this.fog.far * 0.45
      this.appliedRenderDistance = renderDistance
    }
  }

  private updateHighlight(): void {
    this.camera.getWorldDirection(this.tmpDir)
    this.currentHit = raycastVoxel(this.chunks, this.camera.position, this.tmpDir)
    if (this.currentHit) {
      this.highlight.visible = true
      this.highlight.position.set(
        this.currentHit.x + 0.5,
        this.currentHit.y + 0.5,
        this.currentHit.z + 0.5,
      )
    } else {
      this.highlight.visible = false
    }
  }

  // --- block interaction ---------------------------------------------------

  private breakBlock(): void {
    if (!this.currentHit) return
    this.chunks.setVoxel(this.currentHit.x, this.currentHit.y, this.currentHit.z, Block.Air)
  }

  private placeBlock(): void {
    const hit = this.currentHit
    if (!hit) return
    const bx = hit.x + hit.nx
    const by = hit.y + hit.ny
    const bz = hit.z + hit.nz
    if (this.chunks.getVoxel(bx, by, bz) !== Block.Air) return
    if (this.intersectsPlayer(bx, by, bz)) return
    const { hotbar, selectedSlot } = usePlayerStore.getState()
    this.chunks.setVoxel(bx, by, bz, hotbar[selectedSlot])
  }

  private intersectsPlayer(cx: number, cy: number, cz: number): boolean {
    const p = this.player.position
    const ox = p.x - PLAYER_HALF_WIDTH < cx + 1 && p.x + PLAYER_HALF_WIDTH > cx
    const oy = p.y < cy + 1 && p.y + PLAYER_HEIGHT > cy
    const oz = p.z - PLAYER_HALF_WIDTH < cz + 1 && p.z + PLAYER_HALF_WIDTH > cz
    return ox && oy && oz
  }

  // --- HUD mirror ----------------------------------------------------------

  private updateHud(): void {
    const p = this.player.position
    const targetedName = this.currentHit
      ? BLOCKS[this.chunks.getVoxel(this.currentHit.x, this.currentHit.y, this.currentHit.z)].name
      : '—'
    usePlayerStore.getState().setHud({
      x: p.x,
      y: p.y,
      z: p.z,
      fps: Math.round(1000 / this.frameMs),
      flying: this.player.flying,
      onGround: this.player.onGround,
      facing: this.player.facing(),
      biome: biomeNameAt(Math.floor(p.x), Math.floor(p.z), this.seed),
      targeted: targetedName,
      loadedChunks: this.chunks.loadedCount,
    })
  }

  // --- input ---------------------------------------------------------------

  private bindInput(): void {
    this.canvas.addEventListener('click', this.onClick)
    this.canvas.addEventListener('mousedown', this.onMouseDown)
    this.canvas.addEventListener('contextmenu', this.onContextMenu)
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false })
    document.addEventListener('pointerlockchange', this.onPointerLockChange)
    document.addEventListener('keydown', this.onKeyDown)
    document.addEventListener('keyup', this.onKeyUp)
    document.addEventListener('mousemove', this.onMouseMove)
    window.addEventListener('resize', this.onResize)
  }

  private unbindInput(): void {
    this.canvas.removeEventListener('click', this.onClick)
    this.canvas.removeEventListener('mousedown', this.onMouseDown)
    this.canvas.removeEventListener('contextmenu', this.onContextMenu)
    this.canvas.removeEventListener('wheel', this.onWheel)
    document.removeEventListener('pointerlockchange', this.onPointerLockChange)
    document.removeEventListener('keydown', this.onKeyDown)
    document.removeEventListener('keyup', this.onKeyUp)
    document.removeEventListener('mousemove', this.onMouseMove)
    window.removeEventListener('resize', this.onResize)
  }

  private onClick = (): void => {
    if (!this.locked && this.ready) this.canvas.requestPointerLock()
  }

  private onContextMenu = (e: Event): void => {
    e.preventDefault()
  }

  private onPointerLockChange = (): void => {
    if (this.locked) {
      useGameStore.getState().setPhase('playing')
    } else {
      this.player.clearKeys()
      if (useGameStore.getState().phase === 'playing') {
        useGameStore.getState().setPhase('paused')
      }
    }
  }

  private onMouseDown = (e: MouseEvent): void => {
    if (!this.locked) return
    if (e.button === 0) this.breakBlock()
    else if (e.button === 2) this.placeBlock()
  }

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.locked) return
    const sensitivity = useGameStore.getState().settings.sensitivity
    this.player.onMouseMove(e.movementX, e.movementY, sensitivity)
  }

  private onWheel = (e: WheelEvent): void => {
    if (!this.locked) return
    e.preventDefault()
    const store = usePlayerStore.getState()
    store.setSelectedSlot(store.selectedSlot + (e.deltaY > 0 ? 1 : -1))
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.code === 'F3') {
      e.preventDefault()
      const debug = !useGameStore.getState().debug
      useGameStore.getState().toggleDebug()
      this.stats.dom.style.display = debug ? 'block' : 'none'
      return
    }
    if (!this.locked) return
    if (e.code.startsWith('Digit')) {
      const n = Number(e.code.slice(5))
      if (n >= 1 && n <= 9) usePlayerStore.getState().setSelectedSlot(n - 1)
    }
    if (GAME_KEYS.has(e.code)) e.preventDefault()
    this.player.onKeyDown(e.code, performance.now())
  }

  private onKeyUp = (e: KeyboardEvent): void => {
    this.player.onKeyUp(e.code)
  }

  private onResize = (): void => {
    const w = this.canvas.clientWidth
    const h = this.canvas.clientHeight
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
  }
}

const GAME_KEYS = new Set([
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'Space',
  'ShiftLeft',
  'ControlLeft',
  'KeyF',
])
