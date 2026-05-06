import React from 'react'
import { useNavigate } from 'react-router-dom'
import { GAMES } from '../../lib/constants'
import { usePlayer } from '../../lib/PlayerContext'
import { supabasePlayer } from '../../lib/supabaseClient'

function GameLogo({ gameId, size = 44 }) {
  if (gameId === 'free_fire') return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-label="Free Fire">
      <rect width="40" height="40" rx="10" fill="#f97316" />
      <path d="M20 8L28 20L20 18L12 20L20 8Z" fill="white" opacity="0.9" />
      <path d="M20 18L26 28H14L20 18Z" fill="white" opacity="0.7" />
      <circle cx="20" cy="20" r="3" fill="white" />
    </svg>
  )
  if (gameId === 'bgmi') return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-label="BGMI">
      <rect width="40" height="40" rx="10" fill="#3b82f6" />
      <rect x="10" y="16" width="20" height="3" rx="1.5" fill="white" opacity="0.9" />
      <rect x="10" y="21" width="14" height="3" rx="1.5" fill="white" opacity="0.7" />
      <circle cx="28" cy="13" r="4" fill="white" opacity="0.85" />
    </svg>
  )
  if (gameId === 'scarfall') return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-label="Scarfall">
      <rect width="40" height="40" rx="10" fill="#334155" />
      <path d="M12 28 L20 12 L28 28" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 23 L25 23" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="10" fill="#1e293b" />
      <circle cx="20" cy="20" r="8" stroke="#334155" strokeWidth="2" strokeDasharray="4 2" />
    </svg>
  )
}

export function GameSelector() {
  const navigate = useNavigate()
  const { user, profile } = usePlayer()

  const activeGames = GAMES.filter((g) => g.status === 'active')
  const soonGames = GAMES.filter((g) => g.status === 'coming_soon')

  const handleLogin = async () => {
    await supabasePlayer.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/select-game' },
    })
  }

  function handleSelectGame(game) {
    if (game.status !== 'active') return

    // Gate: must be logged in
    if (!user) { handleLogin(); return }

    // Gate: Tournvia profile must be set up first
    if (!profile?.profile_setup) { navigate('/profile-setup'); return }

    navigate(`/${game.id}/tournaments`)
  }

  // Loading state
  if (user === undefined) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-700 border-t-sky-400" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-10 py-6">

      {/* Hero */}
      <div className="space-y-4 text-center">
        <div className="inline-flex items-center justify-center rounded-2xl bg-sky-500 p-3 shadow-xl shadow-sky-500/30">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-950">
            <path d="M8 21h8M12 17v4" />
            <path d="M7 4H4a1 1 0 0 0-1 1v3a4 4 0 0 0 4 4h1" />
            <path d="M17 4h3a1 1 0 0 1 1 1v3a4 4 0 0 1-4 4h-1" />
            <path d="M7 4h10v7a5 5 0 0 1-10 0V4z" />
          </svg>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-400 mb-1">Tournvia</p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-50">Choose your game</h1>
          <p className="mt-1.5 text-sm text-slate-400">
            Compete in tournaments, track your stats, climb the leaderboard.
          </p>
        </div>

        {/* Login CTA — only when logged out */}
        {!user && (
          <button
            onClick={handleLogin}
            className="inline-flex items-center gap-2.5 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 shadow-lg shadow-white/10 hover:bg-slate-100 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Login with Google
          </button>
        )}

        {/* Profile incomplete notice */}
        {user && profile && !profile.profile_setup && (
          <button
            onClick={() => navigate('/profile-setup')}
            className="inline-flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-xs font-medium text-red-300 hover:border-red-400/60 hover:bg-red-500/15 transition-colors"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
            </span>
            Complete your Tournvia profile to enter tournaments
          </button>
        )}
      </div>

      {/* Active games */}
      <section className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400">Available now</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {activeGames.map((game) => (
            <button
              key={game.id}
              onClick={() => handleSelectGame(game)}
              className={`group relative flex items-center gap-4 rounded-2xl border bg-gradient-to-br p-4 text-left transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-black/30 active:scale-[0.99] ${game.bgClass} ${game.borderClass}`}
            >
              <GameLogo gameId={game.id} size={44} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-50">{game.name}</span>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${game.badgeClass}`}>
                    Live
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-slate-400">{game.tagline}</p>
              </div>
              <svg className="h-4 w-4 text-slate-500 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>

              {/* Lock overlay when not ready to enter */}
              {(!user || (profile && !profile.profile_setup)) && (
                <span className="absolute inset-0 rounded-2xl bg-slate-950/40 backdrop-blur-[1px] flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* Coming soon */}
      {soonGames.length > 0 && (
        <section className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400">Coming soon</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {soonGames.map((game) => (
              <div
                key={game.id}
                className={`relative flex cursor-not-allowed items-center gap-4 rounded-2xl border p-4 opacity-40 select-none ${game.bgClass} ${game.borderClass}`}
              >
                <GameLogo gameId={game.id} size={44} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-300">{game.name}</span>
                    <span className="rounded-full border border-slate-600 bg-slate-800 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">
                      Soon
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-500">{game.tagline}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

    </div>
  )
}
