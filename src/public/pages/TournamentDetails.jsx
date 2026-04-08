import React from 'react'
import { useParams } from 'react-router-dom'
import { supabasePlayer } from '../../lib/supabaseClient'

// ─── helpers ────────────────────────────────────────────────────────────────

/** How many teammate UID slots to show based on team_size string */
function teammateCount(teamSize) {
  if (!teamSize) return 0
  const s = teamSize.toLowerCase()
  if (s.includes('duo') || s === '2' || s.includes('2v2')) return 1
  if (s.includes('squad') || s === '4' || s === '3') return 3
  return 0
}

/** Build display label for mode badge on the card */
function modeBadgeLabel(t) {
  if (!t) return ''
  const parts = [t.mode_label, t.format_label].filter(Boolean)
  return parts.join(' • ')
}

// ─── Registration form ───────────────────────────────────────────────────────

function RegistrationForm({ tournament }) {
  const slots = teammateCount(tournament.team_size)

  const [teamName, setTeamName] = React.useState('')
  const [hostUid, setHostUid] = React.useState('')
  const [mates, setMates] = React.useState(Array(slots).fill(''))
  const [submitting, setSubmitting] = React.useState(false)
  const [success, setSuccess] = React.useState(false)
  const [err, setErr] = React.useState(null)

  function setMate(i, val) {
    setMates((prev) => prev.map((v, idx) => (idx === i ? val : v)))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErr(null)

    if (!teamName.trim()) return setErr('Team name is required.')
    if (!hostUid.trim()) return setErr('Your UID (host) is required.')

    setSubmitting(true)

    // Build payload — teammate UIDs are optional, store as array (nulls for empties)
    const teammateUids = mates.map((m) => m.trim() || null)

    const { error } = await supabasePlayer
      .from('tournament_registrations')
      .insert({
        tournament_id: tournament.id,
        team_name: teamName.trim(),
        host_uid: hostUid.trim(),
        teammate_uid_1: teammateUids[0] ?? null,
        teammate_uid_2: teammateUids[1] ?? null,
        teammate_uid_3: teammateUids[2] ?? null,
        status: 'pending',
      })

    setSubmitting(false)

    if (error) {
      console.error(error)
      setErr('Registration failed. You may already be registered.')
    } else {
      setSuccess(true)
    }
  }

  if (success) {
    return (
      <div className="card space-y-2 text-xs text-slate-200">
        <p className="text-sm font-semibold text-emerald-400">✅ Registered!</p>
        <p>
          Your slot is <span className="font-semibold text-amber-300">pending</span> until payment is confirmed.
          Contact the host on WhatsApp or Telegram to pay and get confirmed.
        </p>
        {slots > 0 && (
          <p className="text-[11px] text-slate-400">
            You can add missing teammate UIDs later — before entry closing time — by contacting the admin.
          </p>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-3 text-xs text-slate-200">
      <h2 className="text-sm font-semibold text-slate-50">Register for this tournament</h2>

      {/* Team name */}
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

      {/* Host UID */}
      <div className="space-y-1">
        <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
          Your UID (host) <span className="text-red-400">*</span>
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

      {/* Teammate UIDs — optional */}
      {slots > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Teammate UIDs{' '}
            <span className="normal-case font-normal text-slate-500">(optional — can be added later before entry closes)</span>
          </p>
          {Array.from({ length: slots }).map((_, i) => (
            <input
              key={i}
              type="text"
              value={mates[i]}
              onChange={(e) => setMate(i, e.target.value)}
              placeholder={`Teammate ${i + 1} UID (optional)`}
              className="w-full rounded-lg bg-slate-900 px-3 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none ring-1 ring-slate-700 focus:ring-sky-500"
            />
          ))}
        </div>
      )}

      {err && <p className="text-[11px] text-red-400">{err}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="btn-primary w-full text-xs disabled:opacity-60"
      >
        {submitting ? 'Submitting…' : 'Register & pay later'}
      </button>

      <p className="text-[11px] text-slate-400">
        After registering, contact the host on WhatsApp or Telegram to complete payment. Your slot will be confirmed once payment is verified.
      </p>
    </form>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

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
  if (error || !tournament) return <p className="text-xs text-red-400">{error || 'Tournament not found.'}</p>

  const isLong = tournament.type === 'long'
  const registrationOpen = tournament.registration_status === 'open'

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="badge">{isLong ? 'Long Tournament' : 'Single Match'}</p>
        <h1 className="text-2xl font-semibold text-slate-50">{tournament.title}</h1>
        <p className="text-xs text-slate-400">
          {modeBadgeLabel(tournament)}
          {tournament.map ? ` • ${tournament.map}` : ''}
          {tournament.team_size ? ` • ${tournament.team_size}` : ''}
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-[2fr_1.2fr]">
        {/* ── Left column ── */}
        <div className="space-y-4">
          <div className="card space-y-2 text-xs text-slate-200">
            <h2 className="text-sm font-semibold text-slate-50">Prize pool &amp; points</h2>
            <p className="whitespace-pre-line text-slate-200">{tournament.prize_text}</p>
            {tournament.points_table && (
              <div className="mt-3 rounded-xl bg-slate-900/80 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Points table (admin defined)
                </p>
                <p className="mt-1 whitespace-pre-line text-xs text-slate-200">
                  {tournament.points_table}
                </p>
              </div>
            )}
          </div>

          {isLong && (
            <div className="card space-y-3">
              <h2 className="text-sm font-semibold text-slate-50">Registered teams</h2>
              <ul className="text-xs text-slate-200">
                {(tournament.tournament_registrations || []).map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between border-b border-slate-800 py-1 last:border-0"
                  >
                    <span>{r.team_name}</span>
                    <span className="text-[11px] text-slate-400">Host UID: {r.host_uid}</span>
                  </li>
                ))}
                {(!tournament.tournament_registrations ||
                  tournament.tournament_registrations.length === 0) && (
                  <li className="text-xs text-slate-400">No teams registered yet.</li>
                )}
              </ul>
            </div>
          )}

          {isLong && (
            <div className="card space-y-3">
              <h2 className="text-sm font-semibold text-slate-50">Bracket</h2>
              {(tournament.long_brackets || []).length === 0 ? (
                <p className="text-xs text-slate-400">
                  Fixtures haven't been generated yet. Check back after registration closes.
                </p>
              ) : (
                (tournament.long_brackets || []).map((bracket) => (
                  <div key={bracket.id} className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      {bracket.name || `Bracket ${bracket.id}`}
                    </p>
                    <ul className="text-xs text-slate-200">
                      {(bracket.long_br_matches || []).map((match) => (
                        <li
                          key={match.id}
                          className="flex items-center justify-between border-b border-slate-800 py-1 last:border-0"
                        >
                          <span>
                            Round {match.round_number} — Match {match.match_number}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {match.winner_registration_id ? '✅ Decided' : 'Pending'}
                          </span>
                        </li>
                      ))}
                      {(!bracket.long_br_matches ||
                        bracket.long_br_matches.length === 0) && (
                        <li className="text-xs text-slate-400">No matches yet.</li>
                      )}
                    </ul>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* ── Right column ── */}
        <aside className="space-y-4">
          <div className="card space-y-2 text-xs text-slate-200">
            <h2 className="text-sm font-semibold text-slate-50">Entry details</h2>
            <p>Entry fee: ₹{tournament.entry_fee}</p>
            <p>
              Slots: {tournament.filled_slots}/{tournament.max_slots}
            </p>
            <p>Requirements: Level 45+, Diamond 1+, mobile only (no emulators).</p>
            <p className="text-[11px] text-amber-300">
              No refunds after joining. Make sure you can play at the scheduled time.
            </p>
          </div>

          {/* Registration form — shown only when entries are open */}
          {registrationOpen ? (
            <RegistrationForm tournament={tournament} />
          ) : (
            <div className="card space-y-2 text-xs text-slate-400">
              <h2 className="text-sm font-semibold text-slate-50">Registration</h2>
              <p>Entries are currently closed for this tournament.</p>
            </div>
          )}

          {/* WhatsApp / Telegram payment links */}
          <div className="card space-y-3 text-xs text-slate-200">
            <h2 className="text-sm font-semibold text-slate-50">Pay via WhatsApp / Telegram</h2>
            <p>
              After registering, contact the host below to send your payment and get confirmed.
            </p>
            <div className="flex flex-col gap-2">
              <a
                href={`https://wa.me/${import.meta.env.VITE_WHATSAPP_NUMBER || ''}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary text-xs text-center"
              >
                WhatsApp
              </a>
              <a
                href={`https://t.me/${import.meta.env.VITE_TELEGRAM_USERNAME || ''}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary text-xs text-center"
              >
                Telegram
              </a>
            </div>
            <p className="text-[11px] text-slate-400">
              Razorpay / UPI direct integration coming soon.
            </p>
          </div>

          {tournament.youtube_live_url && (
            <div className="card space-y-2 text-xs text-slate-200">
              <h2 className="text-sm font-semibold text-slate-50">Watch live on YouTube</h2>
              <p>
                Finals and featured matches are streamed live. Subscribe so you don&apos;t miss clutch moments.
              </p>
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
