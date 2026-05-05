import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import { PlayerProvider } from './lib/PlayerContext'
import { GameProvider } from './lib/GameContext'
import { AppShell } from './public/AppShell'

// Pages
import { Home } from './public/pages/Home'
import { GameSelector } from './public/pages/GameSelector'
import { GameSetup } from './public/pages/GameSetup'
import { Tournaments } from './public/pages/Tournaments'
import { TournamentDetails } from './public/pages/TournamentDetails'
import { Profile } from './public/pages/Profile'
import { Rules } from './public/pages/Rules'
import { Contact } from './public/pages/Contact'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <PlayerProvider>
        <Routes>
          {/* ── Global shell (no game context) ── */}
          <Route element={<AppShell />}>
            <Route path="/" element={<Home />} />
            <Route path="/select-game" element={<GameSelector />} />
            <Route path="/rules" element={<Rules />} />
            <Route path="/contact" element={<Contact />} />
          </Route>

          {/* ── Game-scoped shell (has :gameId in URL) ── */}
          <Route path="/:gameId" element={
            <GameProvider>
              <AppShell />
            </GameProvider>
          }>
            <Route index element={<Navigate to="tournaments" replace />} />
            <Route path="tournaments" element={<Tournaments />} />
            <Route path="tournaments/:id" element={<TournamentDetails />} />
            <Route path="profile" element={<Profile />} />
            <Route path="setup" element={<GameSetup />} />
          </Route>

          {/* ── Legacy /tournaments redirect → game selector ── */}
          <Route path="/tournaments" element={<Navigate to="/select-game" replace />} />
          <Route path="/profile" element={<Navigate to="/select-game" replace />} />

          {/* ── 404 fallback ── */}
          <Route path="*" element={<Navigate to="/select-game" replace />} />
        </Routes>
      </PlayerProvider>
    </BrowserRouter>
  </React.StrictMode>
)
