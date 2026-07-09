import { usePlayerStore } from '@/state/player-store'

const HEARTS = 10 // 10 hearts = 20 HP

function Heart({ fill }: { fill: number }) {
  return (
    <span className="relative inline-block text-lg leading-none drop-shadow-[0_1px_0_rgba(0,0,0,0.8)]">
      <span className="text-black/60">♥</span>
      <span
        className="absolute inset-0 overflow-hidden text-red-500"
        style={{ width: `${fill * 100}%` }}
      >
        ♥
      </span>
    </span>
  )
}

export function HealthBar() {
  const health = usePlayerStore((s) => s.health)
  return (
    <div className="pointer-events-none absolute bottom-20 left-1/2 flex -translate-x-1/2 gap-[2px]">
      {Array.from({ length: HEARTS }, (_, i) => (
        <Heart key={i} fill={Math.max(0, Math.min(1, health / 2 - i))} />
      ))}
    </div>
  )
}
