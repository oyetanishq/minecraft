import * as THREE from 'three'
import { moveAndCollide, PLAYER_EYE } from './physics'
import type { ChunkManager } from './chunk-manager'

const WALK_SPEED = 4.7
const SPRINT_SPEED = 7.2
const FLY_SPEED = 12
const FLY_SPRINT_SPEED = 24
const GRAVITY = 28
const JUMP_SPEED = 9
const TERMINAL_VELOCITY = 55
const MOUSE_SCALE = 0.0022
const DOUBLE_TAP_MS = 300
const HALF_PI = Math.PI / 2

export class Player {
  readonly position = new THREE.Vector3(0, 80, 0)
  readonly velocity = new THREE.Vector3()
  yaw = 0
  pitch = 0
  flying = false
  onGround = false

  private keys = new Set<string>()
  private lastSpaceTap = -1

  constructor(
    private camera: THREE.PerspectiveCamera,
    private world: ChunkManager,
  ) {
    this.camera.rotation.order = 'YXZ'
  }

  onKeyDown(code: string, timeMs: number): void {
    if (!this.keys.has(code)) {
      if (code === 'Space') {
        if (timeMs - this.lastSpaceTap < DOUBLE_TAP_MS) this.toggleFly()
        this.lastSpaceTap = timeMs
      }
      if (code === 'KeyF') this.toggleFly()
    }
    this.keys.add(code)
  }

  onKeyUp(code: string): void {
    this.keys.delete(code)
  }

  clearKeys(): void {
    this.keys.clear()
  }

  toggleFly(): void {
    this.flying = !this.flying
    this.velocity.y = 0
  }

  onMouseMove(dx: number, dy: number, sensitivity: number): void {
    this.yaw -= dx * MOUSE_SCALE * sensitivity
    this.pitch -= dy * MOUSE_SCALE * sensitivity
    this.pitch = Math.max(-HALF_PI + 0.001, Math.min(HALF_PI - 0.001, this.pitch))
  }

  setPosition(x: number, y: number, z: number): void {
    this.position.set(x, y, z)
    this.velocity.set(0, 0, 0)
  }

  update(dt: number): void {
    const sprint = this.keys.has('ControlLeft') || this.keys.has('ControlRight')

    // horizontal wish direction in the yaw plane
    const sin = Math.sin(this.yaw)
    const cos = Math.cos(this.yaw)
    const forward = (this.keys.has('KeyW') ? 1 : 0) - (this.keys.has('KeyS') ? 1 : 0)
    const strafe = (this.keys.has('KeyD') ? 1 : 0) - (this.keys.has('KeyA') ? 1 : 0)

    let wx = -sin * forward + cos * strafe
    let wz = -cos * forward - sin * strafe
    const len = Math.hypot(wx, wz)
    if (len > 0) {
      wx /= len
      wz /= len
    }

    if (this.flying) {
      const speed = sprint ? FLY_SPRINT_SPEED : FLY_SPEED
      this.velocity.x = wx * speed
      this.velocity.z = wz * speed
      const up = (this.keys.has('Space') ? 1 : 0) - (this.keys.has('ShiftLeft') ? 1 : 0)
      this.velocity.y = up * speed
    } else {
      const speed = sprint ? SPRINT_SPEED : WALK_SPEED
      this.velocity.x = wx * speed
      this.velocity.z = wz * speed
      this.velocity.y -= GRAVITY * dt
      if (this.velocity.y < -TERMINAL_VELOCITY) this.velocity.y = -TERMINAL_VELOCITY
      if (this.onGround && this.keys.has('Space')) {
        this.velocity.y = JUMP_SPEED
      }
    }

    this.onGround = moveAndCollide(this.world, this.position, this.velocity, dt)
    if (this.flying && this.onGround) {
      // touching ground while flying keeps you grounded but doesn't force-land
      this.velocity.y = Math.max(0, this.velocity.y)
    }

    this.syncCamera()
  }

  syncCamera(): void {
    this.camera.position.set(this.position.x, this.position.y + PLAYER_EYE, this.position.z)
    this.camera.rotation.set(this.pitch, this.yaw, 0)
  }

  /** Cardinal facing string for the debug overlay. */
  facing(): string {
    const deg = ((this.yaw * 180) / Math.PI) % 360
    const a = (deg + 360) % 360
    if (a < 45 || a >= 315) return 'North (-Z)'
    if (a < 135) return 'West (-X)'
    if (a < 225) return 'South (+Z)'
    return 'East (+X)'
  }
}
