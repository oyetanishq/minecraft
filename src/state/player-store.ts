import { create } from 'zustand'
import { Block, HOTBAR_BLOCKS } from '@/world/blocks'

/** Low-frequency data the engine mirrors into React for the HUD (~10 Hz). */
export interface HudInfo {
  x: number
  y: number
  z: number
  fps: number
  flying: boolean
  onGround: boolean
  facing: string
  biome: string
  targeted: string
  loadedChunks: number
}

interface PlayerState extends HudInfo {
  health: number
  maxHealth: number
  selectedSlot: number
  hotbar: Block[]
  setSelectedSlot: (slot: number) => void
  setHealth: (health: number) => void
  setHud: (info: Partial<HudInfo>) => void
  reset: () => void
}

const initialHud: HudInfo = {
  x: 0,
  y: 0,
  z: 0,
  fps: 0,
  flying: false,
  onGround: false,
  facing: '',
  biome: '',
  targeted: '',
  loadedChunks: 0,
}

export const usePlayerStore = create<PlayerState>((set) => ({
  ...initialHud,
  health: 20,
  maxHealth: 20,
  selectedSlot: 0,
  hotbar: HOTBAR_BLOCKS,
  setSelectedSlot: (slot) =>
    set({ selectedSlot: ((slot % HOTBAR_BLOCKS.length) + HOTBAR_BLOCKS.length) % HOTBAR_BLOCKS.length }),
  setHealth: (health) => set({ health: Math.max(0, Math.min(20, health)) }),
  setHud: (info) => set(info),
  reset: () => set({ ...initialHud, health: 20, selectedSlot: 0 }),
}))
