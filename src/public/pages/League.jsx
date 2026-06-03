import React from 'react'
import { Link } from 'react-router-dom'
import { supabasePlayer } from '../../lib/supabaseClient'
import { getGame } from '../../lib/constants'

function TrophyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 21h8M12 17v4" />
      <path d="M7 4H4a1 1 0 0 0-1 1v3a4 4 0 0 0 4 4h1" />
      <path d="M17 4h3a1 1 0 0 1 1 1v3a4 4 0 0 1-4 4h-1" />
      <path d="M7 4h10v7a5 5 0 0 1-10 0V4z" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="7" r="4" />
      <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      <path d="M21 21v-2a4 4 0 0 0-3-3.87" />
    </svg>
  )
}

const STATUS_META = {
  ongoing:   { label: 'Live',      cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  pending:   { label: 'Upcoming',  cls: 'bg-sky-500/15 text-sky-300 border-sky-500/30' },
  completed: { label: 'Ended',     cls: 'bg-slate-700/60 text-slate-400 border-slate-600/40' },
}

function LeagueCard({ t }) {
  const game = getGame(t.game_id)
  const meta = STATUS_META[t.status] || STATUS_META.pending
  const filled = t.filled_slots ?? 0
  const max    = t.max_slots ?? 0
  const pct    = max > 0 ? Math.min(100, Math.round((filled / max) * 100)) : 0

  return (
    <Link
      to={`/league/${t.id}`}
      className="card flex flex-col gap-3 hover:border-sky-500/40 hover:bg-slate-800/60 transition-all duration-200 group"
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {game?.logo_url
            ? <img src={game.logo_url} alt={game.name} width={28} height={28} className="rounded-lg object-cover flex-shrink-0" loading="lazy" />
            : <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/20 text-sky-400 flex-shrink-0"><TrophyIcon /></div>
          }
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-widest text-slate-500">{game?.name ?? t.game_id}</p>
            <h3 className="text-sm font-semibold text-slate-100 truncate group-hover:text-sky-300 transition-colors">{t.title}</h3>
          </div>
        </div>
        <span className={`flex-shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${meta.cls}`}>
          {meta.label}
        </span>
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
        <span className="flex items-center gap-1"><CalendarIcon />{t.start_time ? new Date(t.start_time).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</span>
        <span className="flex items-center gap-1"><UsersIcon />{filled}/{max} teams</span>
        {t.mode_label && <span className="rounded bg-slate-700/50 px-1.5 py-0.5 text-[10px]">{t.mode_label}</span>}
        {t.format_label && <span className="rounded bg-slate-700/50 px-1.5 py-0.5 text-[10px]">{t.format_label}</span>}
        {t.total_rounds && <span className="rounded bg-slate-700/50 px-1.5 py-0.5 text-[10px]">{t.total_rounds} Rounds</span>}
      </div>

      {/* Slot bar */}
      {max > 0 && (
        <div>
          <div className="mb-1 flex justify-between text-[10px] text-slate-500">
            <span>Slots filled</span>
            <span>{filled}/{max}</span>
          </div>
          <div className="h-1 w-full rounded-full bg-slate-700/60">
            <div className="h-1 rounded-full bg-sky-500 transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {/* Prize */}
      {t.prize_text && (
        <p className="text-[11px] text-amber-400/90 font-medium">🏆 {t.prize_text}</p>
      )}

      <div className="mt-auto pt-1">
        <span className="inline-flex items-center gap-1 text-xs font-medium text-sky-400 group-hover:gap-2 transition-all">
          View League
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
        </span>
      </div>
    </Link>
  )
}

function SkeletonCard() {
  return (
    <div className="card space-y-3 animate-pulse">
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 rounded-lg bg-slate-700/60" />
        <div className="flex-1 space-y-1.5">
          <div className="h-2.5 w-16 rounded bg-slate-700/60" />
          <div className="h-4 w-40 rounded bg-slate-700/60" />
        </div>
      </div>
      <div className="flex gap-2">
        <div className="h-3 w-24 rounded bg-slate-700/50" />
        <div className="h-3 w-16 rounded bg-slate-700/50" />
      </div>
      <div className="h-1 w-full rounded-full bg-slate-700/60" />
    </div>
  )
}

export function League() {
  const [tournaments, setTournaments] = React.useState([])
  const [loading, setLoading]         = React.useState(true)
  const [gameFilter, setGameFilter]   = React.useState('all')
  const [games, setGames]             = React.useState([])

  React.useEffect(() => {
    async function load() {
      setLoading(true)
      const { data, error } = await supabasePlayer
        .from('tournaments')
        .select('id,game_id,title,type,mode,mode_label,format_label,map,entry_fee,max_slots,filled_slots,team_size,total_rounds,prize_text,registration_status,status,start_time,is_archived')
        .eq('type', 'long')
        .eq('is_archived', false)
        .order('start_time', { ascending: false })
      if (!error) setTournaments(data || [])

      const { data: gData } = await supabasePlayer
        .from('games')
        .select('id,name,logo_url')
        .eq('status', 'active')
        .order('sort_order')
      setGames(gData || [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = gameFilter === 'all'
    ? tournaments
    : tournaments.filter(t => t.game_id === gameFilter)

  const ongoing   = filtered.filter(t => t.status === 'ongoing')
  const upcoming  = filtered.filter(t => t.status === 'pending')
  const completed = filtered.filter(t => t.status === 'completed')

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-400 mb-1">Long format</p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-50">The League</h1>
          <p className="mt-1 text-sm text-slate-400">Multi-round tournaments. Multiple matches. Real standings.</p>
        </div>

        {/* Game filter tabs */}
        {games.length > 0 && (
          <div className="flex items-center gap-1 rounded-xl border border-slate-700/60 bg-slate-800/40 p-1">
            <button
              onClick={() => setGameFilter('all')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                gameFilter === 'all' ? 'bg-sky-500/20 text-sky-300' : 'text-slate-400 hover:text-slate-200'
              }`}
            >All</button>
            {games.map(g => (
              <button
                key={g.id}
                onClick={() => setGameFilter(g.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  gameFilter === g.id ? 'bg-sky-500/20 text-sky-300' : 'text-slate-400 hover:text-slate-200'
                }`}
              >{g.name}</button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <>
          {ongoing.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Now
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {ongoing.map(t => <LeagueCard key={t.id} t={t} />)}
              </div>
            </section>
          )}

          {upcoming.length > 0 && (
            <section>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-sky-400">Upcoming</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {upcoming.map(t => <LeagueCard key={t.id} t={t} />)}
              </div>
            </section>
          )}

          {completed.length > 0 && (
            <section>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Completed</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {completed.map(t => <LeagueCard key={t.id} t={t} />)}
              </div>
            </section>
          )}

          {filtered.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-20 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 text-slate-500">
                <TrophyIcon />
              </div>
              <p className="text-sm font-medium text-slate-300">No league tournaments yet</p>
              <p className="text-xs text-slate-500 max-w-xs">League tournaments will appear here once created by the admin.</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
