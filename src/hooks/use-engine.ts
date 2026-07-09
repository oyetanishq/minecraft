import { useEffect, useRef } from 'react'
import { Engine } from '@/engine/engine'

/** Mounts the imperative Three.js engine onto a canvas for the component's life. */
export function useEngine() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<Engine | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const engine = new Engine(canvas)
    engineRef.current = engine
    if (import.meta.env.DEV) {
      ;(window as unknown as { __engine: Engine }).__engine = engine
    }
    engine.start()
    return () => {
      engine.dispose()
      engineRef.current = null
    }
  }, [])

  return { canvasRef, engineRef }
}
