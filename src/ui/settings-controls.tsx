import { useGameStore } from '@/state/game-store'
import { MAX_RENDER_DISTANCE, MIN_RENDER_DISTANCE } from '@/engine/constants'

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  format: (v: number) => string
}

function Slider({ label, value, min, max, step, onChange, format }: SliderProps) {
  return (
    <label className="flex flex-col gap-1">
      <div className="flex justify-between text-sm">
        <span className="text-white/80">{label}</span>
        <span className="text-white">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="accent-emerald-400"
      />
    </label>
  )
}

export function SettingsControls() {
  const settings = useGameStore((s) => s.settings)
  const setSettings = useGameStore((s) => s.setSettings)

  return (
    <div className="flex w-full flex-col gap-4">
      <Slider
        label="Render Distance"
        value={settings.renderDistance}
        min={MIN_RENDER_DISTANCE}
        max={MAX_RENDER_DISTANCE}
        step={1}
        onChange={(v) => setSettings({ renderDistance: v })}
        format={(v) => `${v} chunks`}
      />
      <Slider
        label="Field of View"
        value={settings.fov}
        min={60}
        max={110}
        step={1}
        onChange={(v) => setSettings({ fov: v })}
        format={(v) => `${v}°`}
      />
      <Slider
        label="Mouse Sensitivity"
        value={settings.sensitivity}
        min={0.2}
        max={3}
        step={0.1}
        onChange={(v) => setSettings({ sensitivity: v })}
        format={(v) => v.toFixed(1)}
      />
      <Slider
        label="Day Length"
        value={settings.dayLength}
        min={60}
        max={1800}
        step={30}
        onChange={(v) => setSettings({ dayLength: v })}
        format={(v) => `${Math.round(v / 60)} min`}
      />
    </div>
  )
}
