import { useEffect, useState } from 'react'
import Home from './ui/Home'
import GamePage from './ui/GamePage'

export default function App() {
  const [page, setPage] = useState<'home' | 'game'>('home')
  const [mode, setMode] = useState<'local' | 'computer' | 'online' | 'friend'>('local')
  useEffect(() => { document.title = 'Cinematic Chess — The Midnight Table' }, [])
  return page === 'home' ? (
    <Home onPlay={(next) => { setMode(next); setPage('game') }} />
  ) : (
    <GamePage mode={mode} onExit={() => setPage('home')} />
  )
}
