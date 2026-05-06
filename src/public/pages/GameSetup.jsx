import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabasePlayer } from '../../lib/supabaseClient'
import { usePlayer } from '../../lib/PlayerContext'

const GAME_META = {
  free_fire: { label: 'Free Fire', uidLabel: 'Free Fire UID', ignLabel: 'In-Game Name (IGN)', uidHint: 'Your numeric Free Fire UID', ignHint: 'Your in-game nickname' },
  bgmi:      { label: 'BGMI',      uidLabel: 'BGMI UID',       ignLabel: 'In-Game Name (IGN)', uidHint: 'Your numeric BGMI UID',       ignHint: 'Your in-game nickname' },
}

export function GameSetup() {
  const { gameId } = useParams()
  const { profile, fetchGameProfile } = usePlayer()
  const navigate = useNavigate()

  const meta = GAME_META[gameId] || { label: gameId, uidLabel: 'Game UID', ignLabel: 'In-Game Name', uidHint: '', ignHint: '' }

  const [uid, setUid] = React.useState('')
  const [ign, setIgn] = React.useState('')
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState(null)
  const [checking, setChecking] = React.useState(true)

  // Check if game profile already exists — if so, skip setup
  React.useEffect(() => {
    if (!profile?.id) return
    fetchGameProfile(profile.id, gameId).then(gp => {
      if (gp) navigate(`/${gameId}/tournaments`, { replace: true })
      else setChecking(false)
    })
  }, [profile?.id, gameId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    const gameUid = uid.trim()
    const inGameName = ign.trim()

    if (!gameUid) { setError(`${meta.uidLabel} is required.`); return }
    if (!inGameName) { setError(`${meta.ignLabel} is required.`); return }

    setSaving(true)

    // Upsert game profile (insert or update by player_id + game_id)
    const { error: err } = await supabasePlayer
      .from('game_profiles')
      .upsert(
        { player_id: profile.id, game_id: gameId, game_uid: gameUid, in_game_name: inGameName, status: 'pending' },
        { onConflict: 'player_id,game_id' }
      )

    if (err) { setError(err.message); setSaving(false); return }

    navigate(`/${gameId}/tournaments`, { replace: true })
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <span className="h-8 w-8 rounded-full border-2 border-sky-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500 shadow-xl shadow-sky-500/30">
          <span className="text-2xl font-black text-slate-950">T</span>
        </div>
        <div className="text-center">
          <h1 className="text-xl font-bold text-white">Set up {meta.label}</h1>
          <p className="mt-1 text-sm text-slate-400">Link your {meta.label} account to Tournvia</p>
        </div>
      </div>

      {/* Steps indicator */}
      <div className="mb-6 flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full border border-sky-500 text-xs font-bold text-sky-400">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
        </div>
        <span className="text-xs text-slate-500">Tournvia Profile</span>
        <div className="mx-1 h-px w-8 bg-sky-500/40" />
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-500 text-xs font-bold text-slate-950">2</div>
        <span className="text-xs text-sky-400 font-medium">Game Profile</span>
      </div>

      {/* Card */}
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl backdrop-blur">
        <p className="mb-6 text-sm text-slate-400">Your {meta.label} details for tournament registrations.</p>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-300" htmlFor="ign">
              {meta.ignLabel} <span className="text-red-400">*</span>
            </label>
            <input
              id="ign"
              type="text"
              value={ign}
              onChange={e => setIgn(e.target.value)}
              placeholder={meta.ignHint}
              maxLength={32}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-300" htmlFor="uid">
              {meta.uidLabel} <span className="text-red-400">*</span>
            </label>
            <input
              id="uid"
              type="text"
              value={uid}
              onChange={e => setUid(e.target.value.replace(/\D/g, ''))}
              placeholder={meta.uidHint}
              maxLength={20}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
            <p className="mt-1 text-xs text-slate-500">Numbers only — find it in your {meta.label} profile</p>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:opacity-50"
        >
          {saving ? (
            <><span className="h-4 w-4 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" /> Saving…</>
          ) : `Enter ${meta.label} →`}
        </button>

        <button
          type="button"
          onClick={() => navigate('/select-game')}
          className="mt-3 w-full rounded-xl px-4 py-2.5 text-xs text-slate-500 transition hover:text-slate-300"
        >
          ← Back to game selection
        </button>
      </form>
    </div>
  )
}
