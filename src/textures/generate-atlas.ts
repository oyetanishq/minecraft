import * as THREE from 'three'
import { ATLAS_PX, TILE_PX } from '@/engine/constants'
import { TILE } from '@/world/blocks'
import { mulberry32 } from '@/workers/noise'

type RGB = [number, number, number]

const clamp = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v | 0)

function shade([r, g, b]: RGB, delta: number): string {
  return `rgb(${clamp(r + delta)},${clamp(g + delta)},${clamp(b + delta)})`
}

/** Fill a tile with a base colour plus per-pixel brightness noise. */
function noiseFill(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  base: RGB,
  variance: number,
  rng: () => number,
): void {
  for (let y = 0; y < TILE_PX; y++) {
    for (let x = 0; x < TILE_PX; x++) {
      ctx.fillStyle = shade(base, (rng() - 0.5) * variance)
      ctx.fillRect(ox + x, oy + y, 1, 1)
    }
  }
}

function px(ctx: CanvasRenderingContext2D, ox: number, oy: number, x: number, y: number, color: string) {
  ctx.fillStyle = color
  ctx.fillRect(ox + x, oy + y, 1, 1)
}

const DIRT: RGB = [124, 90, 56]
const GRASS: RGB = [96, 158, 62]
const STONE: RGB = [127, 127, 131]
const SAND: RGB = [219, 205, 150]

type Drawer = (ctx: CanvasRenderingContext2D, ox: number, oy: number, rng: () => number) => void

const drawers: Record<number, Drawer> = {
  [TILE.dirt]: (ctx, ox, oy, rng) => noiseFill(ctx, ox, oy, DIRT, 26, rng),
  [TILE.grassTop]: (ctx, ox, oy, rng) => {
    noiseFill(ctx, ox, oy, GRASS, 26, rng)
    for (let i = 0; i < 22; i++) px(ctx, ox, oy, (rng() * 16) | 0, (rng() * 16) | 0, shade(GRASS, -34))
  },
  [TILE.grassSide]: (ctx, ox, oy, rng) => {
    noiseFill(ctx, ox, oy, DIRT, 24, rng)
    // green top band with a jagged lower edge
    for (let x = 0; x < TILE_PX; x++) {
      const h = 3 + ((rng() * 3) | 0)
      for (let y = 0; y < h; y++) px(ctx, ox, oy, x, y, shade(GRASS, (rng() - 0.5) * 26))
    }
  },
  [TILE.stone]: (ctx, ox, oy, rng) => {
    noiseFill(ctx, ox, oy, STONE, 22, rng)
    for (let i = 0; i < 6; i++) px(ctx, ox, oy, (rng() * 16) | 0, (rng() * 16) | 0, shade(STONE, -40))
  },
  [TILE.sand]: (ctx, ox, oy, rng) => noiseFill(ctx, ox, oy, SAND, 16, rng),
  [TILE.sandstoneTop]: (ctx, ox, oy, rng) => noiseFill(ctx, ox, oy, [223, 211, 160], 10, rng),
  [TILE.sandstoneSide]: (ctx, ox, oy, rng) => {
    for (let y = 0; y < TILE_PX; y++) {
      const band = y % 6 < 1 ? -22 : 0
      for (let x = 0; x < TILE_PX; x++) {
        ctx.fillStyle = shade([219, 205, 150], band + (rng() - 0.5) * 12)
        ctx.fillRect(ox + x, oy + y, 1, 1)
      }
    }
  },
  [TILE.water]: (ctx, ox, oy, rng) => noiseFill(ctx, ox, oy, [54, 104, 200], 14, rng),
  [TILE.logTop]: (ctx, ox, oy, rng) => {
    const base: RGB = [156, 116, 70]
    for (let y = 0; y < TILE_PX; y++) {
      for (let x = 0; x < TILE_PX; x++) {
        const dx = x - 7.5
        const dy = y - 7.5
        const d = Math.sqrt(dx * dx + dy * dy)
        const ring = Math.sin(d * 2.2) * 18
        ctx.fillStyle = shade(base, ring + (rng() - 0.5) * 8)
        ctx.fillRect(ox + x, oy + y, 1, 1)
      }
    }
  },
  [TILE.logSide]: (ctx, ox, oy, rng) => {
    const base: RGB = [110, 80, 48]
    noiseFill(ctx, ox, oy, base, 16, rng)
    for (let x = 0; x < TILE_PX; x += 3) {
      const d = -20 - ((rng() * 12) | 0)
      for (let y = 0; y < TILE_PX; y++) px(ctx, ox, oy, x, y, shade(base, d + (rng() - 0.5) * 10))
    }
  },
  [TILE.leaves]: (ctx, ox, oy, rng) => {
    const base: RGB = [58, 118, 44]
    for (let y = 0; y < TILE_PX; y++) {
      for (let x = 0; x < TILE_PX; x++) {
        if (rng() < 0.16) continue // transparent gap (alphaTest cut-out)
        ctx.fillStyle = shade(base, (rng() - 0.5) * 40)
        ctx.fillRect(ox + x, oy + y, 1, 1)
      }
    }
  },
  [TILE.snow]: (ctx, ox, oy, rng) => noiseFill(ctx, ox, oy, [238, 245, 250], 8, rng),
  [TILE.bedrock]: (ctx, ox, oy, rng) => noiseFill(ctx, ox, oy, [62, 62, 66], 44, rng),
  [TILE.gravel]: (ctx, ox, oy, rng) => {
    noiseFill(ctx, ox, oy, [128, 120, 114], 30, rng)
    for (let i = 0; i < 8; i++) px(ctx, ox, oy, (rng() * 16) | 0, (rng() * 16) | 0, shade([90, 84, 80], 0))
  },
  [TILE.planks]: (ctx, ox, oy, rng) => {
    const base: RGB = [158, 126, 76]
    noiseFill(ctx, ox, oy, base, 14, rng)
    for (let y = 0; y < TILE_PX; y += 5) for (let x = 0; x < TILE_PX; x++) px(ctx, ox, oy, x, y, shade(base, -40))
    for (let y = 0; y < TILE_PX; y++) px(ctx, ox, oy, 7, y, shade(base, -30))
  },
  [TILE.glass]: (ctx, ox, oy, rng) => {
    // mostly transparent with a light frame + a few highlight pixels
    for (let x = 0; x < TILE_PX; x++) {
      px(ctx, ox, oy, x, 0, 'rgba(205,228,238,0.85)')
      px(ctx, ox, oy, x, 15, 'rgba(205,228,238,0.85)')
      px(ctx, ox, oy, 0, x, 'rgba(205,228,238,0.85)')
      px(ctx, ox, oy, 15, x, 'rgba(205,228,238,0.85)')
    }
    for (let i = 0; i < 5; i++) px(ctx, ox, oy, 2 + ((rng() * 12) | 0), 2 + ((rng() * 12) | 0), 'rgba(230,245,250,0.5)')
  },
  [TILE.cobblestone]: (ctx, ox, oy, rng) => {
    noiseFill(ctx, ox, oy, [90, 88, 92], 10, rng)
    // scattered lighter stones
    for (let i = 0; i < 14; i++) {
      const sx = (rng() * 13) | 0
      const sy = (rng() * 13) | 0
      const w = 2 + ((rng() * 2) | 0)
      ctx.fillStyle = shade([132, 130, 134], (rng() - 0.5) * 22)
      ctx.fillRect(ox + sx, oy + sy, w, w)
    }
  },
  [TILE.brick]: (ctx, ox, oy, rng) => {
    const mortar = 'rgb(188,178,168)'
    const brick: RGB = [150, 62, 46]
    noiseFill(ctx, ox, oy, brick, 16, rng)
    for (let x = 0; x < TILE_PX; x++) {
      px(ctx, ox, oy, x, 0, mortar)
      px(ctx, ox, oy, x, 8, mortar)
    }
    for (let y = 0; y < 8; y++) px(ctx, ox, oy, 8, y, mortar)
    for (let y = 8; y < 16; y++) px(ctx, ox, oy, 3, y, mortar)
  },
}

export interface Atlas {
  canvas: HTMLCanvasElement
  texture: THREE.CanvasTexture
  dataUrl: string
}

let cached: Atlas | null = null

export function getAtlas(): Atlas {
  if (cached) return cached

  const canvas = document.createElement('canvas')
  canvas.width = ATLAS_PX
  canvas.height = ATLAS_PX
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = false

  const cols = ATLAS_PX / TILE_PX
  const rng = mulberry32(1337)
  for (const [tileStr, draw] of Object.entries(drawers)) {
    const tile = Number(tileStr)
    const ox = (tile % cols) * TILE_PX
    const oy = Math.floor(tile / cols) * TILE_PX
    draw(ctx, ox, oy, rng)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.magFilter = THREE.NearestFilter
  texture.minFilter = THREE.NearestFilter
  texture.generateMipmaps = false
  texture.colorSpace = THREE.SRGBColorSpace
  texture.flipY = false

  cached = { canvas, texture, dataUrl: canvas.toDataURL() }
  return cached
}
