import React from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlayer } from '../../lib/PlayerContext'
import { useGame } from '../../lib/GameContext'
import { supabasePlayer } from '../../lib/supabaseClient'

/**
 * GameSetup — shown when a player has a Tournvia account (players row exists)
 * but has NOT yet submitted a game_profile for the current game.
 * Collects game_uid + in_game_name and inserts into game_profiles.
 */
export function GameSetup() {
  const navigate = useNavigate()
  const { user, profile } = usePlayer()
  const { game, refreshGameProfile } = useGame()

  const [form, setForm] = React.useState({ game_uid: '', in_game_name: '' })
  const [status, setStatus] = React.useState(null) // null | 'loading' | 'uid-taken' | 'error' | 'success'

  if (!user || !profile || !game) return null

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus('loading')

    const { error } = await supabasePlayer
      .from('game_profiles')
      .insert({
        player_id: profile.id,
        game_id: game.id,
        game_uid: form.game_uid.trim(),
        in_game_name: form.in_game_name.trim() || null,
        status: 'pending',
      })

    if (error) {
      if (error.code === '23505') setStatus('uid-taken')
      else setStatus('error')
      return
    }

    await refreshGameProfile()
    setStatus('success')
    // Short delay then navigate into the game
    setTimeout(() => navigate(`/${game.id}/tournaments`), 1200)
  }

  if (status === 'success') {
    return (
      <div className="mx-auto max-w-md py-8 text-center space-y-3">
        <div className="text-3xl">✅</div>
        <h2 className="text-lg font-semibold text-slate-50">Profile submitted!</h2>
        <p className="text-xs text-slate-400">Your {game.name} UID is under review. You'll be redirected shortly.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md space-y-6 py-4">
      {/* Header */}
      <header className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-400">
          Setting up — {game.name}
        </p>
        <h1 className="text-xl font-semibold text-slate-50">Add your {game.name} profile</h1>
        <p className="text-xs text-slate-400">
          This is your in-game identity for {game.name} tournaments on Tournvia.
          Once approved by an admin, your UID is locked.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="card space-y-4 text-xs text-slate-200">
        {/* UID field */}
        <div>
          <label className="label" htmlFor="game_uid">
            {game.uidLabel} <span className="text-red-400">*</span>
          </label>
          <input
            id="game_uid"
            name="game_uid"
            className="input"
            value={form.game_uid}
            onChange={handleChange}
            placeholder={game.uidPlaceholder}
            required
          />
          {game.uidHint && (
            <p className="mt-1 text-[11px] text-slate-500">{game.uidHint}</p>
          )}
        </div>

        {/* IGN field */}
        <div>
          <label className="label" htmlFor="in_game_name">
            In-game name <span className="text-slate-500">(optional)</span>
          </label>
          <input
            id="in_game_name"
            name="in_game_name"
            className="input"
            value={form.in_game_name}
            onChange={handleChange}
            placeholder="Your nickname shown in-game"
          />
        </div>

        {/* Requirements notice */}
        {(game.minLevel || game.minRank) && (
          <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-300">
            ⚠️ Minimum requirements: Level {game.minLevel}+{game.minRank ? `, ${game.minRank} rank or above` : ''}.
          </div>
        )}

        <button
          type="submit"
          className="btn-primary w-full text-xs"
          disabled={status === 'loading'}
        >
          {status === 'loading' ? 'Submitting…' : `Submit ${game.name} profile`}
        </button>

        {status === 'uid-taken' && (
          <p className="text-[11px] text-red-400">
            This UID is already registered. Contact support if this is yours.
          </p>
        )}
        {status === 'error' && (
          <p className="text-[11px] text-red-400">Something went wrong. Please try again.</p>
        )}
      </form>

      <button
        onClick={() => navigate('/select-game')}
        className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
      >
        ← Back to game selector
      </button>
    </div>
  )
}
