import React from 'react'
import { supabasePlayer } from '../../lib/supabaseClient'
import { usePlayer } from '../../lib/PlayerContext'

function calcPoints(position, kills) {
  const base  = Math.floor((kills + 1) / position * 10)
  const bonus = position === 1 ? 10 : position === 2 ? 6 : position === 3 ? 4 : 0
  return base + bonus
}

const MATCH_STATUS_META = {
  pending:   { label: 'Upcoming',  cls: 'bg-sky-500/15 text-sky-300 border-sky-500/30' },
  ongoing:   { label: 'Live',      cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  completed: { label: 'Done',      cls: 'bg-slate-700/60 text-slate-400 border-slate-600/30' },
}

/**
 * MyTeamDashboard
 * Props: tournament, registration (tournament_registrations row)
 */
export function MyTeamDashboard({ tournament, registration }) {
  const [bracket, setBracket]   = React.useState(null)
  const [scores, setScores]     = React.useState([]) // long_br_match_scores for this team
  const [matches, setMatches]   = React.useState([]) // all long_br_matches for this bracket
  const [allScores, setAllScores] = React.useState([]) // all scores for rank calculation
  const [loading, setLoading]   = React.useState(true)

  const teamName = registration.team_name

  React.useEffect(() => {
    async function load() {
      setLoading(true)

      // Bracket
      const { data: b } = await supabasePlayer
        .from('long_brackets')
        .select('*')
        .eq('tournament_id', tournament.id)
        .maybeSingle()
      setBracket(b || null)

      if (!b) { setLoading(false); return }

      // All matches
      const { data: m } = await supabasePlayer
        .from('long_br_matches')
        .select('*')
        .eq('bracket_id', b.id)
        .order('round_number').order('match_number')
      setMatches(m || [])

      // All scores (for rank)
      const matchIds = (m || []).map(x => x.id)
      if (matchIds.length > 0) {
        const { data: s } = await supabasePlayer
          .from('long_br_match_scores')
          .select('*')
          .in('match_id', matchIds)
        setAllScores(s || [])
        setScores((s || []).filter(row => row.team_name === teamName))
      }
      setLoading(false)
    }
    load()
  }, [tournament.id, teamName])

  if (loading) {
    return (
      <div className="card space-y-3 animate-pulse">
        <div className="h-4 w-32 rounded bg-slate-700/60" />
        <div className="h-3 w-full rounded bg-slate-700/50" />
        <div className="h-3 w-3/4 rounded bg-slate-700/50" />
      </div>
    )
  }

  // ── Totals ──
  const totalPoints = scores.reduce((sum, s) => sum + (Number(s.points) || 0), 0)

  // Rank: aggregate all teams' points
  const teamTotals = {}
  allScores.forEach(s => {
    teamTotals[s.team_name] = (teamTotals[s.team_name] || 0) + (Number(s.points) || 0)
  })
  const sortedTeams = Object.entries(teamTotals).sort((a, b) => b[1] - a[1])
  const rank = sortedTeams.findIndex(([name]) => name === teamName) + 1

  // ── Current match assignment ──
  const currentRound = bracket?.current_round ?? 1
  const myMatchesThisRound = matches.filter(m => m.round_number === currentRound)
  const myCurrentMatch = myMatchesThisRound.find(m =>
    m.team_a_registration_id === registration.id ||
    m.team_b_registration_id === registration.id
  )
  const isBye = myCurrentMatch &&
    (myCurrentMatch.team_a_registration_id === null || myCurrentMatch.team_b_registration_id === null)

  // ── Completed match scores ──
  const completedMatchIds = matches.filter(m => m.status === 'completed').map(m => m.id)
  const myCompletedScores = scores.filter(s => completedMatchIds.includes(s.match_id))

  const statusColor = registration.status === 'approved'
    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
    : registration.status === 'rejected'
      ? 'border-red-500/30 bg-red-500/10 text-red-400'
      : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
  const statusLabel = registration.status === 'approved' ? 'Approved' : registration.status === 'rejected' ? 'Rejected' : 'Pending Approval'

  return (
    <div className="space-y-4">
      {/* Team header card */}
      <div className="card border-sky-500/20 bg-sky-500/5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Your Team</p>
            <h2 className="text-lg font-bold text-slate-100">{teamName}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{tournament.title}</p>
          </div>
          <span className={`flex-shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${statusColor}`}>
            {statusLabel}
          </span>
        </div>

        {registration.status === 'approved' && bracket && (
          <div className="mt-3 flex flex-wrap gap-3 border-t border-slate-700/40 pt-3">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500">Round</span>
              <span className="text-sm font-semibold text-slate-100">{currentRound} / {tournament.total_rounds ?? '?'}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500">Total Points</span>
              <span className="text-sm font-semibold text-sky-400">{totalPoints} pts</span>
            </div>
            {rank > 0 && (
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500">Current Rank</span>
                <span className="text-sm font-semibold text-amber-400">#{rank}</span>
              </div>
            )}
          </div>
        )}

        {registration.status === 'pending' && (
          <p className="mt-3 text-xs text-slate-400 border-t border-slate-700/40 pt-3">
            Your registration is under review. Admin will approve shortly.
          </p>
        )}
      </div>

      {registration.status === 'approved' && bracket && (
        <>
          {/* Current round assignment */}
          <div className="card">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-2">Round {currentRound} Assignment</p>
            {myCurrentMatch ? (
              <div className="space-y-1">
                {isBye ? (
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 text-sm">👑</span>
                    <div>
                      <p className="text-sm font-semibold text-slate-100">BYE — Auto Advanced</p>
                      <p className="text-[11px] text-slate-400">You advance directly to Round {currentRound + 1}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${
                        MATCH_STATUS_META[myCurrentMatch.status]?.cls ?? MATCH_STATUS_META.pending.cls
                      }`}>{MATCH_STATUS_META[myCurrentMatch.status]?.label ?? 'Upcoming'}</span>
                      <span className="text-xs text-slate-300">Match #{myCurrentMatch.match_number} · Round {currentRound}</span>
                    </div>
                    {/* For knockout: show opponent */}
                    {(myCurrentMatch.team_a_registration_id && myCurrentMatch.team_b_registration_id) && (
                      <p className="text-[11px] text-slate-400">1v1 Knockout match</p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400">Match assignment coming soon. Check back once admin generates fixtures.</p>
            )}
          </div>

          {/* Points history */}
          {myCompletedScores.length > 0 && (
            <div className="card">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-2">Match History</p>
              <div className="space-y-2">
                {myCompletedScores.map((s, i) => {
                  const match = matches.find(m => m.id === s.match_id)
                  return (
                    <div key={s.id} className="flex items-center justify-between rounded-lg border border-slate-700/40 bg-slate-800/40 px-3 py-2">
                      <div>
                        <p className="text-[11px] font-medium text-slate-200">
                          R{match?.round_number ?? '?'} · Match #{match?.match_number ?? i + 1}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Pos: {s.position ?? '—'} · Kills: {s.kills ?? '—'}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-sky-400">{Number(s.points) || 0} pts</span>
                    </div>
                  )
                })}
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-slate-700/40 pt-2">
                <span className="text-xs text-slate-400">Total</span>
                <span className="text-sm font-bold text-sky-400">{totalPoints} pts</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
