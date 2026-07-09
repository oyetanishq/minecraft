import type { CSSProperties } from 'react'
import { usePlayerStore } from '@/state/player-store'
import { getAtlas } from '@/textures/generate-atlas'
import { ATLAS_COLS, ATLAS_ROWS } from '@/engine/constants'
import { BLOCKS, type Block } from '@/world/blocks'

function tileStyle(tile: number): CSSProperties {
  const col = tile % ATLAS_COLS
  const row = Math.floor(tile / ATLAS_COLS)
  return {
    backgroundImage: `url(${getAtlas().dataUrl})`,
    backgroundSize: `${ATLAS_COLS * 100}% ${ATLAS_ROWS * 100}%`,
    backgroundPosition: `${(col / (ATLAS_COLS - 1)) * 100}% ${(row / (ATLAS_ROWS - 1)) * 100}%`,
    imageRendering: 'pixelated',
  }
}

function iconStyle(block: Block): CSSProperties {
  return tileStyle(BLOCKS[block].tiles.side)
}

export function Hotbar() {
  const hotbar = usePlayerStore((s) => s.hotbar)
  const selectedSlot = usePlayerStore((s) => s.selectedSlot)
  const setSelectedSlot = usePlayerStore((s) => s.setSelectedSlot)

  return (
    <div className="pointer-events-none absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1 rounded-md bg-black/40 p-1">
      {hotbar.map((block, i) => (
        <button
          key={i}
          onClick={() => setSelectedSlot(i)}
          className={`pointer-events-auto relative flex h-12 w-12 items-center justify-center rounded border-2 transition-colors ${
            i === selectedSlot ? 'border-white bg-white/10' : 'border-white/20'
          }`}
          title={BLOCKS[block].name}
        >
          <span className="h-9 w-9 rounded-sm" style={iconStyle(block)} />
          <span className="absolute bottom-0 right-1 text-[10px] text-white/60">{i + 1}</span>
        </button>
      ))}
    </div>
  )
}
