import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabasePlayer } from '../../lib/supabaseClient'
import { usePlayer } from '../../lib/PlayerContext'
import { useGame } from '../../lib/GameContext'
import { TOURNAMENT_TYPES, getModeLabel } from '../../lib/constants'

export function Tournaments() {
  const navigate = useNavigate()
  const { profile } = usePlayer()
  const { game, gameProfile, gpLoading } = useGame()

  const [loading, setLoading] = React.useState(true)
  const [tournaments, setTournaments] = React.useState([])
  const [myRegistrations, setMyRegistrations] = React.useState([])

  // Load tournaments filtered by current game — only single-type
  React.useEffect(() => {
    if (!game) return
    let ignore = false
    async function load() {
      setLoading(true)
      const { data, error } = await supabasePlayer
        .from('tournaments')
        .select('*')
        .eq('game_id', game.id)
        .eq('is_archived', false)
        .eq('type', 'single')
        .order('start_time', { ascending: true })
      if (!ignore) {
        setTournaments(error ? [] : (data || []))
        setLoading(false)
      }
    }
    load()
    return () => { ignore = true }
  }, [game?.id])

  // Load registrations for current player in this game
  React.useEffect(() => {
    if (!profile?.id || !gameProfile?.game_uid) { setMyRegistrations([]); return }
    let ignore = false
    async function loadMyRegs() {
      const { data: asHost } = await supabasePlayer
        .from('tournament_registrations')
        .select('tournament_id')
        .eq('player_id', profile.id)  // ✅ fixed: was host_player_id

      const { data: asMembers } = await supabasePlayer
        .from('registration_members')
        .select('registration_id, tournament_registrations!inner(tournament_id)')
        .eq('game_uid', gameProfile.game_uid)
        .neq('slot', 1)

      if (!ignore) {
        const hostIds = (asHost || []).map((r) => r.tournament_id)
        const memberIds = (asMembers || []).map(
          (r) => r.tournament_registrations?.tournament_id
        ).filter(Boolean)
        setMyRegistrations([...new Set([...hostIds, ...memberIds])])
      }
    }
    loadMyRegs()
    return () => { ignore = true }
  }, [profile?.id, gameProfile?.game_uid])

  if (!game) return null

  return (
    <div className="space-y-6">
      {/* Header with game context */}
      <header className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-400">
              {game.name}
            </p>
            <button
              onClick={() => navigate('/select-game')}
              className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
            >
              Switch game →
            </button>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-50">Tournaments</h1>
          <p className="mt-1 text-xs text-slate-400">
            {game.name} tournaments — solo, duo and squad. Slots are first come first served
            once payment is confirmed.
          </p>
        </div>

        {/* Game profile status chip */}
        {!gpLoading && profile && (
          <div className="shrink-0">
            {!gameProfile ? (
              <Link
                to={`/${game.id}/setup`}
                className="inline-flex items-center gap-2 rounded-full border border-red-500/50 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-300 hover:border-red-400/70 transition-colors"
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                </span>
                Add your {game.name} profile
              </Link>
            ) : gameProfile.status === 'pending' ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/50 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                </span>
                UID under review
              </span>
            ) : gameProfile.status === 'verified' ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                {gameProfile.in_game_name || gameProfile.game_uid}
              </span>
            ) : (
              <Link
                to={`/${game.id}/setup`}
                className="inline-flex items-center gap-2 rounded-full border border-red-500/50 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-300"
              >
                Profile rejected — fix it
              </Link>
            )}
          </div>
        )}
      </header>

      {/* League Banner */}
      <Link
        to="/league"
        className="group relative flex items-center justify-between gap-4 overflow-hidden rounded-2xl border border-violet-500/30 bg-gradient-to-r from-violet-950/80 via-indigo-950/80 to-slate-900/90 px-5 py-4 shadow-lg shadow-violet-950/40 transition-all hover:border-violet-400/50 hover:shadow-violet-900/60"
      >
        {/* Glow orb */}
        <div className="pointer-events-none absolute -left-6 top-1/2 h-24 w-24 -translate-y-1/2 rounded-full bg-violet-500/20 blur-2xl" />
        <div className="pointer-events-none absolute right-12 top-1/2 h-16 w-16 -translate-y-1/2 rounded-full bg-indigo-500/20 blur-2xl" />

        <div className="relative flex items-center gap-3">
          {/* Trophy icon */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/20 border border-violet-500/30">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-violet-300">
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
              <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
              <path d="M4 22h16" />
              <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
              <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
              <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
            </svg>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-400">
              League Season
            </p>
            <p className="text-sm font-semibold text-slate-50">
              Join the League &amp; win bigger
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              Multi-round • Points system • Bigger prizes
            </p>
          </div>
        </div>

        {/* Arrow */}
        <div className="relative flex shrink-0 items-center gap-1 rounded-full border border-violet-500/40 bg-violet-500/15 px-3 py-1.5 text-xs font-semibold text-violet-300 transition-all group-hover:bg-violet-500/25 group-hover:border-violet-400/60">
          View League
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </div>
      </Link>

      {/* Tournament count */}
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-slate-500">
          Showing{' '}
          <span className="font-semibold text-slate-200">{tournaments.length}</span>{' '}
          tournament{tournaments.length !== 1 ? 's' : ''}
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card h-24 animate-pulse bg-slate-800/60" />
          ))}
        </div>
      ) : tournaments.length === 0 ? (
        <div className="card text-xs text-slate-300">
          No {game.name} tournaments are live right now. Check back later.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {tournaments.map((t) => {
            const isRegistered = myRegistrations.includes(t.id)
            const modeLabel = getModeLabel(t)
            const formatLabel = t.format_label
            const modeLine = [modeLabel, formatLabel].filter(Boolean).join(' • ')

            const typeMeta = TOURNAMENT_TYPES.find((x) => x.id === t.type) || null

            return (
              <Link
                key={t.id}
                to={`/${game.id}/tournaments/${t.id}`}
                className="card group"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    {typeMeta && (
                      <span className="rounded-full px-2 py-0.5 font-semibold uppercase tracking-[0.18em] bg-emerald-500/10 text-emerald-300 border border-emerald-500/40">
                        {typeMeta.label}
                      </span>
                    )}
                    {modeLine && (
                      <span className="rounded-full bg-slate-900/80 px-2 py-0.5 text-[11px] text-slate-300">
                        {modeLine}
                      </span>
                    )}
                    {t.map && (
                      <span className="rounded-full bg-slate-900/80 px-2 py-0.5 text-[11px] text-slate-300">
                        Map: {t.map}
                      </span>
                    )}
                  </div>
                  {isRegistered ? (
                    <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-400">
                      ✓ Registered
                    </span>
                  ) : t.registration_status === 'open' ? (
                    <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-400">
                      Entries open
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Entries closed
                    </span>
                  )}
                </div>
                <h2 className="mt-3 text-sm font-semibold text-slate-50">{t.title}</h2>
                <p className="mt-1 text-xs text-slate-300 line-clamp-2">{t.prize_text}</p>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-300">
                  <div className="flex flex-wrap items-center gap-3">
                    <span>Entry: {Number(t.entry_fee) === 0 ? 'FREE' : `₹${t.entry_fee}`}</span>
                    <span>Slots: {t.filled_slots}/{t.max_slots}</span>
                    {game.minLevel && <span>Req: Level {game.minLevel}+</span>}
                  </div>
                  {t.youtube_live_url && (
                    <span className="text-sky-400 group-hover:text-sky-300">
                      Watch live →
                    </span>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
