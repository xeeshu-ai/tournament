import React from 'react'
import { Link, useLocation, useParams, useNavigate } from 'react-router-dom'
import { supabasePlayer } from '../lib/supabaseClient'
import { usePlayer } from '../lib/PlayerContext'
import { getGame } from '../lib/constants'

/**
 * ProfileBadge — shows account-level status.
 * Game-level status is shown inside the game space (Tournaments header).
 */
function ProfileBadge({ gameId }) {
  const { profile } = usePlayer()
  const game = gameId ? getGame(gameId) : null

  if (profile === undefined) return null

  if (profile === null) {
    return (
      <Link
        to={gameId ? `/${gameId}/profile` : '/select-game'}
        className="inline-flex items-center gap-2 rounded-full border border-red-500/50 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-300 hover:border-red-400/70 transition-colors"
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
        </span>
        Complete profile
      </Link>
    )
  }

  return (
    <Link
      to={gameId ? `/${gameId}/profile` : '/select-game'}
      className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300 hover:border-emerald-400/60 transition-colors"
    >
      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      <span className="max-w-[80px] truncate md:max-w-[120px]">{profile.full_name}</span>
    </Link>
  )
}

export function AppShell({ children }) {
  const location = useLocation()
  const { gameId } = useParams()
  const navigate = useNavigate()
  const { user } = usePlayer()

  const game = gameId ? getGame(gameId) : null

  const handleLogin = async () => {
    await supabasePlayer.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/select-game' },
    })
  }

  const handleLogout = async () => {
    await supabasePlayer.auth.signOut()
    navigate('/select-game')
  }

  // Nav items depend on whether we're in a game context
  const navItems = game
    ? [
        { to: `/${game.id}/tournaments`, label: 'Tournaments' },
        { to: `/${game.id}/profile`, label: 'Profile' },
        { to: '/rules', label: 'Rules' },
        { to: '/contact', label: 'Contact' },
      ]
    : [
        { to: '/', label: 'Home' },
        { to: '/select-game', label: 'Games' },
        { to: '/rules', label: 'Rules' },
        { to: '/contact', label: 'Contact' },
      ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900">
      <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur sticky top-0 z-30">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          {/* Logo + game context indicator */}
          <Link to={game ? `/${game.id}/tournaments` : '/'} className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500 text-slate-950 shadow-lg shadow-sky-500/40">
              <span className="text-lg font-black tracking-tight">T</span>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold tracking-wide">Tournvia</span>
              <span className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                {game ? game.name : 'Esports Tournaments'}
              </span>
            </div>
          </Link>

          {/* Desktop nav */}
          <div className="hidden items-center gap-6 text-sm font-medium md:flex">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={
                  location.pathname === item.to
                    ? 'text-sky-400'
                    : 'text-slate-300 hover:text-sky-300 transition-colors'
                }
              >
                {item.label}
              </Link>
            ))}
            {/* Game switcher pill */}
            {game && (
              <button
                onClick={() => navigate('/select-game')}
                className="rounded-full border border-slate-700 bg-slate-800/60 px-3 py-1 text-[11px] font-medium text-slate-300 hover:border-slate-500 hover:text-slate-100 transition-colors"
              >
                Switch game
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {user === undefined ? null : user ? (
              <>
                <ProfileBadge gameId={gameId} />
                <button onClick={handleLogout} className="btn-secondary text-xs">Logout</button>
              </>
            ) : (
              <button onClick={handleLogin} className="btn-primary text-xs">Login with Google</button>
            )}
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {children}
      </main>

      <footer className="border-t border-slate-800/80 bg-slate-950/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 text-xs text-slate-500">
          <span>© {new Date().getFullYear()} Tournvia. All rights reserved.</span>
          <span className="hidden md:inline">Competitive mobile gaming — fair play only.</span>
        </div>
      </footer>
    </div>
  )
}
