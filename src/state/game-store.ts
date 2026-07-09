import { create } from 'zustand'
import { DEFAULT_RENDER_DISTANCE } from '@/engine/constants'

export type Phase = 'menu' | 'loading' | 'playing' | 'paused'

export interface Settings {
  renderDistance: number
  fov: number
  /** Mouse-look sensitivity multiplier. */
  sensitivity: number
  /** Seconds for one full day/night cycle. */
  dayLength: number
}

interface GameState {
  phase: Phase
  seed: number
  settings: Settings
  debug: boolean
  setPhase: (phase: Phase) => void
  setSeed: (seed: number) => void
  setSettings: (partial: Partial<Settings>) => void
  toggleDebug: () => void
}

export const useGameStore = create<GameState>((set) => ({
  phase: 'menu',
  seed: 1337,
  settings: {
    renderDistance: DEFAULT_RENDER_DISTANCE,
    fov: 75,
    sensitivity: 1,
    dayLength: 600,
  },
  debug: false,
  setPhase: (phase) => set({ phase }),
  setSeed: (seed) => set({ seed }),
  setSettings: (partial) => set((s) => ({ settings: { ...s.settings, ...partial } })),
  toggleDebug: () => set((s) => ({ debug: !s.debug })),
}))
