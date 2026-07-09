import { useGameStore } from '@/state/game-store'
import { usePlayerStore } from '@/state/player-store'
import { CHUNK_SIZE } from '@/engine/constants'

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-white/60">{label}</span>
      <span className="text-white">{value}</span>
    </div>
  )
}

export function DebugOverlay() {
  const debug = useGameStore((s) => s.debug)
  const hud = usePlayerStore((s) => s)
  if (!debug) return null

  const f = (n: number) => n.toFixed(1)
  return (
    <div className="pointer-events-none absolute left-2 top-14 w-64 rounded bg-black/55 p-2 text-xs leading-relaxed">
      <Row label="FPS" value={String(hud.fps)} />
      <Row label="XYZ" value={`${f(hud.x)} / ${f(hud.y)} / ${f(hud.z)}`} />
      <Row
        label="Chunk"
        value={`${Math.floor(hud.x / CHUNK_SIZE)}, ${Math.floor(hud.z / CHUNK_SIZE)}`}
      />
      <Row label="Facing" value={hud.facing} />
      <Row label="Biome" value={hud.biome} />
      <Row label="Target" value={hud.targeted} />
      <Row label="Mode" value={hud.flying ? 'Flying' : hud.onGround ? 'Ground' : 'Air'} />
      <Row label="Chunks" value={String(hud.loadedChunks)} />
    </div>
  )
}
