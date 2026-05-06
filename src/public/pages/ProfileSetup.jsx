import React from 'react'
import { useNavigate } from 'react-router-dom'
import { supabasePlayer } from '../../lib/supabaseClient'
import { usePlayer } from '../../lib/PlayerContext'

export function ProfileSetup() {
  const { profile, refreshProfile } = usePlayer()
  const navigate = useNavigate()

  const [fullName, setFullName] = React.useState(profile?.full_name || '')
  const [phone, setPhone] = React.useState(profile?.phone || '')
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState(null)

  // Already set up → skip
  React.useEffect(() => {
    if (profile?.profile_setup) navigate('/select-game', { replace: true })
  }, [profile])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    const name = fullName.trim()
    const ph = phone.trim()

    if (!name) { setError('Full name is required.'); return }
    // Phone is optional — only validate format if provided
    if (ph && !/^[6-9]\d{9}$/.test(ph)) {
      setError('Enter a valid 10-digit Indian mobile number, or leave it blank.')
      return
    }

    setSaving(true)
    const { error: err } = await supabasePlayer
      .from('players')
      .update({ full_name: name, phone: ph || null, profile_setup: true })
      .eq('id', profile.id)

    if (err) { setError(err.message); setSaving(false); return }

    await refreshProfile()
    navigate('/select-game', { replace: true })
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500 shadow-xl shadow-sky-500/30">
          <span className="text-2xl font-black text-slate-950">T</span>
        </div>
        <div className="text-center">
          <h1 className="text-xl font-bold text-white">Set up your profile</h1>
          <p className="mt-1 text-sm text-slate-400">One-time setup — takes 30 seconds</p>
        </div>
      </div>

      {/* Steps indicator */}
      <div className="mb-6 flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-500 text-xs font-bold text-slate-950">1</div>
        <span className="text-xs text-sky-400 font-medium">Tournvia Profile</span>
        <div className="mx-1 h-px w-8 bg-slate-700" />
        <div className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-700 text-xs font-bold text-slate-500">2</div>
        <span className="text-xs text-slate-500">Game Profile</span>
      </div>

      {/* Card */}
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl backdrop-blur">
        <p className="mb-6 text-sm text-slate-400">This is your Tournvia identity across all games.</p>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-300" htmlFor="fullName">
              Full Name <span className="text-red-400">*</span>
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Your real name"
              maxLength={60}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-300" htmlFor="phone">
              Phone Number <span className="text-slate-500">(optional)</span>
            </label>
            <div className="flex">
              <span className="flex items-center rounded-l-xl border border-r-0 border-slate-700 bg-slate-800/50 px-3 text-sm text-slate-400">+91</span>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="9876543210"
                className="w-full rounded-r-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Used for prize payouts. You can add it later from your profile.</p>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:opacity-50"
        >
          {saving ? (
            <><span className="h-4 w-4 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" /> Saving…</>
          ) : 'Continue →'}
        </button>
      </form>
    </div>
  )
}
