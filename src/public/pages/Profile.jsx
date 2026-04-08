import React from 'react'
import { usePlayer } from '../../lib/PlayerContext'
import { supabasePlayer } from '../../lib/supabaseClient'

export function Profile() {
  const { user, profile, refreshProfile } = usePlayer()
  const [submitStatus, setSubmitStatus] = React.useState(null)
  const [form, setForm] = React.useState({ ff_uid: '', full_name: '', phone: '' })
  const [resubmitting, setResubmitting] = React.useState(false)

  const loading = user === undefined || profile === undefined

  // Pre-fill form with existing data when rejected
  React.useEffect(() => {
    if (profile && profile.status === 'rejected') {
      setForm({
        ff_uid: profile.ff_uid || '',
        full_name: profile.full_name || '',
        phone: profile.phone || '',
      })
    }
  }, [profile])

  if (loading) return <p className="text-xs text-slate-400">Loading profile…</p>
  if (!user) return <p className="text-xs text-slate-300">Login with Google to view your Tournvia profile.</p>

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  // ── First time registration ──
  const handleRegister = async (e) => {
    e.preventDefault()
    if (!/^[a-zA-Z0-9 ]+$/.test(form.full_name)) {
      setSubmitStatus('name-error')
      return
    }
    setSubmitStatus('loading')
    const { error } = await supabasePlayer
      .from('players')
      .insert({
        auth_id: user.id,
        email: user.email,
        ff_uid: form.ff_uid.trim(),
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || null,
        status: 'pending',
      })

    if (error) {
      console.error(error)
      if (error.code === '23505') setSubmitStatus('uid-taken')
      else setSubmitStatus('error')
    } else {
      await refreshProfile()
      setSubmitStatus('success')
    }
  }

  // ── Resubmit after rejection ──
  const handleResubmit = async (e) => {
    e.preventDefault()
    if (!/^[a-zA-Z0-9 ]+$/.test(form.full_name)) {
      setSubmitStatus('name-error')
      return
    }
    setSubmitStatus('loading')
    const { error } = await supabasePlayer
      .from('players')
      .update({
        ff_uid: form.ff_uid.trim(),
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || null,
        status: 'pending',
        rejection_reason: null,
      })
      .eq('auth_id', user.id)

    if (error) {
      console.error(error)
      setSubmitStatus('error')
    } else {
      await refreshProfile()
      setSubmitStatus('resubmit-success')
      setResubmitting(false)
    }
  }

  // ── No profile yet ──
  if (!profile) {
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
            <input id="ff_uid" name="ff_uid" className="input" value={form.ff_uid} onChange={handleChange} placeholder="Enter your in-game UID" required />
            <p className="mt-1 text-[11px] text-slate-500">Double-check before submitting — your UID is locked once approved.</p>
          </div>
          <div>
            <label className="label" htmlFor="full_name">Full name <span className="text-red-400">*</span></label>
            <input id="full_name" name="full_name" className="input" value={form.full_name} onChange={handleChange} placeholder="Your in-game display name" required />
            <p className="mt-1 text-[11px] text-slate-500">Letters and numbers only.</p>
          </div>
          <div>
            <label className="label" htmlFor="phone">Phone number <span className="text-slate-500">(optional)</span></label>
            <input id="phone" name="phone" type="tel" className="input" value={form.phone} onChange={handleChange} placeholder="+91 XXXXX XXXXX" />
          </div>
          <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-300">
            ⚠️ Make sure your Free Fire account is Level 45+ and Diamond 1 rank or above.
          </div>
          <button type="submit" className="btn-primary w-full text-xs" disabled={submitStatus === 'loading'}>
            {submitStatus === 'loading' ? 'Submitting…' : 'Submit for verification'}
          </button>
          {submitStatus === 'name-error' && <p className="text-[11px] text-red-400">Name cannot contain special characters.</p>}
          {submitStatus === 'uid-taken' && <p className="text-[11px] text-red-400">This UID is already registered. Contact support if this is yours.</p>}
          {submitStatus === 'error' && <p className="text-[11px] text-red-400">Something went wrong. Please try again.</p>}
        </form>
      </div>
    )
  }

  const statusLabel = profile.status || 'pending'

  // ── Rejected: show resubmit form ──
  if (statusLabel === 'rejected') {
    return (
      <div className="mx-auto max-w-md space-y-5">
        <header className="space-y-1">
          <h1 className="text-xl font-semibold text-slate-50">Profile Rejected</h1>
          {profile.rejection_reason && (
            <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-[11px] text-red-400">
              ❌ Reason: {profile.rejection_reason}
            </div>
          )}
          <p className="text-xs text-slate-400">Fix the issue above and resubmit your details for re-verification.</p>
        </header>

        {submitStatus === 'resubmit-success' ? (
          <div className="card text-xs text-emerald-400">
            ✅ Resubmitted successfully! Verification usually takes 6–12 hours.
          </div>
        ) : (
          <form onSubmit={handleResubmit} className="card space-y-4 text-xs text-slate-200">
            <div>
              <label className="label" htmlFor="ff_uid">Free Fire UID <span className="text-red-400">*</span></label>
              <input id="ff_uid" name="ff_uid" className="input" value={form.ff_uid} onChange={handleChange} placeholder="Enter your in-game UID" required />
            </div>
            <div>
              <label className="label" htmlFor="full_name">Full name <span className="text-red-400">*</span></label>
              <input id="full_name" name="full_name" className="input" value={form.full_name} onChange={handleChange} placeholder="Your in-game display name" required />
              <p className="mt-1 text-[11px] text-slate-500">Letters and numbers only.</p>
            </div>
            <div>
              <label className="label" htmlFor="phone">Phone number <span className="text-slate-500">(optional)</span></label>
              <input id="phone" name="phone" type="tel" className="input" value={form.phone} onChange={handleChange} placeholder="+91 XXXXX XXXXX" />
            </div>
            <button type="submit" className="btn-primary w-full text-xs" disabled={submitStatus === 'loading'}>
              {submitStatus === 'loading' ? 'Resubmitting…' : 'Resubmit for verification'}
            </button>
            {submitStatus === 'name-error' && <p className="text-[11px] text-red-400">Name cannot contain special characters.</p>}
            {submitStatus === 'error' && <p className="text-[11px] text-red-400">Something went wrong. Please try again.</p>}
          </form>
        )}
      </div>
    )
  }

  // ── Approved / Pending ──
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
          onError={(e) => { e.target.style.display = 'none' }}
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
              : 'font-semibold text-amber-300'
            }>
              {statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)}
            </span>
          </p>
          {statusLabel === 'pending' && (
            <p className="text-[11px] text-amber-300">Verification in progress — usually takes 6 to 12 hours.</p>
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
