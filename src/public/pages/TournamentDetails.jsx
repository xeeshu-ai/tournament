import React from 'react'
import { useParams } from 'react-router-dom'
import { supabasePlayer } from '../../lib/supabaseClient'

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
        .select('*, tournament_registrations(*), long_brackets(*), long_br_matches(*)')
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
    return () => {
      ignore = true
    }
  }, [id])

  if (loading) return <p className="text-xs text-slate-400">Loading tournament…</p>
  if (error || !tournament) return <p className="text-xs text-red-400">{error || 'Tournament not found.'}</p>

  const isLong = tournament.type === 'long'

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="badge">{isLong ? 'Long Tournament' : 'Single Match'}</p>
        <h1 className="text-2xl font-semibold text-slate-50">{tournament.title}</h1>
        <p className="text-xs text-slate-400">
          {tournament.mode_label} • {tournament.format_label}
          {tournament.map ? ` • ${tournament.map}` : ''}
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-[2fr_1.2fr]">
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
              <p className="text-xs text-slate-300">
                When the admin generates fixtures, you will see the full knockout bracket here with each round and advancing winners.
              </p>
              <p className="text-[11px] text-slate-400">
                This is a simplified placeholder view. Once your Supabase schema is created, this component reads from
                <code className="mx-1 rounded bg-slate-900 px-1 py-0.5">long_brackets</code> and
                <code className="mx-1 rounded bg-slate-900 px-1 py-0.5">long_br_matches</code> tables to render real fixtures.
              </p>
            </div>
          )}
        </div>

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

          <div className="card space-y-3 text-xs text-slate-200">
            <h2 className="text-sm font-semibold text-slate-50">Register via WhatsApp / Telegram</h2>
            <p>
              Registration is manual. Tap a button below, pay the host using the QR sent on chat, and wait for admin confirmation.
            </p>
            <div className="flex flex-col gap-2">
              <a
                href={`https://wa.me/${import.meta.env.VITE_WHATSAPP_NUMBER || ''}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary text-xs text-center"
              >
                Pay via WhatsApp
              </a>
              <a
                href={`https://t.me/${import.meta.env.VITE_TELEGRAM_USERNAME || ''}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary text-xs text-center"
              >
                Pay via Telegram
              </a>
            </div>
            <p className="text-[11px] text-slate-400">
              Razorpay / UPI direct integration is coming soon. For now, all payments are handled via WhatsApp and Telegram only.
            </p>
          </div>

          {tournament.youtube_live_url && (
            <div className="card space-y-2 text-xs text-slate-200">
              <h2 className="text-sm font-semibold text-slate-50">Watch live on YouTube</h2>
              <p>Finals and featured matches are streamed live. Subscribe so you don&apos;t miss clutch moments.</p>
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
