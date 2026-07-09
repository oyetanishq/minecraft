import { createRoot } from 'react-dom/client'
import { App } from '@/app'
import { useGameStore } from '@/state/game-store'
import { usePlayerStore } from '@/state/player-store'
import './index.css'

// Expose stores in dev for debugging / automated end-to-end checks.
if (import.meta.env.DEV) {
  ;(window as unknown as { __mc: unknown }).__mc = { useGameStore, usePlayerStore }
}

// NOTE: no StrictMode — it double-invokes effects in dev, which would create and
// tear down the imperative WebGL engine twice (leaking contexts / RAF loops).
createRoot(document.getElementById('root')!).render(<App />)
