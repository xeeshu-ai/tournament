import React from 'react'
import { Link } from 'react-router-dom'
import { supabasePlayer } from '../../lib/supabaseClient'

const PILLARS = [
  {
    title: 'Verified players only',
    body: 'Every account is manually reviewed before approval. Clean lobbies, no spam registrations.',
  },
  {
    title: 'Transparent brackets',
    body: 'Live fixtures, registered team names, and results are always visible — no black boxes.',
  },
  {
    title: 'Clear payment rules',
    body: 'Entry fees, prize pools, and refund policies are shown upfront before you confirm anything.',
  },
]

function LeagueBanner() {
  const [items, setItems] = React.useState([])
  const [loaded, setLoaded] = React.useState(false)

  React.useEffect(() => {
    supabasePlayer
      .from('tournaments')
      .select('id, title, game_id, mode_label, status, filled_slots, max_slots, total_rounds')
      .eq('type', 'long')
      .eq('is_archived', false)
      .in('status', ['ongoing', 'pending'])
      .order('start_time', { ascending: true })
      .limit(3)
      .then(({ data }) => { setItems(data || []); setLoaded(true) })
  }, [])

  if (!loaded || items.length === 0) return null

  return (
    <section className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-pulse" />
          <span className="text-[11px] font-medium uppercase tracking-widest text-purple-300">The League</span>
        </div>
        <Link to="/league" className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors">
          View all →
        </Link>
      </div>
      <div className="space-y-2">
        {items.map(t => (
          <Link
            key={t.id}
            to={`/league/${t.id}`}
            className="flex items-center justify-between rounded-xl border border-slate-700/60 bg-slate-800/50 px-4 py-3 hover:border-slate-600 hover:bg-slate-800 transition-colors group"
          >
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-slate-500">{t.game_id?.toUpperCase()} · {t.mode_label}</p>
              <p className="text-sm font-medium text-slate-200 mt-0.5 truncate group-hover:text-slate-100">{t.title}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 ml-3">
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                t.status === 'ongoing'
                  ? 'border-blue-500/30 bg-blue-500/15 text-blue-300'
                  : 'border-yellow-500/30 bg-yellow-500/15 text-yellow-300'
              }`}>
                {t.status === 'ongoing' && <span className="h-1 w-1 rounded-full bg-blue-400 animate-pulse" />}
                {t.status === 'ongoing' ? 'Live' : 'Soon'}
              </span>
              <span className="text-slate-600 text-sm">→</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

export function Home() {
  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="flex flex-col items-start gap-5 py-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Tournaments live
        </div>

        <h1 className="max-w-xl text-3xl font-semibold tracking-tight text-slate-50 md:text-4xl">
          Competitive gaming tournaments,{' '}
          <span className="text-sky-400">done right.</span>
        </h1>

        <p className="max-w-lg text-sm leading-relaxed text-slate-400">
          Tournvia is a tournament platform built for serious players. Register your team, track brackets in real time, and compete for prize pools — all in one place.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <Link to="/tournaments" className="btn-primary">
            Browse tournaments
          </Link>
          <Link to="/rules" className="btn-secondary">
            Platform rules
          </Link>
        </div>
      </section>

      {/* League Banner — only shown when live/upcoming long tournaments exist */}
      <LeagueBanner />

      {/* Pillars */}
      <section className="grid gap-4 sm:grid-cols-3">
        {PILLARS.map((p) => (
          <div key={p.title} className="card h-full">
            <h3 className="text-sm font-semibold text-slate-100">{p.title}</h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">{p.body}</p>
          </div>
        ))}
      </section>
    </div>
  )
}
