import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabasePlayer } from '../../lib/supabaseClient'
import { usePlayer } from '../../lib/PlayerContext'

function StatusBadge({ status }) {
  const map = {
    live:                 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    active:               'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
    registration_closed:  'bg-amber-500/15 text-amber-300 border-amber-500/30',
    ended:                'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  }
  const labels = {
    live:                '● Live',
    active:              'Upcoming',
    registration_closed: 'Reg. Closed',
    ended:               'Ended',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${map[status] ?? 'bg-slate-500/15 text-slate-300 border-slate-500/30'}`}>
      {status === 'live' && <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />}
      {labels[status] ?? status}
    </span>
  )
}

export function League() {
  const { profile } = usePlayer()
  const navigate = useNavigate()
  const [tournaments, setTournaments] = React.useState([])
  const [loading, setLoading] = React.useState(true)
  const [filter, setFilter] = React.useState('all')
  const [myRegs, setMyRegs] = React.useState([])

  React.useEffect(() => {
    async function load() {
      setLoading(true)
      const { data } = await supabasePlayer
        .from('tournaments')
        .select('id, title, game_id, mode, mode_label, format_label, status, start_time, max_slots, filled_slots, total_rounds, prize_text, team_size')
        .eq('type', 'long')
        .eq('is_archived', false)
        .order('start_time', { ascending: false })
      setTournaments(data || [])

      if (profile?.id) {
        const { data: regs } = await supabasePlayer
          .from('tournament_registrations')
          .select('tournament_id')
          .eq('host_player_id', profile.id)
        setMyRegs((regs || []).map(r => r.tournament_id))
      }
      setLoading(false)
    }
    load()
  }, [profile?.id])

  const filtered = tournaments.filter(t => filter === 'all' || t.game_id === filter)

  // Canonical status buckets (aligned with DB CHECK constraint)
  const live       = filtered.filter(t => t.status === 'live')
  const upcoming   = filtered.filter(t => t.status === 'active' || t.status === 'registration_closed')
  const completed  = filtered.filter(t => t.status === 'ended')

  // game_id values must match DB exactly (bgmi, free_fire)
  const gameFilters = [
    { id: 'all',       label: 'All Games' },
    { id: 'bgmi',      label: 'BGMI' },
    { id: 'free_fire', label: 'Free Fire' },
  ]

  function TournamentCard({ t }) {
    const isRegistered = myRegs.includes(t.id)
    const slotsLeft = t.max_slots - (t.filled_slots || 0)
    return (
      <div className="card flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-widest text-slate-500 mb-1">
              {t.game_id?.toUpperCase().replace('_', ' ')} · {t.mode_label || t.mode}
            </p>
            <h3 className="text-sm font-semibold text-slate-100 leading-snug">{t.title}</h3>
          </div>
          <StatusBadge status={t.status} />
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { label: 'Slots', val: `${t.filled_slots || 0}/${t.max_slots}` },
            { label: 'Rounds', val: t.total_rounds ?? '—' },
            { label: 'Prize', val: t.prize_text || 'TBA' },
          ].map(({ label, val }) => (
            <div key={label} className="rounded-lg bg-slate-800/60 px-2 py-2">
              <p className="text-xs font-semibold text-slate-100 truncate">{val}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {(t.status === 'active' || t.status === 'registration_closed') && t.start_time && (
          <p className="text-[11px] text-slate-500">
            Starts: {new Date(t.start_time).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
        )}
        {t.status === 'live' && t.total_rounds && (
          <p className="text-[11px] text-slate-500">
            Round in progress · {slotsLeft > 0 ? `${slotsLeft} slots left` : 'Full'}
          </p>
        )}

        <Link
          to={`/league/${t.id}`}
          className={`btn-primary w-full text-center text-sm mt-auto ${isRegistered ? 'opacity-90' : ''}`}
        >
          {isRegistered ? '📋 My Dashboard' : t.status === 'ended' ? 'View Results' : 'View & Register'}
        </Link>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1,2,3].map(i => (
          <div key={i} className="card animate-pulse space-y-3">
            <div className="h-3 w-1/3 rounded bg-slate-700" />
            <div className="h-4 w-2/3 rounded bg-slate-700" />
            <div className="grid grid-cols-3 gap-2">
              {[1,2,3].map(j => <div key={j} className="h-12 rounded-lg bg-slate-800" />)}
            </div>
            <div className="h-9 rounded-lg bg-slate-700" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="flex flex-col gap-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-purple-400/30 bg-purple-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-purple-300 w-fit">
          <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
          Long Format Tournaments
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-50">The League</h1>
        <p className="text-sm text-slate-400 max-w-md">
          Multi-round tournaments spanning days or weeks. Points series, qualifiers, and knockout brackets.
        </p>
      </section>

      {/* Game filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {gameFilters.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              filter === f.id
                ? 'border-sky-400/50 bg-sky-500/15 text-sky-300'
                : 'border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Sections */}
      {[
        { title: '🔴 Live Now',  items: live },
        { title: '📅 Upcoming',  items: upcoming },
        { title: '✅ Completed', items: completed },
      ].map(({ title, items }) => items.length > 0 && (
        <section key={title} className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">{title}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {items.map(t => <TournamentCard key={t.id} t={t} />)}
          </div>
        </section>
      ))}

      {filtered.length === 0 && !loading && (
        <div className="card flex flex-col items-center gap-3 py-12 text-center">
          <span className="text-3xl">🏆</span>
          <p className="text-sm font-medium text-slate-300">No league tournaments yet</p>
          <p className="text-xs text-slate-500">Check back soon — tournaments will appear here.</p>
        </div>
      )}
    </div>
  )
}
