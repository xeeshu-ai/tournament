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

  // Always show the banner — either with live tournaments or as a static CTA
  return (
    <section className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/20 border border-purple-500/30">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-300"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-100">The League</p>
            <p className="text-[11px] text-slate-500">Multi-round long format tournaments</p>
          </div>
        </div>
        <Link
          to="/league"
          className="flex items-center gap-1 rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-xs font-medium text-purple-300 hover:bg-purple-500/20 transition-colors"
        >
          View all
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
        </Link>
      </div>

      {/* Live/upcoming list or empty CTA */}
      {loaded && items.length > 0 ? (
        <div className="space-y-2">
          {items.map(t => (
            <Link
              key={t.id}
              to={`/league/${t.id}`}
              className="flex items-center justify-between rounded-xl border border-slate-700/60 bg-slate-800/50 px-4 py-3 hover:border-purple-500/30 hover:bg-slate-800 transition-colors group"
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
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600 group-hover:text-slate-400 transition-colors"><path d="M9 18l6-6-6-6" /></svg>
              </div>
            </Link>
          ))}
        </div>
      ) : loaded && items.length === 0 ? (
        // No active tournaments — show static CTA so banner is always visible
        <div className="rounded-xl border border-slate-700/40 bg-slate-800/30 px-4 py-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-200">Season coming soon</p>
            <p className="text-xs text-slate-500 mt-0.5">Points series, qualifiers &amp; knockout brackets — all in one place.</p>
          </div>
          <Link
            to="/league"
            className="flex-shrink-0 rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-2 text-xs font-semibold text-white transition-colors"
          >
            Explore
          </Link>
        </div>
      ) : (
        // Loading skeleton
        <div className="space-y-2">
          {[1,2].map(i => (
            <div key={i} className="h-14 rounded-xl bg-slate-800/50 animate-pulse" />
          ))}
        </div>
      )}

      {/* Feature pills */}
      <div className="flex flex-wrap gap-2 pt-1">
        {['Points Series', 'Knockout Brackets', 'BGMI & Free Fire', 'Multi-Round'].map(tag => (
          <span key={tag} className="rounded-full border border-slate-700/60 bg-slate-800/40 px-2.5 py-1 text-[10px] font-medium text-slate-500">
            {tag}
          </span>
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
          <Link to="/league" className="btn-secondary">
            The League
          </Link>
        </div>
      </section>

      {/* League Banner — always visible */}
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
