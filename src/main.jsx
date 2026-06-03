import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import { PlayerProvider } from './lib/PlayerContext'
import { GameProvider } from './lib/GameContext'
import { AuthGuard } from './lib/AuthGuard'
import { AppShell } from './public/AppShell'

// Pages
import { Home } from './public/pages/Home'
import { Login } from './public/pages/Login'
import { ProfileSetup } from './public/pages/ProfileSetup'
import { GameSelector } from './public/pages/GameSelector'
import { GameSetup } from './public/pages/GameSetup'
import { Tournaments } from './public/pages/Tournaments'
import TournamentDetails from './public/pages/TournamentDetails'
import { Profile } from './public/pages/Profile'
import { Rules } from './public/pages/Rules'
import { Contact } from './public/pages/Contact'
import { GameRules } from './public/pages/GameRules'
import { GameContact } from './public/pages/GameContact'
import { League } from './public/pages/League'
import { LeagueTournamentPage } from './public/pages/LeagueTournamentPage'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <PlayerProvider>
        <Routes>

          {/* ── Public: login (no auth required) ── */}
          <Route path="/login" element={<Login />} />

          {/* ── Forced setup: requires auth, not yet set up ── */}
          <Route path="/profile-setup" element={
            <AuthGuard>
              <ProfileSetup />
            </AuthGuard>
          } />

          {/* ── Protected: global shell (platform-wide pages) ── */}
          <Route element={
            <AuthGuard>
              <AppShell />
            </AuthGuard>
          }>
            {/* ── Root: Home page with LeagueBanner ── */}
            <Route path="/" element={<Home />} />
            <Route path="/select-game" element={<GameSelector />} />
            <Route path="/rules"       element={<Rules />} />
            <Route path="/contact"     element={<Contact />} />
            <Route path="/league"               element={<League />} />
            <Route path="/league/:tournamentId" element={<LeagueTournamentPage />} />
          </Route>

          {/* ── Protected: game-scoped shell ── */}
          <Route path="/:gameId" element={
            <AuthGuard>
              <GameProvider>
                <AppShell />
              </GameProvider>
            </AuthGuard>
          }>
            <Route index element={<Navigate to="tournaments" replace />} />
            <Route path="tournaments"     element={<Tournaments />} />
            <Route path="tournaments/:id" element={<TournamentDetails />} />
            <Route path="profile"         element={<Profile />} />
            <Route path="setup"           element={<GameSetup />} />
            {/* Game-specific pages — isolated from global /rules and /contact */}
            <Route path="rules"           element={<GameRules />} />
            <Route path="contact"         element={<GameContact />} />
          </Route>

          {/* ── Legacy + 404 ── */}
          <Route path="/tournaments" element={<Navigate to="/select-game" replace />} />
          <Route path="/profile"     element={<Navigate to="/select-game" replace />} />
          <Route path="*"            element={<Navigate to="/" replace />} />

        </Routes>
      </PlayerProvider>
    </BrowserRouter>
  </React.StrictMode>
)
