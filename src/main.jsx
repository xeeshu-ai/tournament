import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import { PlayerProvider } from './lib/PlayerContext'
import { AppShell } from './public/AppShell'
import { Home } from './public/pages/Home'
import { Tournaments } from './public/pages/Tournaments'
import { TournamentDetails } from './public/pages/TournamentDetails'
import { Profile } from './public/pages/Profile'
import { Rules } from './public/pages/Rules'
import { Contact } from './public/pages/Contact'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <PlayerProvider>
        <AppShell>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/tournaments" element={<Tournaments />} />
            <Route path="/tournaments/:id" element={<TournamentDetails />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/rules" element={<Rules />} />
            <Route path="/contact" element={<Contact />} />
          </Routes>
        </AppShell>
      </PlayerProvider>
    </BrowserRouter>
  </React.StrictMode>
)
