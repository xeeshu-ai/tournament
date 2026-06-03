import React from 'react'
import { Link } from 'react-router-dom'
import { supabasePlayer } from '../../lib/supabaseClient'
import { getGame } from '../../lib/constants'

export function LeagueBanner() {
  const [items, setItems]   = React.useState([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    async function load() {
      const { data } = await supabasePlayer
        .from('tournaments')
        .select('id,game_id,title,status,start_time,max_slots,filled_slots,total_rounds,prize_text')
        .eq('type', 'long')
        .eq('is_archived', false)
        .in('status', ['ongoing', 'pending'])
        .order('start_time', { ascending: true })
        .limit(3)
      setItems(data || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading || items.length === 0) return null

  return (
    <section className="rounded-2xl border border-sky-500/20 bg-gradient-to-br from-sky-500/10 via-slate-800/30 to-slate-900/60 p-4 mb-6">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-sky-400 animate-pulse" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-400">Join the League</span>
        </div>
        <Link to="/league" className="text-[11px] font-medium text-slate-400 hover:text-sky-300 transition-colors">
          View all →
        </Link>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
        {items.map(t => {
          const game     = getGame(t.game_id)
          const isLive   = t.status === 'ongoing'
          const filled   = t.filled_slots ?? 0
          const max      = t.max_slots ?? 0
          const pct      = max > 0 ? Math.min(100, Math.round((filled / max) * 100)) : 0

          return (
            <Link
              key={t.id}
              to={`/league/${t.id}`}
              className="flex flex-1 items-center gap-3 rounded-xl border border-slate-700/50 bg-slate-900/60 px-3 py-3 hover:border-sky-500/40 hover:bg-slate-800/60 transition-all group min-w-0"
            >
              {game?.logo_url
                ? <img src={game.logo_url} alt={game.name} width={32} height={32} className="rounded-lg flex-shrink-0 object-cover" loading="lazy" />
                : <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-sky-500/20 text-sky-400 text-sm font-bold">{(game?.name ?? 'T')[0]}</div>
              }
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 mb-0.5">
                  {isLive && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 flex-shrink-0" />}
                  <p className="text-xs font-semibold text-slate-100 truncate group-hover:text-sky-300 transition-colors">{t.title}</p>
                </div>
                {isLive
                  ? <p className="text-[10px] text-emerald-400">Live · Round in progress</p>
                  : <p className="text-[10px] text-slate-400">{t.start_time ? new Date(t.start_time).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Coming soon'}</p>
                }
                {max > 0 && (
                  <div className="mt-1.5 h-1 w-full rounded-full bg-slate-700">
                    <div className="h-1 rounded-full bg-sky-500/70" style={{ width: `${pct}%` }} />
                  </div>
                )}
              </div>
              <svg className="flex-shrink-0 text-slate-600 group-hover:text-sky-400 transition-colors" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
