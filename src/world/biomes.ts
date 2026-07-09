import { Block } from './blocks'

export enum Biome {
  Ocean = 0,
  Plains = 1,
  Forest = 2,
  Desert = 3,
  Mountains = 4,
  Snowy = 5,
}

export interface BiomeDef {
  id: Biome
  name: string
  /** Top block placed at the surface. */
  surface: Block
  /** Block placed just under the surface. */
  subsurface: Block
  /** Probability that any given surface column spawns a tree. */
  treeDensity: number
}

export const BIOMES: Record<Biome, BiomeDef> = {
  [Biome.Ocean]: {
    id: Biome.Ocean,
    name: 'Ocean',
    surface: Block.Sand,
    subsurface: Block.Sand,
    treeDensity: 0,
  },
  [Biome.Plains]: {
    id: Biome.Plains,
    name: 'Plains',
    surface: Block.Grass,
    subsurface: Block.Dirt,
    treeDensity: 0.006,
  },
  [Biome.Forest]: {
    id: Biome.Forest,
    name: 'Forest',
    surface: Block.Grass,
    subsurface: Block.Dirt,
    treeDensity: 0.045,
  },
  [Biome.Desert]: {
    id: Biome.Desert,
    name: 'Desert',
    surface: Block.Sand,
    subsurface: Block.Sandstone,
    treeDensity: 0,
  },
  [Biome.Mountains]: {
    id: Biome.Mountains,
    name: 'Mountains',
    surface: Block.Stone,
    subsurface: Block.Stone,
    treeDensity: 0.004,
  },
  [Biome.Snowy]: {
    id: Biome.Snowy,
    name: 'Snowy',
    surface: Block.Snow,
    subsurface: Block.Dirt,
    treeDensity: 0.012,
  },
}
