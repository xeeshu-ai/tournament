import React from 'react'
import { usePlayer } from '../lib/PlayerContext'
import { supabasePlayer } from '../lib/supabaseClient'

/**
 * AccountSetupModal
 * Shown on first login. Blocks the entire app until the player
 * enters their display name (and optional phone) and saves.
 * No admin verification needed — saves directly to the players table.
 */
export function AccountSetupModal() {
  const { user, profile, refreshProfile } = usePlayer()

  const [form, setForm] = React.useState({ full_name: '', phone: '' })
  const [status, setStatus] = React.useState(null) // null | 'loading' | 'name-error' | 'error'

  const handleSubmit = async (e) => {
    e.preventDefault()
    const name = form.full_name.trim()
    if (!name) return
    if (!/^[a-zA-Z0-9 .'-]+$/.test(name)) {
      setStatus('name-error'); return
    }
    setStatus('loading')
    const { error } = await supabasePlayer
      .from('players')
      .update({
        full_name: name,
        phone: form.phone.trim() || null,
        profile_setup: true,
      })
      .eq('id', profile.id)

    if (error) { setStatus('error'); return }
    await refreshProfile()
    // Modal will auto-dismiss once refreshProfile sets profile.profile_setup = true
  }

  return (
    // Full-screen backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm px-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby="setup-title"
    >
      <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl shadow-slate-950/80 p-6 space-y-6">

        {/* Logo + heading */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500 text-slate-950 shadow-lg shadow-sky-500/40">
              <span className="text-lg font-black tracking-tight">T</span>
            </div>
            <span className="text-sm font-semibold text-slate-50 tracking-wide">Tournvia</span>
          </div>
          <div>
            <h1 id="setup-title" className="text-lg font-semibold text-slate-50">
              Set up your account
            </h1>
            <p className="mt-1 text-xs text-slate-400">
              Signed in as{' '}
              <span className="text-slate-300">{user?.email}</span>.
              Choose a display name to continue.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">

          <div>
            <label className="label" htmlFor="setup-name">
              Display name <span className="text-red-400">*</span>
            </label>
            <input
              id="setup-name"
              className="input"
              value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              placeholder="e.g. ZeeshanYT"
              required
              autoFocus
              autoComplete="off"
            />
            <p className="mt-1.5 text-[11px] text-slate-500">
              This is your public Tournvia name. Letters, numbers, spaces, dots and hyphens only.
            </p>
          </div>

          <div>
            <label className="label" htmlFor="setup-phone">
              Phone{' '}
              <span className="font-normal text-slate-500">(optional)</span>
            </label>
            <input
              id="setup-phone"
              type="tel"
              className="input"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="+91 XXXXX XXXXX"
            />
          </div>

          {status === 'name-error' && (
            <p className="text-[11px] text-red-400">❌ Name contains invalid characters.</p>
          )}
          {status === 'error' && (
            <p className="text-[11px] text-red-400">❌ Something went wrong. Please try again.</p>
          )}

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={status === 'loading'}
          >
            {status === 'loading' ? 'Saving…' : 'Save and continue →'}
          </button>
        </form>

      </div>
    </div>
  )
}
