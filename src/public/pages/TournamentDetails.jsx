import React from 'react'
import { useParams } from 'react-router-dom'
import { supabasePlayer } from '../../lib/supabaseClient'
import { usePlayer } from '../../lib/PlayerContext'

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

// ─── Registration + Payment form ───────────────────────────────────────────

function RegistrationForm({ tournament }) {
  const { user, profile } = usePlayer()
  const slots = teammateCount(tournament.team_size)
  const entryFee = Number(tournament.entry_fee) || 0

  const [step, setStep] = React.useState('form') // 'form' | 'paying' | 'success'
  const [teamName, setTeamName] = React.useState('')
  const [hostUid, setHostUid] = React.useState('')
  const [mates, setMates] = React.useState(Array(Math.max(0, slots)).fill(''))
  const [err, setErr] = React.useState(null)
  const [paymentId, setPaymentId] = React.useState(null)

  // Pre-fill host UID from profile
  React.useEffect(() => {
    if (profile?.ff_uid) setHostUid(profile.ff_uid)
  }, [profile])

  function setMate(i, val) {
    setMates((prev) => prev.map((v, idx) => (idx === i ? val : v)))
  }

  // ── Guard: not logged in ──
  if (!user) {
    return (
      <div className="card space-y-2 text-xs text-slate-200">
        <h2 className="text-sm font-semibold text-slate-50">Register for this tournament</h2>
        <p className="text-slate-400">You need to <span className="text-sky-400 font-semibold">sign in with Google</span> before you can register.</p>
        <button
          onClick={() => supabasePlayer.auth.signInWithOAuth({ provider: 'google' })}
          className="btn-primary w-full text-xs"
        >
          Sign in with Google
        </button>
      </div>
    )
  }

  // ── Guard: profile not submitted yet ──
  if (!profile) {
    return (
      <div className="card space-y-2 text-xs">
        <h2 className="text-sm font-semibold text-slate-50">Register for this tournament</h2>
        <p className="text-slate-400">Complete your <span className="text-sky-400 font-semibold">profile</span> first before registering for tournaments.</p>
        <a href="/profile" className="btn-secondary w-full text-xs text-center block">Go to Profile</a>
      </div>
    )
  }

  // ── Guard: profile pending / rejected ──
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
          ❌ Your profile was rejected. Contact support to resolve this.
        </div>
      </div>
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErr(null)
    if (!teamName.trim()) return setErr('Team name is required.')
    if (!hostUid.trim()) return setErr('Your UID is required.')

    setStep('paying')

    try {
      const loaded = await loadRazorpayScript()
      if (!loaded) throw new Error('Failed to load Razorpay. Check your internet connection.')

      // Get session token
      const { data: { session } } = await supabasePlayer.auth.getSession()
      if (!session?.access_token) throw new Error('Session expired. Please sign in again.')

      // Call edge function
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
            host_uid: hostUid.trim(),
            teammate_uid_1: mates[0]?.trim() || null,
            teammate_uid_2: mates[1]?.trim() || null,
            teammate_uid_3: mates[2]?.trim() || null,
          }),
        }
      )

      const orderData = await res.json()
      if (!res.ok) throw new Error(orderData.error || 'Could not create order.')

      // Open Razorpay popup
      await new Promise((resolve, reject) => {
        const options = {
          key: import.meta.env.VITE_RAZORPAY_KEY_ID,
          amount: orderData.amount,
          currency: orderData.currency,
          name: 'Tournvia',
          description: tournament.title,
          order_id: orderData.razorpay_order_id,
          prefill: {
            name: orderData.player_name || '',
            email: orderData.player_email || '',
            contact: '',
          },
          theme: { color: '#0ea5e9' },
          handler: function (response) {
            setPaymentId(response.razorpay_payment_id)
            setStep('success')
            resolve()
          },
          modal: {
            ondismiss: function () {
              setStep('form')
              setErr('⚠️ Payment cancelled. Your slot is reserved for ~10 minutes — come back and complete payment to confirm your spot.')
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

  // ── Success ──
  if (step === 'success') {
    return (
      <div className="card space-y-3 text-xs text-slate-200">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎉</span>
          <p className="text-sm font-semibold text-emerald-400">Registration Confirmed!</p>
        </div>
        <p>
          Your slot for <span className="font-semibold text-slate-50">{tournament.title}</span> is{' '}
          <span className="font-semibold text-emerald-400">confirmed</span>.
        </p>
        {paymentId && (
          <p className="text-[11px] text-slate-400">
            Payment ID: <span className="font-mono text-slate-300">{paymentId}</span>
          </p>
        )}
        <p className="text-[11px] text-slate-400">
          Room code and match schedule will be shared before the tournament starts. Keep an eye on your notifications.
        </p>
      </div>
    )
  }

  // ── Loading ──
  if (step === 'paying') {
    return (
      <div className="card flex flex-col items-center gap-3 py-8 text-xs text-slate-400">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-600 border-t-sky-400" />
        <p>Opening payment…</p>
      </div>
    )
  }

  // ── Form ──
  return (
    <form onSubmit={handleSubmit} className="card space-y-3 text-xs text-slate-200">
      <h2 className="text-sm font-semibold text-slate-50">Register for this tournament</h2>

      <div className="space-y-1">
        <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
          Team name <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          placeholder="e.g. Team Blaze"
          className="w-full rounded-lg bg-slate-900 px-3 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none ring-1 ring-slate-700 focus:ring-sky-500"
          required
        />
      </div>

      <div className="space-y-1">
        <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
          Your Free Fire UID <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={hostUid}
          onChange={(e) => setHostUid(e.target.value)}
          placeholder="Your Free Fire UID"
          className="w-full rounded-lg bg-slate-900 px-3 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none ring-1 ring-slate-700 focus:ring-sky-500"
          required
        />
      </div>

      {slots > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Teammate UIDs{' '}
            <span className="normal-case font-normal text-slate-500">(optional)</span>
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
        </div>
      )}

      {err && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-[11px] text-red-400">{err}</p>
      )}

      <div className="flex items-center justify-between rounded-lg bg-slate-900/60 px-3 py-2 text-[11px]">
        <span className="text-slate-400">Entry fee</span>
        <span className="font-semibold text-slate-50">
          {entryFee === 0 ? 'FREE' : `₹${entryFee}`}
        </span>
      </div>

      <button type="submit" className="btn-primary w-full text-xs">
        {entryFee === 0 ? 'Register Now' : `Pay ₹${entryFee} & Register`}
      </button>

      <p className="text-[11px] text-slate-500">
        Secure payment via Razorpay · UPI, cards, netbanking accepted
      </p>
    </form>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────

export function TournamentDetails() {
  const { id } = useParams()
  const [tournament, setTournament] = React.useState(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(null)

  React.useEffect(() => {
    let ignore = false
    async function load() {
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
    load()
    return () => { ignore = true }
  }, [id])

  if (loading) return <p className="text-xs text-slate-400">Loading tournament…</p>
  if (error || !tournament)
    return <p className="text-xs text-red-400">{error || 'Tournament not found.'}</p>

  const isLong = tournament.type === 'long'
  const registrationOpen = tournament.registration_status === 'open'
  const isFull = tournament.filled_slots >= tournament.max_slots

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
        {/* Left column */}
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
                {(tournament.tournament_registrations || []).map((r) => (
                  <li key={r.id} className="flex items-center justify-between border-b border-slate-800 py-1 last:border-0">
                    <span>{r.team_name}</span>
                    <span className="text-[11px] text-slate-400">Host UID: {r.host_uid}</span>
                  </li>
                ))}
                {(!tournament.tournament_registrations || tournament.tournament_registrations.length === 0) && (
                  <li className="text-xs text-slate-400">No teams registered yet.</li>
                )}
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
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      {bracket.name || `Bracket ${bracket.id}`}
                    </p>
                    <ul className="text-xs text-slate-200">
                      {(bracket.long_br_matches || []).map((match) => (
                        <li key={match.id} className="flex items-center justify-between border-b border-slate-800 py-1 last:border-0">
                          <span>Round {match.round_number} — Match {match.match_number}</span>
                          <span className="text-[11px] text-slate-400">
                            {match.winner_registration_id ? '✅ Decided' : 'Pending'}
                          </span>
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

        {/* Right column */}
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
            <p>Requirements: Level 45+, Diamond 1+, mobile only (no emulators).</p>
            <p className="text-[11px] text-amber-300">No refunds after joining. Make sure you can play at the scheduled time.</p>
          </div>

          {!registrationOpen ? (
            <div className="card space-y-2 text-xs text-slate-400">
              <h2 className="text-sm font-semibold text-slate-50">Registration</h2>
              <p>Entries are currently closed for this tournament.</p>
            </div>
          ) : isFull ? (
            <div className="card space-y-2 text-xs text-slate-400">
              <h2 className="text-sm font-semibold text-slate-50">Registration</h2>
              <p className="text-red-400">All slots are full. No more registrations.</p>
            </div>
          ) : (
            <RegistrationForm tournament={tournament} />
          )}

          {tournament.youtube_live_url && (
            <div className="card space-y-2 text-xs text-slate-200">
              <h2 className="text-sm font-semibold text-slate-50">Watch live on YouTube</h2>
              <p>Finals and featured matches are streamed live.</p>
              <a
                href={tournament.youtube_live_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary w-full text-xs text-center"
              >
                Subscribe &amp; watch live
              </a>
            </div>
          )}
        </aside>
      </section>
    </div>
  )
}
