import React from 'react'
import { useNavigate } from 'react-router-dom'
import { GAMES } from '../../lib/constants'
import { usePlayer } from '../../lib/PlayerContext'

// Inline SVG logos per game
function GameLogo({ gameId, size = 40 }) {
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
  // Generic placeholder for coming soon
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="10" fill="#334155" />
      <circle cx="20" cy="20" r="8" stroke="#64748b" strokeWidth="2" strokeDasharray="4 2" />
    </svg>
  )
}

export function GameSelector() {
  const navigate = useNavigate()
  const { user } = usePlayer()

  const activeGames = GAMES.filter((g) => g.status === 'active')
  const soonGames = GAMES.filter((g) => g.status === 'coming_soon')

  function handleSelectGame(game) {
    if (game.status !== 'active') return
    navigate(`/${game.id}/tournaments`)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 py-4">
      {/* Header */}
      <header className="space-y-1 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-400">Tournvia</p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
          {user ? 'Choose a game' : 'Select a game to get started'}
        </h1>
        <p className="text-xs text-slate-400">
          Each game has its own tournaments, profile, and leaderboard.
        </p>
      </header>

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
            </button>
          ))}
        </div>
      </section>

      {/* Coming soon games */}
      {soonGames.length > 0 && (
        <section className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400">Coming soon</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {soonGames.map((game) => (
              <div
                key={game.id}
                className={`relative flex cursor-not-allowed items-center gap-4 rounded-2xl border p-4 opacity-50 ${game.bgClass} ${game.borderClass}`}
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
