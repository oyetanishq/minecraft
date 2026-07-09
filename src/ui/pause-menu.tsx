import { useState } from 'react'
import { useNavigate } from 'react-router'
import { SettingsControls } from './settings-controls'

export function PauseMenu({ onResume }: { onResume: () => void }) {
  const navigate = useNavigate()
  const [showSettings, setShowSettings] = useState(false)

  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-6 bg-black/60 backdrop-blur-sm">
      <h1 className="text-3xl font-bold tracking-widest text-white drop-shadow">PAUSED</h1>

      {showSettings ? (
        <div className="w-80 rounded-lg bg-neutral-900/80 p-6">
          <SettingsControls />
          <button
            onClick={() => setShowSettings(false)}
            className="mt-6 w-full rounded bg-neutral-700 py-2 text-white hover:bg-neutral-600"
          >
            Back
          </button>
        </div>
      ) : (
        <div className="flex w-64 flex-col gap-3">
          <button
            onClick={onResume}
            className="rounded bg-emerald-600 py-3 font-semibold text-white hover:bg-emerald-500"
          >
            Resume
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="rounded bg-neutral-700 py-3 text-white hover:bg-neutral-600"
          >
            Settings
          </button>
          <button
            onClick={() => navigate('/')}
            className="rounded bg-neutral-800 py-3 text-white hover:bg-neutral-700"
          >
            Quit to Menu
          </button>
        </div>
      )}

      <p className="text-sm text-white/50">Click Resume or press the canvas to lock the mouse</p>
    </div>
  )
}
