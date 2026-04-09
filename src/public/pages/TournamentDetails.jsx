import React from 'react'
import { useParams } from 'react-router-dom'
import { supabasePlayer } from '../../lib/supabaseClient'
import { usePlayer } from '../../lib/PlayerContext'

// ─── Razorpay key ─────────────────────────────────────────────────
const RZP_KEY = import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_SaUtkNyiEDfrAm'

// ─── helpers ──────────────────────────────────────────────────────

function teammateCount(teamSize) {
  if (teamSize === null || teamSize === undefined) return 0
  const n = Number(teamSize)
  if (!isNaN(n)) {
    if (n <= 1) return 0
    if (n === 2) return 1
    return 3
  }
  const s = String(teamSize).toLowerCase()
  if (s.includes('duo') || s.includes('2v2')) return 1
  if (s.includes('squad') || s === '3' || s === '4') return 3
  return 0
}

function modeBadgeLabel(t) {
  if (!t) return ''
  return [t.mode_label, t.format_label].filter(Boolean).join(' • ')
}

function teamSizeLabel(teamSize) {
  if (teamSize === null || teamSize === undefined) return ''
  const n = Number(teamSize)
  if (!isNaN(n)) {
    if (n <= 1) return 'Solo'
    if (n === 2) return 'Duo'
    if (n === 3) return 'Trio'
    if (n >= 4) return 'Squad'
  }
  return String(teamSize)
}

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true)
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

// ─── Format a date/time string nicely (IST) ────────────────────
function fmtDate(iso) {
  if (!iso) return null
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

/**
 * Given a list of all registrations in this tournament and a set of UIDs to check,
 * returns the first UID that is already present anywhere (as host or teammate).
 * Returns null if no conflict.
 */
function findUidConflict(registrations, uidsToCheck) {
  const uids = uidsToCheck.filter(Boolean).map((u) => String(u).trim())
  if (!uids.length) return null
  for (const reg of registrations) {
    const takenUids = [
      reg.host_uid,
      reg.teammate_uid_1,
      reg.teammate_uid_2,
      reg.teammate_uid_3,
    ].filter(Boolean).map(String)
    for (const uid of uids) {
      if (takenUids.includes(uid)) return uid
    }
  }
  return null
}

// ─── Already Registered Panel (with teammate editor) ──────────────

function AlreadyRegisteredPanel({ registration: initialReg, tournament, onUpdated }) {
  const slots = teammateCount(tournament.team_size)
  const [editing, setEditing] = React.useState(false)
  const [teamName, setTeamName] = React.useState(initialReg.team_name || '')
  const [mates, setMates] = React.useState([
    initialReg.teammate_uid_1 || '',
    initialReg.teammate_uid_2 || '',
    initialReg.teammate_uid_3 || '',
  ])
  const [saving, setSaving] = React.useState(false)
  const [saveErr, setSaveErr] = React.useState(null)
  const [saveOk, setSaveOk] = React.useState(false)

  const closesAt = tournament.registration_closes_at
  const editable =
    tournament.registration_status === 'open' &&
    (!closesAt || new Date() < new Date(closesAt))

  function setMate(i, val) {
    setMates((prev) => prev.map((v, idx) => (idx === i ? val : v)))
  }

  async function handleSave() {
    setSaving(true)
    setSaveErr(null)
    setSaveOk(false)

    // ── Duplicate UID check (frontend) ──
    // Get all OTHER registrations (exclude this team's own row)
    const otherRegs = (tournament.tournament_registrations || []).filter(
      (r) => r.id !== initialReg.id
    )
    const newMates = mates.map((m) => m.trim()).filter(Boolean)

    // Check teammate UIDs against other registrations
    const conflictUid = findUidConflict(otherRegs, newMates)
    if (conflictUid) {
      setSaveErr(
        `❌ UID "${conflictUid}" is already registered in this tournament (as host or teammate in another team). Remove it and try again.`
      )
      setSaving(false)
      return
    }

    // Check for duplicate UIDs within the same input (e.g. same UID in two teammate slots)
    const allNewUids = [initialReg.host_uid, ...newMates]
    const uniqueUids = new Set(allNewUids)
    if (uniqueUids.size !== allNewUids.length) {
      setSaveErr('❌ Duplicate UIDs detected in your team. Each player must have a unique UID.')
      setSaving(false)
      return
    }

    try {
      const { error } = await supabasePlayer
        .from('tournament_registrations')
        .update({
          team_name: teamName.trim() || initialReg.team_name,
          teammate_uid_1: mates[0].trim() || null,
          teammate_uid_2: mates[1].trim() || null,
          teammate_uid_3: mates[2].trim() || null,
        })
        .eq('id', initialReg.id)
      if (error) throw new Error(error.message)
      setSaveOk(true)
      setEditing(false)
      if (onUpdated) onUpdated()
    } catch (e) {
      setSaveErr(e.message || 'Could not save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const matchTime = fmtDate(tournament.start_time)
  const closesTime = fmtDate(closesAt)

  return (
    <div className="card space-y-3 text-xs text-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">✅</span>
          <h2 className="text-sm font-semibold text-emerald-400">You're registered!</h2>
        </div>
        {editable && !editing && (
          <button
            onClick={() => { setEditing(true); setSaveOk(false) }}
            className="rounded-lg bg-slate-800 px-3 py-1 text-[11px] font-semibold text-sky-400 hover:bg-slate-700 transition-colors"
          >
            Edit team
          </button>
        )}
      </div>

      {/* Timings */}
      <div className="rounded-lg bg-slate-900/70 px-3 py-2 space-y-1.5 ring-1 ring-slate-800 text-[11px]">
        {closesTime && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-400">Entry closes</span>
            <span className="font-semibold text-amber-300">{closesTime}</span>
          </div>
        )}
        {matchTime && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-400">Match starts</span>
            <span className="font-semibold text-sky-300">{matchTime}</span>
          </div>
        )}
      </div>

      {/* Team details — view mode */}
      {!editing && (
        <div className="rounded-lg bg-slate-900/80 px-3 py-3 space-y-2 ring-1 ring-slate-700">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 mb-2">Team details</p>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Team name</span>
            <span className="font-semibold text-slate-50">{initialReg.team_name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Your UID</span>
            <span className="font-mono text-slate-100">{initialReg.host_uid}</span>
          </div>
          {slots > 0 && (
            <div className="pt-1 border-t border-slate-800 space-y-1">
              <p className="text-[11px] text-slate-400 mb-1">Teammate UIDs</p>
              {Array.from({ length: slots }).map((_, i) => {
                const uid = [initialReg.teammate_uid_1, initialReg.teammate_uid_2, initialReg.teammate_uid_3][i]
                return (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-slate-400">Teammate {i + 1}</span>
                    {uid
                      ? <span className="font-mono text-slate-200">{uid}</span>
                      : <span className="italic text-slate-500">Not added yet</span>
                    }
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Team details — edit mode */}
      {editing && (
        <div className="rounded-lg bg-slate-900/80 px-3 py-3 space-y-3 ring-1 ring-sky-700">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-400">Editing team</p>

          <div className="space-y-1">
            <label className="block text-[11px] text-slate-400">Team name</label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="w-full rounded-lg bg-slate-900 px-3 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none ring-1 ring-slate-700 focus:ring-sky-500"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] text-slate-400">Your UID (locked)</label>
            <div className="flex items-center gap-2 rounded-lg bg-slate-900/60 px-3 py-2 ring-1 ring-slate-800">
              <span className="font-mono text-slate-300">{initialReg.host_uid}</span>
              <span className="ml-auto text-[10px] text-emerald-400">verified ✓</span>
            </div>
          </div>

          {slots > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] text-slate-400">
                Teammate UIDs <span className="text-slate-500">(optional)</span>
              </p>
              {Array.from({ length: slots }).map((_, i) => (
                <input
                  key={i}
                  type="text"
                  value={mates[i] ?? ''}
                  onChange={(e) => setMate(i, e.target.value)}
                  placeholder={`Teammate ${i + 1} UID`}
                  className="w-full rounded-lg bg-slate-900 px-3 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none ring-1 ring-slate-700 focus:ring-sky-500"
                />
              ))}
              <p className="text-[10px] text-slate-500">
                A UID already registered in this tournament (as host or teammate) cannot be added.
              </p>
            </div>
          )}

          {saveErr && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-[11px] text-red-400">{saveErr}</p>
          )}

          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 text-xs">
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <button
              onClick={() => {
                setEditing(false)
                setSaveErr(null)
                setTeamName(initialReg.team_name || '')
                setMates([
                  initialReg.teammate_uid_1 || '',
                  initialReg.teammate_uid_2 || '',
                  initialReg.teammate_uid_3 || '',
                ])
              }}
              className="rounded-lg bg-slate-800 px-4 py-2 text-[11px] text-slate-300 hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {saveOk && (
        <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-400">
          ✅ Team updated successfully!
        </p>
      )}

      {!editable && (
        <p className="text-[11px] text-amber-400/80">
          ⏰ Entry has closed — team details can no longer be edited.
        </p>
      )}

      <p className="text-[11px] text-slate-400">
        Room code and match schedule will be shared before the tournament starts.
      </p>
    </div>
  )
}

// ─── Registration + Payment form ──────────────────────────────────

function RegistrationForm({ tournament, onRegistered }) {
  const { user, profile } = usePlayer()
  const slots = teammateCount(tournament.team_size)
  const entryFee = Number(tournament.entry_fee) || 0

  const [step, setStep] = React.useState('form')
  const [teamName, setTeamName] = React.useState('')
  const [mates, setMates] = React.useState(Array(Math.max(0, slots)).fill(''))
  const [err, setErr] = React.useState(null)
  const [paymentId, setPaymentId] = React.useState(null)

  const hostUid = profile?.ff_uid || ''
  const closesAt = tournament.registration_closes_at
  const matchTime = fmtDate(tournament.start_time)
  const closesTime = fmtDate(closesAt)

  function setMate(i, val) {
    setMates((prev) => prev.map((v, idx) => (idx === i ? val : v)))
  }

  // ── Guard: not logged in ──
  if (!user) {
    return (
      <div className="card space-y-2 text-xs text-slate-200">
        <h2 className="text-sm font-semibold text-slate-50">Register for this tournament</h2>
        <p className="text-slate-400">You need to <span className="text-sky-400 font-semibold">sign in with Google</span> before you can register.</p>
        <button onClick={() => supabasePlayer.auth.signInWithOAuth({ provider: 'google' })} className="btn-primary w-full text-xs">
          Sign in with Google
        </button>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="card space-y-2 text-xs">
        <h2 className="text-sm font-semibold text-slate-50">Register for this tournament</h2>
        <p className="text-slate-400">Complete your <span className="text-sky-400 font-semibold">profile</span> first before registering.</p>
        <a href="/profile" className="btn-secondary w-full text-xs text-center block">Go to Profile</a>
      </div>
    )
  }

  if (profile.status === 'pending') {
    return (
      <div className="card space-y-2 text-xs">
        <h2 className="text-sm font-semibold text-slate-50">Register for this tournament</h2>
        <div className="rounded-lg bg-amber-500/10 px-3 py-2 text-[11px] text-amber-300">
          ⏳ Your profile is under verification. You can register once approved (usually 6–12 hours).
        </div>
      </div>
    )
  }

  if (profile.status === 'rejected') {
    return (
      <div className="card space-y-2 text-xs">
        <h2 className="text-sm font-semibold text-slate-50">Register for this tournament</h2>
        <div className="rounded-lg bg-red-500/10 px-3 py-2 text-[11px] text-red-400">
          ❌ Your profile was rejected. <a href="/profile" className="underline">Resubmit your profile</a> to fix this.
        </div>
      </div>
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErr(null)
    if (!teamName.trim()) return setErr('Team name is required.')
    if (!hostUid) return setErr('Could not read your UID from profile. Please refresh.')

    // ──────────────────────────────────────────────────────
    // DUPLICATE UID CHECK (frontend — fast, before opening Razorpay)
    // ──────────────────────────────────────────────────────
    const existingRegs = tournament.tournament_registrations || []
    const filledMates = mates.map((m) => m.trim()).filter(Boolean)
    const allNewUids = [hostUid, ...filledMates]

    // 1. Check host UID against all existing registrations
    const hostConflict = findUidConflict(existingRegs, [hostUid])
    if (hostConflict) {
      return setErr(
        `❌ Your UID (${hostUid}) is already registered in this tournament as part of another team. You cannot register again.`
      )
    }

    // 2. Check each teammate UID against all existing registrations
    const teammateConflict = findUidConflict(existingRegs, filledMates)
    if (teammateConflict) {
      return setErr(
        `❌ UID "${teammateConflict}" is already registered in this tournament (as host or teammate in another team). Use a different UID.`
      )
    }

    // 3. Check for duplicate UIDs within this submission itself
    const uniqueNewUids = new Set(allNewUids)
    if (uniqueNewUids.size !== allNewUids.length) {
      return setErr('❌ Duplicate UIDs in your submission. Each player must have a unique UID.')
    }
    // ──────────────────────────────────────────────────────

    setStep('paying')

    try {
      const loaded = await loadRazorpayScript()
      if (!loaded) throw new Error('Failed to load Razorpay. Check your internet connection.')

      const { data: { session } } = await supabasePlayer.auth.getSession()
      if (!session?.access_token) throw new Error('Session expired. Please sign in again.')

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-order`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            tournament_id: tournament.id,
            team_name: teamName.trim(),
            host_uid: hostUid,
            teammate_uid_1: mates[0]?.trim() || null,
            teammate_uid_2: mates[1]?.trim() || null,
            teammate_uid_3: mates[2]?.trim() || null,
          }),
        }
      )

      const orderData = await res.json()
      if (!res.ok) throw new Error(orderData.error || 'Could not create order.')

      await new Promise((resolve, reject) => {
        const options = {
          key: RZP_KEY,
          amount: orderData.amount,
          currency: orderData.currency,
          name: 'Tournvia',
          description: tournament.title,
          order_id: orderData.razorpay_order_id,
          prefill: {
            name: orderData.player_name || '',
            email: orderData.player_email || '',
            contact: profile.phone || '',
          },
          theme: { color: '#0ea5e9' },
          handler: function (response) {
            setPaymentId(response.razorpay_payment_id)
            setStep('success')
            if (onRegistered) onRegistered()
            resolve()
          },
          modal: {
            ondismiss: function () {
              setStep('form')
              setErr('⚠️ Payment cancelled. Your slot is reserved for ~10 minutes — complete payment to confirm your spot.')
              resolve()
            },
          },
        }
        const rzp = new window.Razorpay(options)
        rzp.on('payment.failed', function (response) {
          reject(new Error(response.error?.description || 'Payment failed.'))
        })
        rzp.open()
      })

    } catch (e) {
      console.error(e)
      setErr(e.message || 'Something went wrong. Please try again.')
      setStep('form')
    }
  }

  if (step === 'success') {
    return (
      <div className="card space-y-3 text-xs text-slate-200">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎉</span>
          <p className="text-sm font-semibold text-emerald-400">Registration Confirmed!</p>
        </div>
        <p>Your slot for <span className="font-semibold text-slate-50">{tournament.title}</span> is <span className="font-semibold text-emerald-400">confirmed</span>.</p>
        {paymentId && <p className="text-[11px] text-slate-400">Payment ID: <span className="font-mono text-slate-300">{paymentId}</span></p>}
        {(matchTime || closesTime) && (
          <div className="rounded-lg bg-slate-900/70 px-3 py-2 space-y-1 ring-1 ring-slate-800 text-[11px]">
            {closesTime && <div className="flex justify-between gap-2"><span className="text-slate-400">Entry closes</span><span className="font-semibold text-amber-300">{closesTime}</span></div>}
            {matchTime && <div className="flex justify-between gap-2"><span className="text-slate-400">Match starts</span><span className="font-semibold text-sky-300">{matchTime}</span></div>}
          </div>
        )}
        <p className="text-[11px] text-amber-300">💡 You can still add or update teammate UIDs from this page before entries close.</p>
        <p className="text-[11px] text-slate-400">Room code will be shared before the match starts.</p>
      </div>
    )
  }

  if (step === 'paying') {
    return (
      <div className="card flex flex-col items-center gap-3 py-8 text-xs text-slate-400">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-600 border-t-sky-400" />
        <p>Opening payment…</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-3 text-xs text-slate-200">
      <h2 className="text-sm font-semibold text-slate-50">Register for this tournament</h2>

      {/* Timings */}
      {(closesTime || matchTime) && (
        <div className="rounded-lg bg-slate-900/70 px-3 py-2 space-y-1.5 ring-1 ring-slate-800 text-[11px]">
          {closesTime && <div className="flex justify-between gap-2"><span className="text-slate-400">Entry closes</span><span className="font-semibold text-amber-300">{closesTime}</span></div>}
          {matchTime && <div className="flex justify-between gap-2"><span className="text-slate-400">Match starts</span><span className="font-semibold text-sky-300">{matchTime}</span></div>}
        </div>
      )}

      {/* Your UID — readonly */}
      <div className="space-y-1">
        <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Your Free Fire UID</label>
        <div className="flex items-center gap-2 rounded-lg bg-slate-900/80 px-3 py-2 ring-1 ring-slate-700">
          <span className="flex-1 text-slate-100">{hostUid || '...'}</span>
          <span className="text-[10px] rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-400">verified ✓</span>
        </div>
        <p className="text-[11px] text-slate-500">Auto-filled from your approved profile.</p>
      </div>

      <div className="space-y-1">
        <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Team name <span className="text-red-400">*</span></label>
        <input
          type="text"
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          placeholder="e.g. Team Blaze"
          className="w-full rounded-lg bg-slate-900 px-3 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none ring-1 ring-slate-700 focus:ring-sky-500"
          required
        />
      </div>

      {slots > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Teammate UIDs <span className="normal-case font-normal text-slate-500">(optional — can be added later)</span>
          </p>
          {Array.from({ length: slots }).map((_, i) => (
            <input
              key={i}
              type="text"
              value={mates[i] ?? ''}
              onChange={(e) => setMate(i, e.target.value)}
              placeholder={`Teammate ${i + 1} UID (optional)`}
              className="w-full rounded-lg bg-slate-900 px-3 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none ring-1 ring-slate-700 focus:ring-sky-500"
            />
          ))}
          <p className="text-[10px] text-slate-500">
            UIDs already in this tournament cannot be added as teammates.
          </p>
        </div>
      )}

      {err && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-[11px] text-red-400">{err}</p>}

      <div className="flex items-center justify-between rounded-lg bg-slate-900/60 px-3 py-2 text-[11px]">
        <span className="text-slate-400">Entry fee</span>
        <span className="font-semibold text-slate-50">{entryFee === 0 ? 'FREE' : `₹${entryFee}`}</span>
      </div>

      <button type="submit" className="btn-primary w-full text-xs">
        {entryFee === 0 ? 'Register Now' : `Pay ₹${entryFee} & Register`}
      </button>

      <p className="text-[11px] text-slate-500">Secure payment via Razorpay · UPI, cards, netbanking accepted</p>
    </form>
  )
}

// ─── Main page ────────────────────────────────────────────────────

export function TournamentDetails() {
  const { id } = useParams()
  const { profile } = usePlayer()
  const [tournament, setTournament] = React.useState(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(null)

  async function load(ignore) {
    setLoading(true)
    const { data, error } = await supabasePlayer
      .from('tournaments')
      .select('*, tournament_registrations(*), long_brackets(*, long_br_matches(*))')
      .eq('id', id)
      .maybeSingle()
    if (!ignore) {
      if (error) {
        console.error(error)
        setError('Unable to load tournament.')
      } else {
        setTournament(data)
      }
      setLoading(false)
    }
  }

  React.useEffect(() => {
    let ignore = false
    load(ignore)
    return () => { ignore = true }
  }, [id])

  if (loading) return <p className="text-xs text-slate-400">Loading tournament…</p>
  if (error || !tournament) return <p className="text-xs text-red-400">{error || 'Tournament not found.'}</p>

  const isLong = tournament.type === 'long'
  const registrationOpen = tournament.registration_status === 'open'
  const isFull = tournament.filled_slots >= tournament.max_slots
  const matchTime = fmtDate(tournament.start_time)
  const closesTime = fmtDate(tournament.registration_closes_at)

  // Is the logged-in player already in this tournament as host OR as a teammate on someone else's team?
  const allRegs = tournament.tournament_registrations || []
  const myUid = profile?.ff_uid || null

  const myReg = myUid
    ? allRegs.find((r) => r.host_uid === myUid) || null
    : null

  const addedAsTeammate = myUid && !myReg
    ? allRegs.find((r) =>
        r.teammate_uid_1 === myUid ||
        r.teammate_uid_2 === myUid ||
        r.teammate_uid_3 === myUid
      ) || null
    : null

  function renderRightPanel() {
    // Already registered as host
    if (myReg) {
      return (
        <AlreadyRegisteredPanel
          registration={myReg}
          tournament={tournament}
          onUpdated={() => load(false)}
        />
      )
    }

    // Already added as a teammate in someone else's team
    if (addedAsTeammate) {
      return (
        <div className="card space-y-3 text-xs text-slate-200">
          <div className="flex items-center gap-2">
            <span className="text-lg">👥</span>
            <h2 className="text-sm font-semibold text-sky-400">You're in this tournament!</h2>
          </div>
          <div className="rounded-lg bg-slate-900/80 px-3 py-3 space-y-2 ring-1 ring-slate-700">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 mb-1">Your team</p>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Team name</span>
              <span className="font-semibold text-slate-50">{addedAsTeammate.team_name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Host UID</span>
              <span className="font-mono text-slate-200">{addedAsTeammate.host_uid}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Your role</span>
              <span className="text-sky-300">Teammate</span>
            </div>
          </div>
          {(closesTime || matchTime) && (
            <div className="rounded-lg bg-slate-900/70 px-3 py-2 space-y-1.5 ring-1 ring-slate-800 text-[11px]">
              {closesTime && <div className="flex justify-between gap-2"><span className="text-slate-400">Entry closes</span><span className="font-semibold text-amber-300">{closesTime}</span></div>}
              {matchTime && <div className="flex justify-between gap-2"><span className="text-slate-400">Match starts</span><span className="font-semibold text-sky-300">{matchTime}</span></div>}
            </div>
          )}
          <p className="text-[11px] text-amber-300">
            ⚠️ You have been added to a team by {addedAsTeammate.team_name}. You cannot register as host in this tournament.
          </p>
          <p className="text-[11px] text-slate-400">Room code will be shared before the match starts.</p>
        </div>
      )
    }

    if (!registrationOpen) {
      return (
        <div className="card space-y-2 text-xs text-slate-400">
          <h2 className="text-sm font-semibold text-slate-50">Registration</h2>
          <p>Entries are currently closed for this tournament.</p>
          {matchTime && <div className="flex justify-between text-[11px]"><span className="text-slate-400">Match starts</span><span className="font-semibold text-sky-300">{matchTime}</span></div>}
        </div>
      )
    }

    if (isFull) {
      return (
        <div className="card space-y-2 text-xs text-slate-400">
          <h2 className="text-sm font-semibold text-slate-50">Registration</h2>
          <p className="text-red-400">All slots are full. No more registrations.</p>
          {matchTime && <div className="flex justify-between text-[11px]"><span className="text-slate-400">Match starts</span><span className="font-semibold text-sky-300">{matchTime}</span></div>}
        </div>
      )
    }

    return <RegistrationForm tournament={tournament} onRegistered={() => load(false)} />
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="badge">{isLong ? 'Long Tournament' : 'Single Match'}</p>
        <h1 className="text-2xl font-semibold text-slate-50">{tournament.title}</h1>
        <p className="text-xs text-slate-400">
          {modeBadgeLabel(tournament)}
          {tournament.map ? ` • ${tournament.map}` : ''}
          {tournament.team_size ? ` • ${teamSizeLabel(tournament.team_size)}` : ''}
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-[2fr_1.2fr]">
        <div className="space-y-4">
          <div className="card space-y-2 text-xs text-slate-200">
            <h2 className="text-sm font-semibold text-slate-50">Prize pool &amp; points</h2>
            <p className="whitespace-pre-line">{tournament.prize_text}</p>
            {tournament.points_table && (
              <div className="mt-3 rounded-xl bg-slate-900/80 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Points table</p>
                <p className="mt-1 whitespace-pre-line text-xs text-slate-200">{tournament.points_table}</p>
              </div>
            )}
          </div>

          {isLong && (
            <div className="card space-y-3">
              <h2 className="text-sm font-semibold text-slate-50">Registered teams</h2>
              <ul className="text-xs text-slate-200">
                {allRegs.map((r) => (
                  <li key={r.id} className="flex items-center justify-between border-b border-slate-800 py-1 last:border-0">
                    <span>{r.team_name}</span>
                    <span className="text-[11px] text-slate-400">Host UID: {r.host_uid}</span>
                  </li>
                ))}
                {allRegs.length === 0 && <li className="text-xs text-slate-400">No teams registered yet.</li>}
              </ul>
            </div>
          )}

          {isLong && (
            <div className="card space-y-3">
              <h2 className="text-sm font-semibold text-slate-50">Bracket</h2>
              {(tournament.long_brackets || []).length === 0 ? (
                <p className="text-xs text-slate-400">Fixtures haven't been generated yet. Check back after registration closes.</p>
              ) : (
                (tournament.long_brackets || []).map((bracket) => (
                  <div key={bracket.id} className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{bracket.name || `Bracket ${bracket.id}`}</p>
                    <ul className="text-xs text-slate-200">
                      {(bracket.long_br_matches || []).map((match) => (
                        <li key={match.id} className="flex items-center justify-between border-b border-slate-800 py-1 last:border-0">
                          <span>Round {match.round_number} — Match {match.match_number}</span>
                          <span className="text-[11px] text-slate-400">{match.winner_registration_id ? '✅ Decided' : 'Pending'}</span>
                        </li>
                      ))}
                      {(!bracket.long_br_matches || bracket.long_br_matches.length === 0) && (
                        <li className="text-xs text-slate-400">No matches yet.</li>
                      )}
                    </ul>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="card space-y-2 text-xs text-slate-200">
            <h2 className="text-sm font-semibold text-slate-50">Entry details</h2>
            <p>Entry fee: <span className="font-semibold text-slate-50">₹{tournament.entry_fee}</span></p>
            <p>
              Slots:{' '}
              <span className={isFull ? 'font-semibold text-red-400' : 'font-semibold text-emerald-400'}>
                {tournament.filled_slots}/{tournament.max_slots}
              </span>
              {isFull && <span className="ml-1 text-red-400">· Full</span>}
            </p>
            {closesTime && <div className="flex justify-between text-[11px]"><span className="text-slate-400">Entry closes</span><span className="font-semibold text-amber-300">{closesTime}</span></div>}
            {matchTime && <div className="flex justify-between text-[11px]"><span className="text-slate-400">Match starts</span><span className="font-semibold text-sky-300">{matchTime}</span></div>}
            <p>Requirements: Level 45+, Diamond 1+, mobile only (no emulators).</p>
            <p className="text-[11px] text-amber-300">No refunds after joining. Make sure you can play at the scheduled time.</p>
          </div>

          {renderRightPanel()}

          {tournament.youtube_live_url && (
            <div className="card space-y-2 text-xs text-slate-200">
              <h2 className="text-sm font-semibold text-slate-50">Watch live on YouTube</h2>
              <p>Finals and featured matches are streamed live.</p>
              <a href={tournament.youtube_live_url} target="_blank" rel="noopener noreferrer" className="btn-primary w-full text-xs text-center">
                Subscribe &amp; watch live
              </a>
            </div>
          )}
        </aside>
      </section>
    </div>
  )
}
