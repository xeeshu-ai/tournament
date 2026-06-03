import React from 'react'
import { supabasePlayer } from '../../lib/supabaseClient'

function MedalIcon({ rank }) {
  if (rank === 1) return <span aria-label="1st">🥇</span>
  if (rank === 2) return <span aria-label="2nd">🥈</span>
  if (rank === 3) return <span aria-label="3rd">🥉</span>
  return <span className="text-slate-500 text-xs font-semibold">#{rank}</span>
}

/**
 * LongStandings — public cumulative leaderboard
 * Props: tournamentId
 */
export function LongStandings({ tournamentId }) {
  const [rows, setRows]     = React.useState([])
  const [loading, setLoading] = React.useState(true)
  const [lastUpdate, setLastUpdate] = React.useState(null)

  const load = React.useCallback(async () => {
    const { data: bracket } = await supabasePlayer
      .from('long_brackets')
      .select('id')
      .eq('tournament_id', tournamentId)
      .maybeSingle()

    if (!bracket) { setLoading(false); return }

    const { data: matches } = await supabasePlayer
      .from('long_br_matches')
      .select('id')
      .eq('bracket_id', bracket.id)
      .eq('status', 'completed')

    if (!matches?.length) { setRows([]); setLoading(false); return }

    const { data: scores } = await supabasePlayer
      .from('long_br_match_scores')
      .select('team_name, kills, position, points, match_id')
      .in('match_id', matches.map(m => m.id))

    // Aggregate by team
    const totals = {}
    ;(scores || []).forEach(s => {
      if (!totals[s.team_name]) totals[s.team_name] = { team_name: s.team_name, total_points: 0, total_kills: 0, matches_played: 0 }
      totals[s.team_name].total_points  += Number(s.points) || 0
      totals[s.team_name].total_kills   += Number(s.kills)  || 0
      totals[s.team_name].matches_played += 1
    })

    const sorted = Object.values(totals).sort((a, b) => b.total_points - a.total_points || b.total_kills - a.total_kills)
    setRows(sorted)
    setLastUpdate(new Date())
    setLoading(false)
  }, [tournamentId])

  React.useEffect(() => {
    load()
    const interval = setInterval(load, 30_000) // refresh every 30s
    return () => clearInterval(interval)
  }, [load])

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 rounded-xl bg-slate-800/50 animate-pulse" />
        ))}
      </div>
    )
  }

  if (!rows.length) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <p className="text-sm text-slate-400">Standings will appear here once matches are completed.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {lastUpdate && (
        <p className="text-[10px] text-slate-500 text-right">Updated {lastUpdate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
      )}
      <div className="overflow-x-auto rounded-xl border border-slate-700/50">
        <table className="w-full min-w-[320px] text-xs">
          <thead>
            <tr className="border-b border-slate-700/50 bg-slate-800/60">
              <th className="px-3 py-2.5 text-left font-semibold text-slate-400 w-10">Rank</th>
              <th className="px-3 py-2.5 text-left font-semibold text-slate-400">Team</th>
              <th className="px-3 py-2.5 text-right font-semibold text-slate-400">MP</th>
              <th className="px-3 py-2.5 text-right font-semibold text-slate-400">Kills</th>
              <th className="px-3 py-2.5 text-right font-semibold text-sky-400">Points</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/30">
            {rows.map((row, i) => {
              const rank = i + 1
              const isTop3 = rank <= 3
              return (
                <tr key={row.team_name} className={`transition-colors ${isTop3 ? 'bg-sky-500/5' : 'hover:bg-slate-800/30'}`}>
                  <td className="px-3 py-2.5 text-center"><MedalIcon rank={rank} /></td>
                  <td className="px-3 py-2.5 font-medium text-slate-100">{row.team_name}</td>
                  <td className="px-3 py-2.5 text-right text-slate-400">{row.matches_played}</td>
                  <td className="px-3 py-2.5 text-right text-slate-400">{row.total_kills}</td>
                  <td className="px-3 py-2.5 text-right font-bold text-sky-400">{row.total_points}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
