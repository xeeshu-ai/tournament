import React from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlayer } from '../../lib/PlayerContext'
import { supabasePlayer } from '../../lib/supabaseClient'
import { ACTIVE_GAMES } from '../../lib/constants'

// Per-game profile card — fetches its own game_profile row
function GameProfileCard({ game, playerId }) {
  const navigate = useNavigate()
  const [gp, setGp] = React.useState(undefined) // undefined=loading, null=none

  React.useEffect(() => {
    if (!playerId) return
    supabasePlayer
      .from('game_profiles')
      .select('id, game_uid, in_game_name, status, rejection_reason')
      .eq('player_id', playerId)
      .eq('game_id', game.id)
      .maybeSingle()
      .then(({ data }) => setGp(data ?? null))
  }, [playerId, game.id])

  const statusBadge = {
    verified: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
    pending:  'border-amber-500/40  bg-amber-500/10  text-amber-300',
    rejected: 'border-red-500/40    bg-red-500/10    text-red-300',
  }

  const statusIcon = { verified: '✓', pending: '⏳', rejected: '✕' }

  return (
    <div className={`rounded-2xl border bg-slate-900/60 p-4 space-y-3 ${game.borderClass}`}>
      {/* Game header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`rounded-lg px-2 py-0.5 text-[11px] font-bold tracking-wide ${game.badgeClass}`}
          >
            {game.shortName}
          </span>
          <span className="text-xs font-semibold text-slate-200">{game.name}</span>
        </div>
        {/* Status badge */}
        {gp && (
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusBadge[gp.status] ?? statusBadge.pending}`}>
            {gp.status === 'pending' && (
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-400" />
              </span>
            )}
            {statusIcon[gp.status]} {gp.status}
          </span>
        )}
      </div>

      {/* Body */}
      {gp === undefined ? (
        <p className="text-[11px] text-slate-500 animate-pulse">Loading…</p>
      ) : gp === null ? (
        // No profile yet
        <div className="space-y-2">
          <p className="text-[11px] text-slate-400">No {game.name} profile linked.</p>
          <button
            onClick={() => navigate(`/${game.id}/setup`)}
            className="btn-primary text-[11px] py-1.5 px-3"
          >
            + Set up {game.name} profile
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wide text-slate-500">{game.uidLabel}</span>
            <span className="font-mono text-[11px] text-slate-200">{gp.game_uid}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wide text-slate-500">In-game name</span>
            <span className="text-[11px] text-slate-200">{gp.in_game_name || '—'}</span>
          </div>

          {gp.status === 'pending' && (
            <p className="text-[11px] text-amber-400">Under review — admins verify within a few hours.</p>
          )}

          {gp.status === 'rejected' && (
            <div className="space-y-2">
              {gp.rejection_reason && (
                <p className="text-[11px] text-red-400">❌ {gp.rejection_reason}</p>
              )}
              <button
                onClick={() => navigate(`/${game.id}/setup`)}
                className="text-[11px] text-sky-400 hover:text-sky-300 transition-colors underline underline-offset-2"
              >
                Fix and resubmit →
              </button>
            </div>
          )}

          {gp.status === 'verified' && (
            <p className="text-[11px] text-emerald-400">✓ Verified — you can join {game.name} tournaments.</p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main Profile page ──
export function Profile() {
  const { user, profile, refreshProfile } = usePlayer()

  // Edit mode for Tournvia account
  const [editing, setEditing] = React.useState(false)
  const [form, setForm] = React.useState({ full_name: '', phone: '' })
  const [saveStatus, setSaveStatus] = React.useState(null) // null | 'loading' | 'error' | 'saved'

  const loading = user === undefined || profile === undefined

  // Seed form when profile loads
  React.useEffect(() => {
    if (profile) {
      setForm({ full_name: profile.full_name || '', phone: profile.phone || '' })
    }
  }, [profile])

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-12 w-48 rounded-xl bg-slate-800" />
        <div className="h-24 rounded-2xl bg-slate-800" />
        <div className="h-24 rounded-2xl bg-slate-800" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-sm py-12 text-center space-y-3">
        <p className="text-slate-400 text-sm">Sign in to view your profile.</p>
      </div>
    )
  }

  // ── New user: account not set up yet ──
  // (profile exists but full_name is still the raw Google name — let them confirm)
  const isFirstSetup = !profile

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.full_name.trim()) return
    if (!/^[a-zA-Z0-9 .'-]+$/.test(form.full_name)) {
      setSaveStatus('name-error'); return
    }
    setSaveStatus('loading')
    const { error } = await supabasePlayer
      .from('players')
      .update({
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || null,
      })
      .eq('auth_id', user.id)
    if (error) { setSaveStatus('error'); return }
    await refreshProfile()
    setSaveStatus('saved')
    setEditing(false)
    setTimeout(() => setSaveStatus(null), 2000)
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">

      {/* ── Player header ── */}
      <header className="flex items-center gap-3">
        {user.user_metadata?.avatar_url && (
          <img
            src={user.user_metadata.avatar_url}
            alt={profile?.full_name || 'Avatar'}
            className="h-11 w-11 rounded-full object-cover ring-2 ring-slate-700"
            onError={(e) => { e.target.style.display = 'none' }}
          />
        )}
        <div>
          <h1 className="text-lg font-semibold text-slate-50">
            {profile?.full_name || user.email?.split('@')[0]}
          </h1>
          <p className="text-[11px] text-slate-400">{user.email}</p>
        </div>
      </header>

      {/* ── Tournvia Account section ── */}
      <section className="rounded-2xl border border-slate-700 bg-slate-900/60 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-50">Tournvia Account</h2>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="text-[11px] text-sky-400 hover:text-sky-300 transition-colors"
            >
              Edit
            </button>
          )}
        </div>

        {!editing ? (
          // View mode
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wide text-slate-500">Display name</span>
              <span className="text-xs text-slate-200">{profile?.full_name || '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wide text-slate-500">Phone</span>
              <span className="text-xs text-slate-200">{profile?.phone || <span className="text-slate-500">Not added</span>}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wide text-slate-500">Email</span>
              <span className="text-xs text-slate-400">{user.email}</span>
            </div>
            {saveStatus === 'saved' && (
              <p className="text-[11px] text-emerald-400">✓ Profile saved.</p>
            )}
          </div>
        ) : (
          // Edit mode
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="label" htmlFor="full_name">
                Display name <span className="text-red-400">*</span>
              </label>
              <input
                id="full_name"
                className="input"
                value={form.full_name}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                placeholder="Your name"
                required
              />
              <p className="mt-1 text-[11px] text-slate-500">
                This is your Tournvia display name — not your in-game name.
              </p>
            </div>
            <div>
              <label className="label" htmlFor="phone">
                Phone <span className="text-slate-500 font-normal">(optional)</span>
              </label>
              <input
                id="phone"
                type="tel"
                className="input"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+91 XXXXX XXXXX"
              />
            </div>
            {saveStatus === 'name-error' && (
              <p className="text-[11px] text-red-400">Name cannot contain special characters.</p>
            )}
            {saveStatus === 'error' && (
              <p className="text-[11px] text-red-400">Something went wrong. Please try again.</p>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                className="btn-primary text-xs flex-1"
                disabled={saveStatus === 'loading'}
              >
                {saveStatus === 'loading' ? 'Saving…' : 'Save changes'}
              </button>
              <button
                type="button"
                className="btn-secondary text-xs"
                onClick={() => {
                  setEditing(false)
                  setSaveStatus(null)
                  setForm({ full_name: profile?.full_name || '', phone: profile?.phone || '' })
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </section>

      {/* ── Game Profiles section ── */}
      {profile && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-50">Game Profiles</h2>
          <p className="text-[11px] text-slate-500">
            Each game has its own profile. Set up a game profile to join tournaments for that game.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {ACTIVE_GAMES.map((game) => (
              <GameProfileCard key={game.id} game={game} playerId={profile.id} />
            ))}
          </div>
        </section>
      )}

    </div>
  )
}
