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

  // Load tournaments filtered by current game
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
      // Get registrations where player is host
      const { data: asHost } = await supabasePlayer
        .from('tournament_registrations')
        .select('tournament_id')
        .eq('host_player_id', profile.id)

      // Get registrations where player appears as a member (slot 2/3/4)
      const { data: asMembers } = await supabasePlayer
        .from('registration_members')
        .select('registration_id, tournament_registrations!inner(tournament_id)')
        .eq('game_uid', gameProfile.game_uid)
        .neq('slot', 1) // slot 1 = host, already covered above

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

            return (
              <Link key={t.id} to={`/${game.id}/tournaments/${t.id}`} className="card group">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="badge">
                      {TOURNAMENT_TYPES.find((x) => x.id === t.type)?.label || 'Tournament'}
                    </span>
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
                    <span>Entry: {Number(t.entry_fee) === 0 ? 'FREE' : `\u20b9${t.entry_fee}`}</span>
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
