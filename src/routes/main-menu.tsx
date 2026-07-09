import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useGameStore } from '@/state/game-store'

/** Numeric seeds are used directly; text seeds are hashed to an int. */
function parseSeed(text: string): number {
  const trimmed = text.trim()
  if (/^-?\d+$/.test(trimmed)) return Number(trimmed) | 0
  let h = 2166136261
  for (let i = 0; i < trimmed.length; i++) {
    h ^= trimmed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h | 0
}

export function MainMenu() {
  const navigate = useNavigate()
  const seed = useGameStore((s) => s.seed)
  const setSeed = useGameStore((s) => s.setSeed)
  const [seedText, setSeedText] = useState(String(seed))

  const play = () => {
    setSeed(parseSeed(seedText || String(seed)))
    navigate('/play')
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-10 bg-gradient-to-b from-sky-700 via-sky-500 to-emerald-600">
      <div className="text-center">
        <h1 className="text-6xl font-black tracking-[0.2em] text-white drop-shadow-[3px_3px_0_rgba(0,0,0,0.4)]">
          MINECRAFT
        </h1>
        <p className="mt-2 text-lg text-white/80">Web Edition · Survival Lite</p>
      </div>

      <div className="flex w-72 flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm text-white/90">
          World Seed
          <input
            value={seedText}
            onChange={(e) => setSeedText(e.target.value)}
            className="rounded border border-white/30 bg-black/30 px-3 py-2 text-white outline-none focus:border-white"
            placeholder="any text or number"
          />
        </label>
        <button
          onClick={play}
          className="rounded bg-emerald-600 py-3 text-lg font-semibold text-white shadow hover:bg-emerald-500"
        >
          Play
        </button>
        <button
          onClick={() => navigate('/settings')}
          className="rounded bg-black/30 py-3 text-white hover:bg-black/40"
        >
          Settings
        </button>
      </div>

      <div className="max-w-md text-center text-sm text-white/70">
        WASD move · Mouse look · Space jump · Double-Space / F fly · Left-click break ·
        Right-click place · 1–9 / scroll select · F3 debug · Esc pause
      </div>
    </div>
  )
}
