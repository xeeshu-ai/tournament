import React from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlayer } from '../../lib/PlayerContext'
import { useGame } from '../../lib/GameContext'
import { supabasePlayer } from '../../lib/supabaseClient'

export function GameSetup() {
  const navigate = useNavigate()
  const { user, profile } = usePlayer()
  const { game, gameProfile, gpLoading, refreshGameProfile } = useGame()

  const [form, setForm] = React.useState({ game_uid: '', in_game_name: '' })
  const [status, setStatus] = React.useState(null) // null | 'loading' | 'uid-taken' | 'name-taken' | 'error' | 'success'

  // Pre-fill form if resubmitting after rejection
  React.useEffect(() => {
    if (gameProfile?.status === 'rejected') {
      setForm({
        game_uid: gameProfile.game_uid || '',
        in_game_name: gameProfile.in_game_name || '',
      })
    }
  }, [gameProfile])

  if (!user || !profile || !game || gpLoading) return null

  // Already verified — nothing to do here
  if (gameProfile?.status === 'verified') {
    return (
      <div className="mx-auto max-w-md py-8 text-center space-y-4">
        <div className="text-4xl">✅</div>
        <h2 className="text-lg font-semibold text-slate-50">{game.name} profile verified</h2>
        <p className="text-xs text-slate-400">
          Your UID <span className="font-mono text-slate-200">{gameProfile.game_uid}</span> is verified and active.
        </p>
        <button onClick={() => navigate(`/${game.id}/tournaments`)} className="btn-primary text-xs">
          Go to tournaments
        </button>
      </div>
    )
  }

  // Pending — waiting for admin
  if (gameProfile?.status === 'pending') {
    return (
      <div className="mx-auto max-w-md py-8 space-y-5">
        <div className="card text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-amber-500/40 bg-amber-500/10">
            <span className="text-xl">⏳</span>
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-50">Waiting for admin review</h2>
            <p className="mt-1 text-xs text-slate-400">
              Your {game.name} profile has been submitted and is under review. This usually takes a few hours.
            </p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-left space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wide text-slate-400">{game.uidLabel}</span>
              <span className="font-mono text-xs text-slate-100">{gameProfile.game_uid}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wide text-slate-400">In-game name</span>
              <span className="text-xs text-slate-100">{gameProfile.in_game_name || '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wide text-slate-400">Status</span>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-amber-400">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-500" />
                </span>
                Pending
              </span>
            </div>
          </div>
          <button
            onClick={() => navigate(`/${game.id}/tournaments`)}
            className="btn-secondary w-full text-xs"
          >
            Back to tournaments
          </button>
        </div>
      </div>
    )
  }

  const isResubmit = gameProfile?.status === 'rejected'

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus('loading')

    if (isResubmit) {
      // Update existing rejected row
      const { error } = await supabasePlayer
        .from('game_profiles')
        .update({
          game_uid: form.game_uid.trim(),
          in_game_name: form.in_game_name.trim(),
          status: 'pending',
          rejection_reason: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', gameProfile.id)

      if (error) { setStatus('error'); return }
    } else {
      // Fresh insert
      const { error } = await supabasePlayer
        .from('game_profiles')
        .insert({
          player_id: profile.id,
          game_id: game.id,
          game_uid: form.game_uid.trim(),
          in_game_name: form.in_game_name.trim(),
          status: 'pending',
        })

      if (error) {
        if (error.code === '23505') setStatus('uid-taken')
        else setStatus('error')
        return
      }
    }

    await refreshGameProfile()
    setStatus('success')
    setTimeout(() => navigate(`/${game.id}/tournaments`), 1400)
  }

  if (status === 'success') {
    return (
      <div className="mx-auto max-w-md py-8 text-center space-y-3">
        <div className="text-4xl">🎮</div>
        <h2 className="text-lg font-semibold text-slate-50">Profile submitted!</h2>
        <p className="text-xs text-slate-400">
          Your {game.name} UID is under review. Admins will verify it shortly.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md space-y-5 py-4">
      {/* Header */}
      <header className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-400">
          {isResubmit ? `Resubmit — ${game.name}` : `Setup — ${game.name}`}
        </p>
        <h1 className="text-xl font-semibold text-slate-50">
          {isResubmit ? 'Fix your profile' : `Add your ${game.name} profile`}
        </h1>
        <p className="text-xs text-slate-400">
          {isResubmit
            ? 'Your previous submission was rejected. Correct the details below and resubmit.'
            : `Enter your exact ${game.name} in-game name and UID. An admin will verify them before you can join tournaments.`}
        </p>
      </header>

      {/* Rejection reason banner */}
      {isResubmit && gameProfile.rejection_reason && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-red-400">Rejection reason</p>
          <p className="text-xs text-red-300">{gameProfile.rejection_reason}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card space-y-5">

        {/* In-game name — REQUIRED, must match exactly */}
        <div>
          <label className="label" htmlFor="in_game_name">
            In-game name <span className="text-red-400">*</span>
          </label>
          <input
            id="in_game_name"
            name="in_game_name"
            className="input"
            value={form.in_game_name}
            onChange={handleChange}
            placeholder={`Your exact ${game.name} nickname`}
            required
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />
          <p className="mt-1.5 text-[11px] text-amber-400">
            ⚠️ Must match your in-game name exactly — including capitalisation and spaces.
          </p>
        </div>

        {/* UID */}
        <div>
          <label className="label" htmlFor="game_uid">
            {game.uidLabel} <span className="text-red-400">*</span>
          </label>
          <input
            id="game_uid"
            name="game_uid"
            className="input font-mono"
            value={form.game_uid}
            onChange={handleChange}
            placeholder={game.uidPlaceholder}
            required
            inputMode="numeric"
            autoComplete="off"
          />
          {game.uidHint && (
            <p className="mt-1.5 text-[11px] text-slate-500">{game.uidHint}</p>
          )}
        </div>

        {/* Requirements notice */}
        {(game.minLevel || game.minRank) && (
          <div className="rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2.5 text-[11px] text-slate-400">
            <span className="font-semibold text-slate-300">Eligibility: </span>
            Level {game.minLevel}+{game.minRank ? `, ${game.minRank} rank or above` : ''}. Mobile only — no emulators.
          </div>
        )}

        <button
          type="submit"
          className="btn-primary w-full"
          disabled={status === 'loading'}
        >
          {status === 'loading'
            ? 'Submitting…'
            : isResubmit
            ? `Resubmit ${game.name} profile`
            : `Submit ${game.name} profile`}
        </button>

        {status === 'uid-taken' && (
          <p className="text-[11px] text-red-400">
            This UID is already registered on Tournvia. If this is your account, contact support.
          </p>
        )}
        {status === 'error' && (
          <p className="text-[11px] text-red-400">Something went wrong. Please try again.</p>
        )}
      </form>

      <button
        onClick={() => navigate(`/${game.id}/tournaments`)}
        className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
      >
        ← Back to tournaments
      </button>
    </div>
  )
}
