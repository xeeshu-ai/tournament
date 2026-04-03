import React from 'react'
import { supabasePlayer } from '../../lib/supabaseClient'

export function Profile() {
  const [user, setUser] = React.useState(null)
  const [profile, setProfile] = React.useState(null)
  const [loading, setLoading] = React.useState(true)
  const [form, setForm] = React.useState({ ff_uid: '', full_name: '', phone: '' })
  const [submitStatus, setSubmitStatus] = React.useState(null)

  React.useEffect(() => {
    let ignore = false
    async function load() {
      const { data } = await supabasePlayer.auth.getUser()
      const u = data?.user
      setUser(u)
      if (!u) { setLoading(false); return }
      const { data: profileData } = await supabasePlayer
        .from('players')
        .select('*')
        .eq('auth_id', u.id)
        .maybeSingle()
      if (!ignore) {
        setProfile(profileData || null)
        setLoading(false)
      }
    }
    load()
    return () => { ignore = true }
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    // Validate: no special characters in full_name
    if (!/^[a-zA-Z0-9 ]+$/.test(form.full_name)) {
      setSubmitStatus('name-error')
      return
    }
    setSubmitStatus('loading')
    const { data: inserted, error } = await supabasePlayer
      .from('players')
      .insert({
        auth_id: user.id,
        email: user.email,
        ff_uid: form.ff_uid.trim(),
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || null,
        status: 'pending'
      })
      .select()
      .single()
    if (error) {
      console.error(error)
      // uid already taken
      if (error.code === '23505') {
        setSubmitStatus('uid-taken')
      } else {
        setSubmitStatus('error')
      }
    } else {
      setProfile(inserted)
      setSubmitStatus('success')
    }
  }

  if (loading) return <p className="text-xs text-slate-400">Loading profile…</p>
  if (!user) return <p className="text-xs text-slate-300">Login with Google to view your Tournvia profile.</p>

  // ── FIRST TIME: no profile row → show registration form ──
  if (!profile || !profile.ff_uid) {
    return (
      <div className="mx-auto max-w-md space-y-5">
        <header className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-400">Welcome to Tournvia</p>
          <h1 className="text-xl font-semibold text-slate-50">Complete your profile</h1>
          <p className="text-xs text-slate-400">
            Signed in as <span className="text-slate-200">{user.email}</span>. Fill in your Free Fire details to get started.
          </p>
        </header>

        <form onSubmit={handleRegister} className="card space-y-4 text-xs text-slate-200">
          <div>
            <label className="label" htmlFor="ff_uid">Free Fire UID <span className="text-red-400">*</span></label>
            <input
              id="ff_uid"
              name="ff_uid"
              className="input"
              value={form.ff_uid}
              onChange={handleChange}
              placeholder="Enter your in-game UID"
              required
            />
            <p className="mt-1 text-[11px] text-slate-500">Your UID is locked permanently once approved. Double-check before submitting.</p>
          </div>

          <div>
            <label className="label" htmlFor="full_name">Full name <span className="text-red-400">*</span></label>
            <input
              id="full_name"
              name="full_name"
              className="input"
              value={form.full_name}
              onChange={handleChange}
              placeholder="Your in-game display name"
              required
            />
            <p className="mt-1 text-[11px] text-slate-500">Letters and numbers only — no special characters or symbols.</p>
          </div>

          <div>
            <label className="label" htmlFor="phone">Phone number <span className="text-slate-500">(optional)</span></label>
            <input
              id="phone"
              name="phone"
              type="tel"
              className="input"
              value={form.phone}
              onChange={handleChange}
              placeholder="+91 XXXXX XXXXX"
            />
          </div>

          <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-300">
            ⚠️ Make sure your Free Fire account is Level 45+ and Diamond 1 rank or above. Accounts that don't meet requirements will be rejected.
          </div>

          <button
            type="submit"
            className="btn-primary w-full text-xs"
            disabled={submitStatus === 'loading'}
          >
            {submitStatus === 'loading' ? 'Submitting…' : 'Submit for verification'}
          </button>

          {submitStatus === 'name-error' && (
            <p className="text-[11px] text-red-400">Name cannot contain special characters or symbols.</p>
          )}
          {submitStatus === 'uid-taken' && (
            <p className="text-[11px] text-red-400">This Free Fire UID is already registered. If this is your UID, contact support.</p>
          )}
          {submitStatus === 'error' && (
            <p className="text-[11px] text-red-400">Something went wrong. Please try again.</p>
          )}
        </form>
      </div>
    )
  }

  // ── RETURNING PLAYER: profile exists → show profile ──
  if (submitStatus === 'success' || profile) {
    const statusLabel = profile?.status || 'pending'
    return (
      <div className="space-y-6">
        {submitStatus === 'success' && (
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-300">
            ✅ Info submitted successfully. Verification in progress — usually takes 6 to 12 hours.
          </div>
        )}

        <header className="flex items-center gap-3">
          <img
            src={user.user_metadata?.avatar_url}
            alt={profile.full_name}
            className="h-12 w-12 rounded-full object-cover"
            onError={(e) => {
              e.target.style.display = 'none'
            }}
          />
          <div>
            <h1 className="text-xl font-semibold text-slate-50">{profile.full_name}</h1>
            <p className="text-xs text-slate-400">{user.email}</p>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="card space-y-2 text-xs text-slate-200">
            <h2 className="text-sm font-semibold text-slate-50">Account status</h2>
            <p>
              Status:{' '}
              <span className={
                statusLabel === 'approved' ? 'font-semibold text-emerald-400'
                : statusLabel === 'rejected' ? 'font-semibold text-red-400'
                : 'font-semibold text-amber-300'
              }>
                {statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)}
              </span>
            </p>
            {statusLabel === 'pending' && (
              <p className="text-[11px] text-amber-300">
                Verification in progress — usually takes 6 to 12 hours.
              </p>
            )}
            {statusLabel === 'rejected' && profile.rejection_reason && (
              <p className="text-[11px] text-red-400">
                Reason: {profile.rejection_reason}
              </p>
            )}
            <p>Free Fire UID: <span className="text-slate-100">{profile.ff_uid}</span></p>
            <p>Phone: <span className="text-slate-100">{profile.phone || 'Not added'}</span></p>
          </div>

          <div className="card space-y-3 text-xs text-slate-200">
            <h2 className="text-sm font-semibold text-slate-50">Name change</h2>
            <p>Once approved, your UID is locked forever. You can request a display name change that matches your in-game Free Fire name.</p>
            <button className="btn-secondary text-xs" type="button" disabled>
              Request name change (coming soon)
            </button>
          </div>
        </section>
      </div>
    )
  }
}