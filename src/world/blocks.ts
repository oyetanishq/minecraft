// Block type registry: ids, physical/render properties, and atlas tiles.

export enum Block {
  Air = 0,
  Stone = 1,
  Dirt = 2,
  Grass = 3,
  Sand = 4,
  Sandstone = 5,
  Water = 6,
  Log = 7,
  Leaves = 8,
  Snow = 9,
  Bedrock = 10,
  Gravel = 11,
  Planks = 12,
  Glass = 13,
  Cobblestone = 14,
  Brick = 15,
}

/** Atlas tile indices (row-major, see ATLAS_COLS in constants). */
export const TILE = {
  grassTop: 0,
  grassSide: 1,
  dirt: 2,
  stone: 3,
  sand: 4,
  sandstoneTop: 5,
  sandstoneSide: 6,
  water: 7,
  logTop: 8,
  logSide: 9,
  leaves: 10,
  snow: 11,
  bedrock: 12,
  gravel: 13,
  planks: 14,
  glass: 15,
  cobblestone: 16,
  brick: 17,
} as const

/** Total number of distinct tiles drawn into the atlas. */
export const TILE_COUNT = Object.keys(TILE).length

export type RenderLayer = 'opaque' | 'transparent'

export interface BlockDef {
  id: Block
  name: string
  /** Participates in player collision. */
  collidable: boolean
  /** Fully hides the neighbour faces behind it (used for face culling). */
  opaque: boolean
  /** Which render pass this block's geometry belongs to. */
  layer: RenderLayer
  /** Cut-out transparency via alphaTest (leaves). */
  alphaTest: boolean
  /** Atlas tiles per face group. */
  tiles: { top: number; side: number; bottom: number }
}

function def(
  id: Block,
  name: string,
  tiles: { top: number; side: number; bottom: number },
  opts: Partial<Pick<BlockDef, 'collidable' | 'opaque' | 'layer' | 'alphaTest'>> = {},
): BlockDef {
  return {
    id,
    name,
    tiles,
    collidable: opts.collidable ?? true,
    opaque: opts.opaque ?? true,
    layer: opts.layer ?? 'opaque',
    alphaTest: opts.alphaTest ?? false,
  }
}

const all = (t: number) => ({ top: t, side: t, bottom: t })

/** Registry indexed by Block id. */
export const BLOCKS: BlockDef[] = [
  def(Block.Air, 'Air', all(0), { collidable: false, opaque: false }),
  def(Block.Stone, 'Stone', all(TILE.stone)),
  def(Block.Dirt, 'Dirt', all(TILE.dirt)),
  def(Block.Grass, 'Grass', { top: TILE.grassTop, side: TILE.grassSide, bottom: TILE.dirt }),
  def(Block.Sand, 'Sand', all(TILE.sand)),
  def(Block.Sandstone, 'Sandstone', {
    top: TILE.sandstoneTop,
    side: TILE.sandstoneSide,
    bottom: TILE.sandstoneTop,
  }),
  def(Block.Water, 'Water', all(TILE.water), {
    collidable: false,
    opaque: false,
    layer: 'transparent',
  }),
  def(Block.Log, 'Log', { top: TILE.logTop, side: TILE.logSide, bottom: TILE.logTop }),
  def(Block.Leaves, 'Leaves', all(TILE.leaves), { opaque: false, alphaTest: true }),
  def(Block.Snow, 'Snow', all(TILE.snow)),
  def(Block.Bedrock, 'Bedrock', all(TILE.bedrock)),
  def(Block.Gravel, 'Gravel', all(TILE.gravel)),
  def(Block.Planks, 'Planks', all(TILE.planks)),
  def(Block.Glass, 'Glass', all(TILE.glass), {
    opaque: false,
    layer: 'transparent',
  }),
  def(Block.Cobblestone, 'Cobblestone', all(TILE.cobblestone)),
  def(Block.Brick, 'Brick', all(TILE.brick)),
]

/** Face index order used everywhere: +X, -X, +Y, -Y, +Z, -Z. */
export const FACE_TOP = 2
export const FACE_BOTTOM = 3

export function isCollidable(block: Block): boolean {
  return BLOCKS[block].collidable
}

export function isOpaque(block: Block): boolean {
  return BLOCKS[block].opaque
}

/** Tile index for a given block face (2 = top, 3 = bottom, else side). */
export function tileForFace(block: Block, faceIndex: number): number {
  const t = BLOCKS[block].tiles
  if (faceIndex === FACE_TOP) return t.top
  if (faceIndex === FACE_BOTTOM) return t.bottom
  return t.side
}

/**
 * Whether the face of `self` touching `neighbour` should be drawn.
 * Air neighbours always expose the face; transparent neighbours of a
 * different type expose it (so water/glass/leaves don't render internal faces).
 */
export function shouldRenderFace(self: Block, neighbour: Block): boolean {
  if (neighbour === Block.Air) return true
  if (BLOCKS[neighbour].opaque) return false
  return neighbour !== self
}

/** Blocks available in the survival-lite hotbar (9 slots). */
export const HOTBAR_BLOCKS: Block[] = [
  Block.Grass,
  Block.Dirt,
  Block.Stone,
  Block.Cobblestone,
  Block.Planks,
  Block.Log,
  Block.Leaves,
  Block.Sand,
  Block.Glass,
]
