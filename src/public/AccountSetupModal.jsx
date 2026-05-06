import React from 'react'
import { usePlayer } from '../lib/PlayerContext'
import { supabasePlayer } from '../lib/supabaseClient'

/**
 * AccountSetupModal
 * Opens when:
 *   1. Player logs in for the first time (auto)
 *   2. Player clicks the red badge (manual)
 * Closes when profile_setup = true OR player dismisses (only allowed if already setup)
 */
export function AccountSetupModal() {
  const { user, profile, refreshProfile, closeSetupModal } = usePlayer()
  const [form, setForm] = React.useState({
    full_name: profile?.full_name || '',
    phone: profile?.phone || '',
  })
  const [status, setStatus] = React.useState(null)

  const canDismiss = profile?.profile_setup === true

  const handleSubmit = async (e) => {
    e.preventDefault()
    const name = form.full_name.trim()
    if (!name) return
    if (!/^[a-zA-Z0-9 .'\-]+$/.test(name)) { setStatus('name-error'); return }
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
    closeSetupModal()
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/90 backdrop-blur-sm px-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby="setup-title"
    >
      <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl shadow-slate-950/80 p-6 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500 text-slate-950 shadow-lg shadow-sky-500/40">
                <span className="text-sm font-black tracking-tight">T</span>
              </div>
              <span className="text-xs font-semibold text-slate-400 tracking-wide uppercase">Tournvia Profile</span>
            </div>
            <h1 id="setup-title" className="text-lg font-semibold text-slate-50">Set up your account</h1>
            <p className="text-xs text-slate-400">
              Signed in as <span className="text-slate-300">{user?.email}</span>
            </p>
          </div>
          {/* Dismiss button — only if already setup (editing) */}
          {canDismiss && (
            <button
              onClick={closeSetupModal}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-800 hover:text-slate-300 transition-colors"
              aria-label="Close"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
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
              onChange={(e) => setForm(f => ({ ...f, full_name: e.target.value }))}
              placeholder="e.g. ZeeshanYT"
              required
              autoFocus
              autoComplete="off"
            />
            <p className="mt-1.5 text-[11px] text-slate-500">
              Your public Tournvia name. Letters, numbers, spaces, dots and hyphens only.
            </p>
          </div>

          <div>
            <label className="label" htmlFor="setup-phone">
              Phone <span className="font-normal text-slate-500">(optional)</span>
            </label>
            <input
              id="setup-phone"
              type="tel"
              className="input"
              value={form.phone}
              onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="+91 XXXXX XXXXX"
            />
          </div>

          {status === 'name-error' && (
            <p className="text-[11px] text-red-400">&#x274C; Name contains invalid characters.</p>
          )}
          {status === 'error' && (
            <p className="text-[11px] text-red-400">&#x274C; Something went wrong. Please try again.</p>
          )}

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={status === 'loading'}
          >
            {status === 'loading' ? 'Saving…' : canDismiss ? 'Save changes' : 'Save and continue →'}
          </button>
        </form>

      </div>
    </div>
  )
}
