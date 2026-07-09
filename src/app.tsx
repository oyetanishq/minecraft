import { BrowserRouter, Routes, Route } from 'react-router'
import { MainMenu } from '@/routes/main-menu'
import { GameScreen } from '@/routes/game-screen'
import { Settings } from '@/routes/settings'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainMenu />} />
        <Route path="/play" element={<GameScreen />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </BrowserRouter>
  )
}
