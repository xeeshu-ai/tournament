import React from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabasePlayer } from '../../lib/supabaseClient'
import { usePlayer } from '../../lib/PlayerContext'
import { getGame } from '../../lib/constants'
import { RegisterTeamSheet } from '../components/RegisterTeamSheet'
import { MyTeamDashboard } from '../components/MyTeamDashboard'
import { LongStandings } from '../components/LongStandings'
import { LongMatchSchedule } from '../components/LongMatchSchedule'

const TABS = [
  { id: 'my-team',   label: 'My Team' },
  { id: 'standings', label: 'Standings' },
  { id: 'schedule',  label: 'Schedule' },
  { id: 'info',      label: 'Info' },
]

const STATUS_META = {
  ongoing:   { label: 'Live',     cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  pending:   { label: 'Upcoming', cls: 'bg-sky-500/15 text-sky-300 border-sky-500/30' },
  completed: { label: 'Ended',    cls: 'bg-slate-700/60 text-slate-400 border-slate-600/30' },
}

export function LeagueTournamentPage() {
  const { tournamentId } = useParams()
  const navigate = useNavigate()
  const { user, profile } = usePlayer()

  const [tournament, setTournament]     = React.useState(null)
  const [registration, setRegistration] = React.useState(null)   // player's own reg
  const [gameProfile, setGameProfile]   = React.useState(null)   // player's game_profile
  const [loading, setLoading]           = React.useState(true)
  const [activeTab, setActiveTab]       = React.useState('my-team')
  const [showRegSheet, setShowRegSheet] = React.useState(false)
  const [regSuccess, setRegSuccess]     = React.useState(false)

  const load = React.useCallback(async () => {
    setLoading(true)

    // Tournament
    const { data: t } = await supabasePlayer
      .from('tournaments')
      .select('*')
      .eq('id', tournamentId)
      .eq('type', 'long')
      .maybeSingle()
    setTournament(t || null)

    if (!t || !user) { setLoading(false); return }

    // Player's registration — check host OR member
    const { data: hostReg } = await supabasePlayer
      .from('tournament_registrations')
      .select('*')
      .eq('tournament_id', tournamentId)
      .eq('host_player_id', user.id)
      .maybeSingle()

    if (hostReg) {
      setRegistration(hostReg)
    } else {
      // Check if they're a member of another team
      const { data: memberRow } = await supabasePlayer
        .from('registration_members')
        .select('registration_id')
        .eq('player_id', user.id)
        .maybeSingle()
      if (memberRow?.registration_id) {
        const { data: memberReg } = await supabasePlayer
          .from('tournament_registrations')
          .select('*')
          .eq('id', memberRow.registration_id)
          .eq('tournament_id', tournamentId)
          .maybeSingle()
        setRegistration(memberReg || null)
      } else {
        setRegistration(null)
      }
    }

    // Player's game profile
    const { data: gp } = await supabasePlayer
      .from('game_profiles')
      .select('id, game_uid, in_game_name, status')
      .eq('player_id', user.id)
      .eq('game_id', t.game_id)
      .maybeSingle()
    setGameProfile(gp || null)

    setLoading(false)
  }, [tournamentId, user])

  React.useEffect(() => { load() }, [load])

  const handleRegistered = () => {
    setShowRegSheet(false)
    setRegSuccess(true)
    load()
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-5 w-16 rounded bg-slate-700/60" />
        <div className="h-8 w-64 rounded bg-slate-700/60" />
        <div className="h-4 w-40 rounded bg-slate-700/50" />
        <div className="h-32 w-full rounded-xl bg-slate-800/50" />
      </div>
    )
  }

  if (!tournament) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <p className="text-sm text-slate-400">Tournament not found.</p>
        <button onClick={() => navigate('/league')} className="btn-secondary text-xs">Back to League</button>
      </div>
    )
  }

  const game   = getGame(tournament.game_id)
  const meta   = STATUS_META[tournament.status] ?? STATUS_META.pending
  const isFree = !tournament.entry_fee || Number(tournament.entry_fee) === 0
  const regOpen = tournament.registration_status === 'open' && tournament.status !== 'completed'
  const hasNoProfile = !gameProfile || gameProfile.status !== 'approved'
  const canRegister  = regOpen && !registration && !hasNoProfile

  // Filter tabs — hide My Team if tournament not started and no registration
  const visibleTabs = TABS.filter(t => {
    if (t.id === 'my-team' && !registration && tournament.status === 'pending') return false
    return true
  })

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-slate-500">
        <Link to="/league" className="hover:text-slate-300 transition-colors">League</Link>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
        <span className="text-slate-300 truncate max-w-[180px]">{tournament.title}</span>
      </nav>

      {/* Tournament header */}
      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {game?.logo_url
              ? <img src={game.logo_url} alt={game.name} width={40} height={40} className="rounded-xl object-cover flex-shrink-0" loading="lazy" />
              : <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400 text-sm font-bold flex-shrink-0">{(game?.name ?? 'T')[0]}</div>
            }
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">{game?.name ?? tournament.game_id}</p>
              <h1 className="text-xl font-bold tracking-tight text-slate-50 leading-tight">{tournament.title}</h1>
            </div>
          </div>
          <span className={`flex-shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${meta.cls}`}>{meta.label}</span>
        </div>

        {/* Tags */}
        <div className="mt-3 flex flex-wrap gap-2">
          {tournament.mode_label && <span className="rounded-lg border border-slate-700/50 bg-slate-800/60 px-2 py-1 text-[10px] font-medium text-slate-300">{tournament.mode_label}</span>}
          {tournament.format_label && <span className="rounded-lg border border-slate-700/50 bg-slate-800/60 px-2 py-1 text-[10px] font-medium text-slate-300">{tournament.format_label}</span>}
          {tournament.map && <span className="rounded-lg border border-slate-700/50 bg-slate-800/60 px-2 py-1 text-[10px] font-medium text-slate-300">📍 {tournament.map}</span>}
          {tournament.total_rounds && <span className="rounded-lg border border-slate-700/50 bg-slate-800/60 px-2 py-1 text-[10px] font-medium text-slate-300">{tournament.total_rounds} Rounds</span>}
          <span className={`rounded-lg border px-2 py-1 text-[10px] font-medium ${isFree ? 'border-emerald-500/30 text-emerald-300' : 'border-amber-500/30 text-amber-300'}`}>
            {isFree ? 'Free' : `₹${tournament.entry_fee}`}
          </span>
        </div>

        {/* Registration CTA */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {registration ? (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="text-xs font-medium text-emerald-300">You're registered — {registration.team_name}</span>
            </div>
          ) : canRegister ? (
            <button onClick={() => setShowRegSheet(true)} className="btn-primary text-sm">
              Join this League →
            </button>
          ) : hasNoProfile && regOpen ? (
            <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2">
              <span className="text-xs text-amber-300">Verify your {game?.name ?? ''} profile to register</span>
            </div>
          ) : !regOpen && tournament.status !== 'completed' ? (
            <span className="text-xs text-slate-400">Registration closed</span>
          ) : null}

          {tournament.prize_text && (
            <span className="text-xs font-medium text-amber-400">🏆 {tournament.prize_text}</span>
          )}
        </div>

        {regSuccess && (
          <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
            <p className="text-xs font-medium text-emerald-300">✅ Registration submitted! Waiting for admin approval.</p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-slate-700/50 bg-slate-800/40 p-1 no-scrollbar">
        {visibleTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-shrink-0 rounded-lg px-4 py-2 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-sky-500/20 text-sky-300'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >{tab.label}</button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'my-team' && (
          registration
            ? <MyTeamDashboard tournament={tournament} registration={registration} />
            : (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 text-slate-500">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="7" r="4" /><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /><path d="M21 21v-2a4 4 0 0 0-3-3.87" /></svg>
                </div>
                <p className="text-sm font-medium text-slate-300">You're not registered</p>
                <p className="text-xs text-slate-500 max-w-xs">{canRegister ? 'Register your team to see your match assignment and points here.' : hasNoProfile ? `Verify your ${game?.name ?? ''} profile first.` : 'Registration is currently closed.'}</p>
                {canRegister && <button onClick={() => setShowRegSheet(true)} className="btn-primary text-xs mt-1">Register Now →</button>}
              </div>
            )
        )}

        {activeTab === 'standings' && <LongStandings tournamentId={tournament.id} />}
        {activeTab === 'schedule'  && <LongMatchSchedule tournamentId={tournament.id} />}

        {activeTab === 'info' && (
          <div className="card space-y-3">
            <div className="grid grid-cols-2 gap-3 text-xs">
              {[
                { label: 'Game',          val: game?.name ?? tournament.game_id },
                { label: 'Mode',          val: tournament.mode_label ?? tournament.mode ?? '—' },
                { label: 'Format',        val: tournament.format_label ?? '—' },
                { label: 'Map',           val: tournament.map ?? '—' },
                { label: 'Team Size',     val: tournament.team_size ? `${tournament.team_size} players` : '—' },
                { label: 'Total Rounds',  val: tournament.total_rounds ?? '—' },
                { label: 'Max Teams',     val: tournament.max_slots ?? '—' },
                { label: 'Entry Fee',     val: isFree ? 'Free' : `₹${tournament.entry_fee}` },
                { label: 'Start',         val: tournament.start_time ? new Date(tournament.start_time).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—' },
                { label: 'Reg. Closes',  val: tournament.entry_closing_time ? new Date(tournament.entry_closing_time).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—' },
              ].map(row => (
                <div key={row.label} className="flex flex-col gap-0.5">
                  <span className="text-[10px] uppercase tracking-widest text-slate-500">{row.label}</span>
                  <span className="font-medium text-slate-200">{row.val}</span>
                </div>
              ))}
            </div>
            {tournament.prize_text && (
              <div className="mt-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2">
                <p className="text-[10px] uppercase tracking-widest text-amber-500/80 mb-0.5">Prize</p>
                <p className="text-sm font-semibold text-amber-300">{tournament.prize_text}</p>
              </div>
            )}
            {tournament.winner_text && (
              <div className="mt-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
                <p className="text-[10px] uppercase tracking-widest text-emerald-500/80 mb-0.5">Winner</p>
                <p className="text-sm font-semibold text-emerald-300">🏆 {tournament.winner_text}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Registration sheet */}
      {showRegSheet && (
        <RegisterTeamSheet
          tournament={tournament}
          gameProfile={gameProfile}
          onClose={() => setShowRegSheet(false)}
          onRegistered={handleRegistered}
        />
      )}
    </div>
  )
}
