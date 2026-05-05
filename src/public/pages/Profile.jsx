import React from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlayer } from '../../lib/PlayerContext'
import { useGame } from '../../lib/GameContext'
import { supabasePlayer } from '../../lib/supabaseClient'

export function Profile() {
  const navigate = useNavigate()
  const { user, profile, refreshProfile } = usePlayer()
  const { game, gameProfile, gpLoading, refreshGameProfile } = useGame()

  // Account-level form (name / phone) — only shown if no players row yet
  const [accountForm, setAccountForm] = React.useState({ full_name: '', phone: '' })
  const [accountStatus, setAccountStatus] = React.useState(null)

  const loading = user === undefined || profile === undefined || gpLoading

  React.useEffect(() => {
    if (profile?.status === 'rejected') {
      setAccountForm({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
      })
    }
  }, [profile])

  if (loading) return <p className="text-xs text-slate-400">Loading profile…</p>
  if (!user) return <p className="text-xs text-slate-300">Login with Google to view your profile.</p>
  if (!game) return null

  // ── No players row yet — create account first ──
  if (!profile) {
    const handleCreateAccount = async (e) => {
      e.preventDefault()
      if (!/^[a-zA-Z0-9 ]+$/.test(accountForm.full_name)) {
        setAccountStatus('name-error'); return
      }
      setAccountStatus('loading')
      const { error } = await supabasePlayer
        .from('players')
        .insert({
          auth_id: user.id,
          email: user.email,
          full_name: accountForm.full_name.trim(),
          phone: accountForm.phone.trim() || null,
          status: 'approved', // account-level is auto-approved, game profile has its own status
        })
      if (error) { setAccountStatus('error'); return }
      await refreshProfile()
      // Redirect to game setup after account creation
      navigate(`/${game.id}/setup`)
    }

    return (
      <div className="mx-auto max-w-md space-y-5">
        <header className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-400">Welcome to Tournvia</p>
          <h1 className="text-xl font-semibold text-slate-50">Create your account</h1>
          <p className="text-xs text-slate-400">
            Signed in as <span className="text-slate-200">{user.email}</span>.
            Set up your Tournvia account first.
          </p>
        </header>
        <form onSubmit={handleCreateAccount} className="card space-y-4 text-xs text-slate-200">
          <div>
            <label className="label" htmlFor="full_name">Display name <span className="text-red-400">*</span></label>
            <input
              id="full_name" name="full_name" className="input"
              value={accountForm.full_name}
              onChange={(e) => setAccountForm((f) => ({ ...f, full_name: e.target.value }))}
              placeholder="Your name (letters and numbers only)"
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="phone">Phone <span className="text-slate-500">(optional)</span></label>
            <input
              id="phone" name="phone" type="tel" className="input"
              value={accountForm.phone}
              onChange={(e) => setAccountForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="+91 XXXXX XXXXX"
            />
          </div>
          <button type="submit" className="btn-primary w-full text-xs" disabled={accountStatus === 'loading'}>
            {accountStatus === 'loading' ? 'Creating…' : 'Continue'}
          </button>
          {accountStatus === 'name-error' && <p className="text-[11px] text-red-400">Name cannot contain special characters.</p>}
          {accountStatus === 'error' && <p className="text-[11px] text-red-400">Something went wrong. Try again.</p>}
        </form>
      </div>
    )
  }

  // ── Profile exists ──
  return (
    <div className="space-y-6">
      {/* Player header */}
      <header className="flex items-center gap-3">
        <img
          src={user.user_metadata?.avatar_url}
          alt={profile.full_name}
          className="h-12 w-12 rounded-full object-cover"
          onError={(e) => { e.target.style.display = 'none' }}
        />
        <div>
          <h1 className="text-xl font-semibold text-slate-50">{profile.full_name}</h1>
          <p className="text-xs text-slate-400">{user.email}</p>
        </div>
      </header>

      {/* Game profile card */}
      <section className="grid gap-4 md:grid-cols-2">
        <div className="card space-y-3 text-xs text-slate-200">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-50">{game.name} Profile</h2>
            <button
              onClick={() => navigate('/select-game')}
              className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
            >
              Switch game
            </button>
          </div>

          {!gameProfile ? (
            <div className="space-y-2">
              <p className="text-slate-400">No {game.name} profile yet.</p>
              <button
                onClick={() => navigate(`/${game.id}/setup`)}
                className="btn-primary text-xs"
              >
                Add {game.name} profile
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  gameProfile.status === 'verified'
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                    : gameProfile.status === 'pending'
                    ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                    : 'border-red-500/40 bg-red-500/10 text-red-300'
                }`}>
                  {gameProfile.status}
                </span>
              </div>
              <p>{game.uidLabel}: <span className="font-mono text-slate-100">{gameProfile.game_uid}</span></p>
              {gameProfile.in_game_name && (
                <p>IGN: <span className="text-slate-100">{gameProfile.in_game_name}</span></p>
              )}
              {gameProfile.status === 'pending' && (
                <p className="text-[11px] text-amber-300">Verification takes 6–12 hours.</p>
              )}
              {gameProfile.status === 'rejected' && gameProfile.rejection_reason && (
                <p className="text-[11px] text-red-400">Rejected: {gameProfile.rejection_reason}</p>
              )}
            </>
          )}
        </div>

        <div className="card space-y-3 text-xs text-slate-200">
          <h2 className="text-sm font-semibold text-slate-50">Account</h2>
          <p>Name: <span className="text-slate-100">{profile.full_name}</span></p>
          <p>Phone: <span className="text-slate-100">{profile.phone || 'Not added'}</span></p>
          <button className="btn-secondary text-xs" type="button" disabled>
            Request name change (coming soon)
          </button>
        </div>
      </section>

      {/* Other games CTA */}
      <section className="card text-xs text-slate-300 space-y-2">
        <h2 className="text-sm font-semibold text-slate-50">Other games</h2>
        <p>You can link a separate profile for each game. Your UID and progress stay separate per game.</p>
        <button
          onClick={() => navigate('/select-game')}
          className="btn-secondary text-xs"
        >
          Go to game selector
        </button>
      </section>
    </div>
  )
}
