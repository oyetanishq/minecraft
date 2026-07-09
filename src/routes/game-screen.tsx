import { useEngine } from '@/hooks/use-engine'
import { useGameStore } from '@/state/game-store'
import { Crosshair } from '@/ui/crosshair'
import { Hotbar } from '@/ui/hotbar'
import { HealthBar } from '@/ui/health-bar'
import { DebugOverlay } from '@/ui/debug-overlay'
import { PauseMenu } from '@/ui/pause-menu'

function LoadingOverlay() {
  const seed = useGameStore((s) => s.seed)
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-neutral-950/80">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-emerald-400" />
      <p className="text-lg text-white">Generating world…</p>
      <p className="text-sm text-white/40">seed {seed}</p>
    </div>
  )
}

export function GameScreen() {
  const { canvasRef, engineRef } = useEngine()
  const phase = useGameStore((s) => s.phase)

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />

      {phase === 'playing' && (
        <>
          <Crosshair />
          <HealthBar />
          <Hotbar />
          <DebugOverlay />
        </>
      )}

      {phase === 'loading' && <LoadingOverlay />}
      {phase === 'paused' && <PauseMenu onResume={() => engineRef.current?.lock()} />}
    </div>
  )
}
