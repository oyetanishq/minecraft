import { useNavigate } from 'react-router'
import { SettingsControls } from '@/ui/settings-controls'

export function Settings() {
  const navigate = useNavigate()
  return (
    <div className="flex h-full w-full items-center justify-center bg-neutral-900">
      <div className="w-96 rounded-lg bg-neutral-800 p-8 shadow-xl">
        <h1 className="mb-6 text-2xl font-bold text-white">Settings</h1>
        <SettingsControls />
        <button
          onClick={() => navigate('/')}
          className="mt-8 w-full rounded bg-emerald-600 py-2 font-semibold text-white hover:bg-emerald-500"
        >
          Back to Menu
        </button>
      </div>
    </div>
  )
}
