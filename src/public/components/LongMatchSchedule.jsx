import React from 'react'
import { supabasePlayer } from '../../lib/supabaseClient'

const STATUS_META = {
  pending:   { label: 'Upcoming', cls: 'bg-sky-500/15 text-sky-300 border-sky-500/30' },
  ongoing:   { label: 'Live',     cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  completed: { label: 'Done',     cls: 'bg-slate-700/60 text-slate-400 border-slate-600/30' },
}

/**
 * LongMatchSchedule — public round/match breakdown
 * Props: tournamentId
 */
export function LongMatchSchedule({ tournamentId }) {
  const [matchesByRound, setMatchesByRound] = React.useState({})
  const [currentRound, setCurrentRound]     = React.useState(1)
  const [loading, setLoading]               = React.useState(true)

  React.useEffect(() => {
    async function load() {
      setLoading(true)

      const { data: bracket } = await supabasePlayer
        .from('long_brackets')
        .select('id, current_round')
        .eq('tournament_id', tournamentId)
        .maybeSingle()

      if (!bracket) { setLoading(false); return }
      setCurrentRound(bracket.current_round ?? 1)

      const { data: matches } = await supabasePlayer
        .from('long_br_matches')
        .select('id, round_number, match_number, team_a_registration_id, team_b_registration_id, winner_registration_id, status')
        .eq('bracket_id', bracket.id)
        .order('round_number').order('match_number')

      // Fetch registration team names
      const regIds = [...new Set((matches || []).flatMap(m => [
        m.team_a_registration_id, m.team_b_registration_id, m.winner_registration_id
      ].filter(Boolean)))]

      let regMap = {}
      if (regIds.length) {
        const { data: regs } = await supabasePlayer
          .from('tournament_registrations')
          .select('id, team_name')
          .in('id', regIds)
        ;(regs || []).forEach(r => { regMap[r.id] = r.team_name })
      }

      // Group by round
      const grouped = {}
      ;(matches || []).forEach(m => {
        if (!grouped[m.round_number]) grouped[m.round_number] = []
        grouped[m.round_number].push({ ...m, regMap })
      })
      setMatchesByRound(grouped)
      setLoading(false)
    }
    load()
  }, [tournamentId])

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-slate-800/50 animate-pulse" />)}
      </div>
    )
  }

  const rounds = Object.keys(matchesByRound).map(Number).sort((a, b) => a - b)

  if (!rounds.length) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <p className="text-sm text-slate-400">Match schedule will appear here once admin generates fixtures.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {rounds.map(round => {
        const matches = matchesByRound[round]
        const isCurrentRound = round === currentRound
        const allDone = matches.every(m => m.status === 'completed')

        return (
          <div key={round}>
            <div className="mb-2 flex items-center gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-300">Round {round}</h3>
              {isCurrentRound && !allDone && (
                <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />Active
                </span>
              )}
              {allDone && (
                <span className="rounded-full bg-slate-700/60 border border-slate-600/30 px-2 py-0.5 text-[10px] text-slate-400">Completed</span>
              )}
            </div>

            <div className="space-y-2">
              {matches.map(m => {
                const meta  = STATUS_META[m.status] ?? STATUS_META.pending
                const teamA = m.regMap[m.team_a_registration_id] ?? 'TBD'
                const teamB = m.team_b_registration_id ? (m.regMap[m.team_b_registration_id] ?? 'TBD') : 'BYE'
                const winner = m.winner_registration_id ? m.regMap[m.winner_registration_id] : null
                const isKnockout = !!(m.team_a_registration_id && m.team_b_registration_id)

                return (
                  <div key={m.id} className="flex items-center gap-3 rounded-xl border border-slate-700/40 bg-slate-800/30 px-3 py-2.5">
                    <div className="flex-shrink-0 w-6 text-center">
                      <span className="text-[10px] font-semibold text-slate-500">#{m.match_number}</span>
                    </div>
                    {isKnockout ? (
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-xs font-semibold truncate ${winner === teamA ? 'text-emerald-300' : 'text-slate-200'}`}>{teamA}</span>
                          <span className="text-[10px] text-slate-500">vs</span>
                          <span className={`text-xs font-semibold truncate ${teamB === 'BYE' ? 'text-slate-500 italic' : winner === teamB ? 'text-emerald-300' : 'text-slate-200'}`}>{teamB}</span>
                        </div>
                        {winner && <p className="text-[10px] text-emerald-400">Winner: {winner}</p>}
                      </div>
                    ) : (
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-200">Match {m.match_number}</p>
                        {m.status === 'completed'
                          ? <p className="text-[10px] text-slate-400">Results posted</p>
                          : <p className="text-[10px] text-slate-500">Results pending</p>
              }
                      </div>
                    )}
                    <span className={`flex-shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${meta.cls}`}>
                      {meta.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
