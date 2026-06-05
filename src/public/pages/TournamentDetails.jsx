import React from 'react'
import { useParams } from 'react-router-dom'
import { supabasePlayer } from '../../lib/supabaseClient'
import { usePlayer } from '../../lib/PlayerContext'
import { useGame } from '../../lib/GameContext'
import { getModeLabel } from '../../lib/constants'

// ─── Teammate UID Validator ────────────────────────────────────────────────────
function useUidValidation(uid, hostUid, gameId) {
  const [state, setState] = React.useState({ status: 'idle', name: null })
  React.useEffect(() => {
    const trimmed = uid.trim()
    if (!trimmed) { setState({ status: 'idle', name: null }); return }
    if (trimmed === hostUid) { setState({ status: 'invalid', name: null, msg: "That's your own UID" }); return }
    setState({ status: 'checking', name: null })
    const timer = setTimeout(async () => {
      let query = supabasePlayer
        .from('game_profiles')
        .select('in_game_name, status')
        .eq('game_uid', trimmed)
        .eq('status', 'verified')
      if (gameId) query = query.eq('game_id', gameId)
      const { data } = await query.maybeSingle()
      if (data && data.status === 'verified') {
        setState({ status: 'valid', name: data.in_game_name })
      } else if (data && data.status !== 'verified') {
        setState({ status: 'invalid', name: null, msg: 'Player UID not verified yet' })
      } else {
        setState({ status: 'invalid', name: null, msg: 'No player found with this UID' })
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [uid, hostUid, gameId])
  return state
}

function TeammateInput({ index, value, onChange, hostUid, gameId }) {
  const v = useUidValidation(value, hostUid, gameId)
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-2">
        <input
          type="text"
          className={`input flex-1 ${v.status === 'valid' ? 'border-emerald-500/60' : v.status === 'invalid' ? 'border-red-500/60' : ''}`}
          placeholder={`Teammate ${index + 1} UID (optional)`}
          value={value}
          onChange={e => onChange(e.target.value)}
        />
        {v.status === 'checking' && <span className="text-[11px] text-slate-400 animate-pulse whitespace-nowrap">checking…</span>}
        {v.status === 'valid' && <span className="text-[11px] text-emerald-400 whitespace-nowrap">✅ {v.name}</span>}
      </div>
      {v.status === 'invalid' && <p className="text-[11px] text-red-400 pl-1">❌ {v.msg}</p>}
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function teammateCount(teamSize) {
  if (teamSize === null || teamSize === undefined) return 0
  const n = Number(teamSize)
  if (!isNaN(n)) {
    if (n <= 1) return 0
    if (n === 2) return 1
    return n - 1
  }
  const s = String(teamSize).toLowerCase()
  if (s.includes('duo') || s.includes('2v2')) return 1
  if (s.includes('squad') || s === '3' || s === '4') return 3
  return 0
}

function teamSizeLabel(teamSize) {
  if (teamSize === null || teamSize === undefined) return ''
  const n = Number(teamSize)
  if (!isNaN(n)) {
    if (n <= 1) return 'Solo'
    if (n === 2) return 'Duo'
    if (n === 3) return 'Trio'
    if (n >= 4) return 'Squad'
  }
  return String(teamSize)
}

function fmtDate(iso) {
  if (!iso) return null
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
      timeZone: 'Asia/Kolkata',
    }).format(new Date(iso))
  } catch { return iso }
}

// ─── BR Rules Section ─────────────────────────────────────────────────────────
function BRRulesSection({ gameName }) {
  const [open, setOpen] = React.useState(false)

  const killPoints = [
    { kills: '1', pts: '1' },
    { kills: '2', pts: '2' },
    { kills: '3', pts: '3' },
    { kills: '4', pts: '4' },
    { kills: '5+', pts: '5 (+1 each)' },
  ]

  const positionPoints = [
    { pos: '#1 (Winner)', pts: '15' },
    { pos: '#2', pts: '12' },
    { pos: '#3', pts: '10' },
    { pos: '#4', pts: '8' },
    { pos: '#5', pts: '6' },
    { pos: '#6', pts: '4' },
    { pos: '#7–#10', pts: '3' },
    { pos: '#11–#15', pts: '2' },
    { pos: '#16+', pts: '0' },
  ]

  return (
    <section className="card space-y-3 border border-sky-800/40 bg-sky-500/5">
      <button
        type="button"
        className="w-full flex items-center gap-2 text-left"
        onClick={() => setOpen(o => !o)}
      >
        <span className="text-base">📋</span>
        <p className="text-xs font-semibold text-sky-300 flex-1">Match Rules &amp; Points System</p>
        <svg
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="space-y-4 pt-1">
          {/* General Rules */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">📌 General Rules</p>
            <ul className="space-y-1">
              {[
                'Players must join the room using the exact Room ID and Password provided.',
                'All players must be present in the lobby 5 minutes before match start.',
                'Use only your registered in-game name — mismatches may lead to disqualification.',
                'Teaming with non-registered players, hacking, or exploiting bugs is strictly prohibited.',
                'Any form of cheating or unsportsmanlike conduct will result in immediate disqualification.',
                'Admin decisions are final. Results are posted after match verification.',
                'Screenshots/recordings may be required for dispute resolution.',
              ].map((rule, i) => (
                <li key={i} className="flex items-start gap-1.5 text-[11px] text-slate-300">
                  <span className="text-slate-500 shrink-0 mt-0.5">•</span>
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t border-slate-800" />

          {/* Points System */}
          <div className="space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">🎯 How Points Are Calculated</p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Total Points = <span className="text-amber-300 font-semibold">Position Points</span> + <span className="text-sky-300 font-semibold">Kill Points</span>
            </p>

            {/* Position Points */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-medium text-amber-400 uppercase tracking-wide">🏅 Position Points</p>
              <div className="rounded-lg overflow-hidden ring-1 ring-slate-700/60">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-900/80 border-b border-slate-700">
                      <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wide text-slate-500">Finish Position</th>
                      <th className="px-3 py-2 text-right text-[10px] uppercase tracking-wide text-amber-500">Points</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {positionPoints.map((row, i) => (
                      <tr key={i} className={i === 0 ? 'bg-amber-500/10' : 'bg-slate-900/40'}>
                        <td className={`px-3 py-1.5 font-medium ${i === 0 ? 'text-amber-300' : 'text-slate-200'}`}>{row.pos}</td>
                        <td className={`px-3 py-1.5 text-right font-bold tabular-nums ${i === 0 ? 'text-amber-300' : 'text-slate-300'}`}>{row.pts}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Kill Points */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-medium text-sky-400 uppercase tracking-wide">💀 Kill Points</p>
              <div className="rounded-lg overflow-hidden ring-1 ring-slate-700/60">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-900/80 border-b border-slate-700">
                      <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wide text-slate-500">Kills</th>
                      <th className="px-3 py-2 text-right text-[10px] uppercase tracking-wide text-sky-500">Points</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {killPoints.map((row, i) => (
                      <tr key={i} className="bg-slate-900/40">
                        <td className="px-3 py-1.5 text-slate-200">{row.kills} kill{row.kills === '1' ? '' : 's'}</td>
                        <td className="px-3 py-1.5 text-right font-bold tabular-nums text-sky-300">{row.pts}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Each kill = 1 point. There is no kill cap — every elimination counts toward your total score.
              </p>
            </div>

            {/* Example */}
            <div className="rounded-lg bg-slate-900/60 ring-1 ring-slate-700/40 px-3 py-2.5 space-y-1">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Example</p>
              <p className="text-[11px] text-slate-300">
                Team finishes <span className="text-amber-300 font-bold">#3</span> with <span className="text-sky-300 font-bold">6 kills</span>:
              </p>
              <p className="text-[11px] text-slate-200 font-semibold">
                10 (position) + 6 (kills) = <span className="text-emerald-400">16 total points</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

// ─── Registered Teams List ────────────────────────────────────────────────────
function RegisteredTeamsList({ tournamentId, teamSize }) {
  const [regs, setRegs] = React.useState(null)
  const [expanded, setExpanded] = React.useState(null)
  const needTeammates = teammateCount(teamSize) > 0

  React.useEffect(() => {
    async function load() {
      const { data: regRows, error } = await supabasePlayer
        .from('tournament_registrations')
        .select('id, team_name, host_uid, status, created_at')
        .eq('tournament_id', tournamentId)
        .not('status', 'in', '("rejected","cancelled")')
        .order('created_at', { ascending: true })

      if (error) { console.error('RegisteredTeamsList error:', error); setRegs([]); return }
      if (!regRows?.length) { setRegs([]); return }

      const regIds = regRows.map(r => r.id)
      const { data: members } = await supabasePlayer
        .from('registration_members')
        .select('registration_id, slot, game_uid, in_game_name')
        .in('registration_id', regIds)
        .order('slot', { ascending: true })

      const membersByReg = {}
      for (const m of (members || [])) {
        if (!membersByReg[m.registration_id]) membersByReg[m.registration_id] = []
        membersByReg[m.registration_id].push(m)
      }

      setRegs(regRows.map(r => ({ ...r, members: membersByReg[r.id] || [] })))
    }
    load()
  }, [tournamentId])

  if (regs === null) {
    return (
      <section className="card space-y-3">
        <p className="text-xs font-semibold text-slate-300">👥 Registered Teams</p>
        <div className="flex items-center gap-2 text-xs text-slate-500 animate-pulse">
          <div className="h-3 w-3 rounded-full border-2 border-slate-600 border-t-amber-400 animate-spin" />
          Loading…
        </div>
      </section>
    )
  }

  if (!regs.length) {
    return (
      <section className="card space-y-2">
        <p className="text-xs font-semibold text-slate-300">👥 Registered Teams</p>
        <p className="text-[11px] text-slate-500">No teams registered yet. Be the first!</p>
      </section>
    )
  }

  return (
    <section className="card space-y-3" id="registered-teams">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate-300">👥 Registered Teams</p>
        <span className="text-[10px] rounded-full bg-slate-800 text-slate-400 px-2 py-0.5 font-semibold tabular-nums">
          {regs.length} team{regs.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-2">
        {regs.map((reg, i) => {
          const isOpen = expanded === reg.id
          const statusColor = reg.status === 'confirmed' ? 'text-emerald-400' : 'text-amber-400'
          const statusLabel = reg.status === 'confirmed' ? 'joined' : reg.status
          const hostMember = reg.members.find(m => m.slot === 0) || reg.members[0]
          const hostName = hostMember?.in_game_name || reg.host_uid

          return (
            <div
              key={reg.id}
              className={`rounded-xl ring-1 overflow-hidden transition-all ${
                reg.status === 'confirmed'
                  ? 'ring-emerald-700/30 bg-emerald-500/5'
                  : 'ring-slate-700/60 bg-slate-900/40'
              }`}
            >
              <button
                type="button"
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left"
                onClick={() => setExpanded(isOpen ? null : reg.id)}
              >
                <span className="text-[11px] text-slate-500 tabular-nums w-5 shrink-0">#{i + 1}</span>
                <span className="flex-1 text-xs font-semibold text-slate-100 truncate">{reg.team_name}</span>
                {needTeammates && (
                  <span className="text-[10px] text-slate-500 shrink-0">
                    {reg.members.length} player{reg.members.length !== 1 ? 's' : ''}
                  </span>
                )}
                <span className={`text-[10px] font-semibold uppercase tracking-wide shrink-0 ${statusColor}`}>
                  {statusLabel}
                </span>
                <svg className={`w-3.5 h-3.5 text-slate-500 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>

              {isOpen && (
                <div className="px-3 pb-3 space-y-1.5 border-t border-white/5 pt-2">
                  {needTeammates ? (
                    reg.members.length > 0
                      ? reg.members
                          .slice()
                          .sort((a, b) => a.slot - b.slot)
                          .map((m, mi) => (
                            <div key={m.game_uid + mi} className="flex items-center gap-2 text-[11px]">
                              <span className="text-slate-500 w-5 shrink-0 text-center">
                                {m.slot === 0 ? '👑' : `${m.slot}.`}
                              </span>
                              <span className="text-slate-200 font-medium flex-1 truncate">
                                {m.in_game_name || m.game_uid}
                              </span>
                              <span className="font-mono text-slate-500 text-[10px] truncate">{m.game_uid}</span>
                              {m.slot === 0 && (
                                <span className="text-[9px] text-amber-400 font-semibold uppercase tracking-wide shrink-0">host</span>
                              )}
                            </div>
                          ))
                      : (
                        <p className="text-[11px] text-slate-500">Player details not available.</p>
                      )
                  ) : (
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="text-slate-500">👑</span>
                      <span className="text-slate-200 font-medium flex-1 truncate">{hostName}</span>
                      <span className="font-mono text-slate-500 text-[10px] truncate">{reg.host_uid}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ─── Tournament Results ───────────────────────────────────────────────────────
function TournamentResults({ tournament }) {
  const isBR = tournament.mode === 'br'
  const isCSorLW = tournament.mode === 'cs' || tournament.mode === 'lw'
  const isTDM = tournament.mode === 'tdm'

  const hasAnyResults =
    (isBR && Array.isArray(tournament.single_br_results) && tournament.single_br_results.length > 0) ||
    (isCSorLW && tournament.cs_lw_results?.matches?.length > 0) ||
    (isTDM && tournament.tdm_results?.matches?.length > 0) ||
    !!tournament.winner_text

  return (
    <section id="tournament-results" className="card space-y-4 border border-amber-700/40 bg-amber-500/5">
      <div className="flex items-center gap-2">
        <span className="text-lg">🏆</span>
        <h2 className="text-sm font-semibold text-amber-300">Final Results</h2>
        <span className="ml-auto text-[10px] rounded-full bg-red-600/20 text-red-400 px-2 py-0.5 font-semibold uppercase tracking-wide">Match Ended</span>
      </div>

      {tournament.winner_text && (
        <div className="rounded-lg bg-amber-500/10 px-3 py-3 ring-1 ring-amber-700/50">
          <p className="text-xs text-amber-200 whitespace-pre-line">{tournament.winner_text}</p>
        </div>
      )}

      {isBR && Array.isArray(tournament.single_br_results) && tournament.single_br_results.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-700 text-[10px] uppercase tracking-wide text-slate-500">
                <th className="pb-2 text-left w-8">#</th>
                <th className="pb-2 text-left">Team</th>
                <th className="pb-2 text-center">Kills</th>
                <th className="pb-2 text-center">Pos</th>
                <th className="pb-2 text-right">Pts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {tournament.single_br_results.map((row, i) => (
                <tr key={row.team_name + i} className={i === 0 ? 'bg-amber-500/10' : ''}>
                  <td className="py-2 pr-2">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : <span className="text-slate-500">{i + 1}</span>}
                  </td>
                  <td className={`py-2 font-semibold ${i === 0 ? 'text-amber-300' : 'text-slate-100'}`}>
                    <div>{row.team_name}</div>
                    {row.player_names?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {row.player_names.map((name, ni) => (
                          <span key={ni} className="text-[10px] text-slate-400">{name}</span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="py-2 text-center text-slate-300">{row.kills}</td>
                  <td className="py-2 text-center text-slate-300">#{row.position}</td>
                  <td className={`py-2 text-right font-bold tabular-nums ${i === 0 ? 'text-amber-300' : 'text-sky-300'}`}>
                    {typeof row.points === 'number' ? row.points.toFixed(1) : row.points}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!hasAnyResults && (
        <p className="text-xs text-slate-400">Results will be posted shortly. Check back soon!</p>
      )}

      {isCSorLW && tournament.cs_lw_results && (() => {
        const matches = tournament.cs_lw_results?.matches || []
        if (!matches.length) return null
        return (
          <div className="space-y-4">
            {matches.map((match, i) => (
              <div key={i} className="rounded-lg bg-slate-900/60 ring-1 ring-slate-700 overflow-hidden">
                <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-900/80 border-b border-slate-800">Match {i + 1}</div>
                <div className="grid grid-cols-[1fr_auto_1fr] gap-2 px-3 py-3 text-xs items-start">
                  <div className={`space-y-1 ${match.winner_team === match.teamA?.name ? 'text-emerald-300' : 'text-slate-200'}`}>
                    <p className="font-semibold">{match.teamA?.name}</p>
                    <p className="text-[11px] text-slate-400">Rounds: {match.teamA?.rounds_won ?? 0} | Kills: {match.teamA?.kills ?? 0}</p>
                  </div>
                  <div className="flex flex-col items-center gap-1 pt-1">
                    <span className="text-[10px] font-semibold uppercase text-slate-500">VS</span>
                    <span className="text-[11px] text-amber-400 font-semibold">{match.winner_team ? `W: ${match.winner_team}` : '—'}</span>
                  </div>
                  <div className={`space-y-1 text-right ${match.winner_team === match.teamB?.name ? 'text-emerald-300' : 'text-slate-200'}`}>
                    <p className="font-semibold">{match.teamB?.name}</p>
                    <p className="text-[11px] text-slate-400">Rounds: {match.teamB?.rounds_won ?? 0} | Kills: {match.teamB?.kills ?? 0}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      })()}

      {isTDM && tournament.tdm_results && (() => {
        const matches = tournament.tdm_results?.matches || []
        if (!matches.length) return null
        return (
          <div className="space-y-4">
            <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">TDM Match Results</p>
            {matches.map((match, i) => (
              <div key={i} className="rounded-lg bg-slate-900/60 ring-1 ring-slate-700 overflow-hidden">
                <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-900/80 border-b border-slate-800">
                  Match {i + 1}{match.map_name ? ` · ${match.map_name}` : ''}
                </div>
                <div className="grid grid-cols-[1fr_auto_1fr] gap-2 px-3 py-3 text-xs items-center">
                  <div className={`space-y-1 ${match.winner_team === match.teamA?.name ? 'text-emerald-300' : 'text-slate-200'}`}>
                    <p className="font-semibold truncate">{match.teamA?.name ?? '—'}</p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      {match.teamA?.rounds_won != null && <span>Rounds: <span className="font-semibold text-slate-200">{match.teamA.rounds_won}</span></span>}
                      {match.teamA?.kills != null && <span>Kills: <span className="font-semibold text-slate-200">{match.teamA.kills}</span></span>}
                    </div>
                    {match.winner_team === match.teamA?.name && (
                      <span className="inline-block text-[9px] font-bold uppercase tracking-wide text-emerald-400 bg-emerald-500/10 rounded px-1.5 py-0.5">Winner</span>
                    )}
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] font-bold text-slate-500">VS</span>
                    {match.score_a != null && match.score_b != null && (
                      <span className="text-sm font-black text-slate-100 tabular-nums">{match.score_a}–{match.score_b}</span>
                    )}
                  </div>
                  <div className={`space-y-1 text-right ${match.winner_team === match.teamB?.name ? 'text-emerald-300' : 'text-slate-200'}`}>
                    <p className="font-semibold truncate">{match.teamB?.name ?? '—'}</p>
                    <div className="flex items-center justify-end gap-2 text-[11px] text-slate-400">
                      {match.teamB?.rounds_won != null && <span>Rounds: <span className="font-semibold text-slate-200">{match.teamB.rounds_won}</span></span>}
                      {match.teamB?.kills != null && <span>Kills: <span className="font-semibold text-slate-200">{match.teamB.kills}</span></span>}
                    </div>
                    {match.winner_team === match.teamB?.name && (
                      <span className="inline-block text-[9px] font-bold uppercase tracking-wide text-emerald-400 bg-emerald-500/10 rounded px-1.5 py-0.5">Winner</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      })()}
    </section>
  )
}

// ─── Results Panel ─────────────────────────────────────────────────────────────
function ResultsPanel({ tournament }) {
  const isBR = tournament.mode === 'br'
  const isCSorLW = tournament.mode === 'cs' || tournament.mode === 'lw'
  const isTDM = tournament.mode === 'tdm'

  const hasResults =
    (isBR && Array.isArray(tournament.single_br_results) && tournament.single_br_results.length > 0) ||
    (isBR && tournament.winner_text) ||
    (isCSorLW && tournament.cs_lw_results?.matches?.length > 0) ||
    (isCSorLW && tournament.winner_text) ||
    (isTDM && tournament.tdm_results?.matches?.length > 0) ||
    tournament.winner_text

  // Always render when status is 'ended' OR when results exist
  if (!hasResults && tournament.status !== 'ended') return null

  return (
    <div className="space-y-4" id="tournament-ended">
      {tournament.status === 'ended' && (
        <div className="card border border-red-900/30 bg-red-500/5 text-center py-6 space-y-2">
          <span className="text-2xl">🏁</span>
          <p className="text-sm font-semibold text-red-400">This tournament has concluded.</p>
          <p className="text-xs text-slate-400">Check the results section below.</p>
        </div>
      )}
      <TournamentResults tournament={tournament} />
    </div>
  )
}

// ─── Copy Button ───────────────────────────────────────────────────────────────
function CopyButton({ text }) {
  const [copied, setCopied] = React.useState(false)
  function handleCopy() {
    navigator.clipboard.writeText(text || '').then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`text-[11px] px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 ${
        copied
          ? 'bg-emerald-600/30 text-emerald-300 ring-1 ring-emerald-600/50'
          : 'bg-slate-800 text-slate-300 ring-1 ring-slate-700 hover:bg-slate-700'
      }`}
    >
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  )
}

// ─── Room Code Card ────────────────────────────────────────────────────────────
function RoomCodeCard({ tournamentId, hasJoined }) {
  const [roomCode, setRoomCode] = React.useState(undefined)
  const [showPassword, setShowPassword] = React.useState(false)

  React.useEffect(() => {
    async function fetchRoom() {
      const { data } = await supabasePlayer
        .from('room_codes')
        .select('room_id, room_password, is_revealed')
        .eq('tournament_id', tournamentId)
        .is('match_id', null)
        .maybeSingle()
      setRoomCode(data || null)
    }
    fetchRoom()

    const channel = supabasePlayer
      .channel(`room_codes:single:${tournamentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_codes',
          filter: `tournament_id=eq.${tournamentId}`,
        },
        (payload) => {
          const row = payload.new
          if (row) {
            setRoomCode(row)
          } else if (payload.eventType === 'DELETE') {
            setRoomCode(null)
          }
        }
      )
      .subscribe()

    return () => { supabasePlayer.removeChannel(channel) }
  }, [tournamentId])

  // ── Loading state ──
  if (roomCode === undefined) {
    return (
      <div className="card space-y-2" id="tournament-room">
        <div className="flex items-center gap-2">
          <span className="text-base">🎮</span>
          <p className="text-xs font-semibold text-slate-300">Room Details</p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-500 animate-pulse">
          <div className="h-3 w-3 rounded-full border-2 border-slate-600 border-t-amber-400 animate-spin" />
          Loading…
        </div>
      </div>
    )
  }

  // ── Not registered — locked teaser ──
  if (!hasJoined) {
    return (
      <div className="card space-y-3 border border-slate-700/60" id="tournament-room">
        <div className="flex items-center gap-2">
          <span className="text-base">🎮</span>
          <p className="text-xs font-semibold text-slate-300">Room Details</p>
          <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-500 font-semibold uppercase tracking-wide">🔒 Registered Only</span>
        </div>
        <div className="rounded-xl bg-slate-900/60 ring-1 ring-slate-700/60 p-3 space-y-3 select-none">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-wide text-slate-600">Room ID</p>
              <p className="font-mono text-sm font-bold text-slate-700 tracking-widest">• • • • • • • •</p>
            </div>
            <div className="text-[11px] px-3 py-1.5 rounded-lg bg-slate-800/50 text-slate-600 ring-1 ring-slate-700/40 cursor-not-allowed">Copy</div>
          </div>
          <div className="border-t border-slate-800" />
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-wide text-slate-600">Password</p>
              <p className="font-mono text-sm font-bold text-slate-700 tracking-widest">• • • • • •</p>
            </div>
            <div className="text-[11px] px-3 py-1.5 rounded-lg bg-slate-800/50 text-slate-600 ring-1 ring-slate-700/40 cursor-not-allowed">Copy</div>
          </div>
        </div>
        <p className="text-[11px] text-slate-500 text-center">Register for this tournament to see room details.</p>
      </div>
    )
  }

  // ── Registered but no room added yet ──
  if (!roomCode) {
    return (
      <div className="card space-y-2" id="tournament-room">
        <div className="flex items-center gap-2">
          <span className="text-base">🎮</span>
          <p className="text-xs font-semibold text-slate-300">Room Details</p>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed">Room details haven't been added yet. Check back closer to match time.</p>
      </div>
    )
  }

  // ── Room added but not yet revealed ──
  if (!roomCode.is_revealed) {
    return (
      <div className="card space-y-3 border border-amber-700/40 bg-amber-500/5" id="tournament-room">
        <div className="flex items-center gap-2">
          <span className="text-base">🎮</span>
          <p className="text-xs font-semibold text-amber-300">Room Details</p>
          <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-amber-600/20 text-amber-400 font-semibold uppercase tracking-wide animate-pulse">⏳ Pending</span>
        </div>
        <div className="rounded-xl bg-slate-900/60 ring-1 ring-amber-700/30 p-3 space-y-3 select-none">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-wide text-slate-500">Room ID</p>
              <p className="font-mono text-sm font-bold text-slate-600 tracking-widest">• • • • • • • •</p>
            </div>
            <div className="text-[11px] px-3 py-1.5 rounded-lg bg-slate-800/50 text-slate-600 ring-1 ring-slate-700/40 cursor-not-allowed">Copy</div>
          </div>
          <div className="border-t border-slate-800" />
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-wide text-slate-500">Password</p>
              <p className="font-mono text-sm font-bold text-slate-600 tracking-widest">• • • • • •</p>
            </div>
            <div className="text-[11px] px-3 py-1.5 rounded-lg bg-slate-800/50 text-slate-600 ring-1 ring-slate-700/40 cursor-not-allowed">Copy</div>
          </div>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">Room code is ready — it will appear here the instant the organiser reveals it. Stay on this page.</p>
      </div>
    )
  }

  // ── Revealed — show room ID and password ──
  return (
    <div className="card space-y-3 border border-emerald-700/40 bg-emerald-500/5" id="tournament-room">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-base">🎮</span>
          <p className="text-xs font-semibold text-emerald-300">Room Details</p>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-600/20 text-emerald-300 font-semibold uppercase tracking-wide">🟢 Live</span>
      </div>
      <p className="text-[11px] text-slate-400">Share only with your registered teammates.</p>
      <div className="rounded-xl bg-slate-950/60 ring-1 ring-emerald-700/30 p-3 space-y-3">
        {/* Room ID */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-0.5">Room ID</p>
            <span className="font-mono text-sm font-bold text-slate-50 tracking-wider select-all break-all">
              {roomCode.room_id}
            </span>
          </div>
          <CopyButton text={roomCode.room_id} />
        </div>
        <div className="border-t border-slate-800" />
        {/* Password */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-0.5">Password</p>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-slate-50 tracking-wider select-all break-all">
                {showPassword ? roomCode.room_password : '•'.repeat(Math.min((roomCode.room_password || '').length || 6, 12))}
              </span>
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                className="text-slate-500 hover:text-slate-300 transition-colors shrink-0"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          <CopyButton text={roomCode.room_password} />
        </div>
      </div>
    </div>
  )
}

// ─── Long Tournament Panel ────────────────────────────────────────────────────
function LongTournamentPanel({ tournamentId, myReg, totalRounds }) {
  const [bracket, setBracket] = React.useState(null)
  const [matches, setMatches] = React.useState(null)
  const [myMatch, setMyMatch] = React.useState(null)
  const [mySlot, setMySlot] = React.useState(null)
  const [roomCode, setRoomCode] = React.useState(undefined)
  const [matchScores, setMatchScores] = React.useState(null)
  const [roundOverview, setRoundOverview] = React.useState(null)
  const [roundHistory, setRoundHistory] = React.useState({})
  const [leaderboard, setLeaderboard] = React.useState(null)
  const [loading, setLoading] = React.useState(true)
  const [lastUpdated, setLastUpdated] = React.useState(null)
  const [historyOpen, setHistoryOpen] = React.useState(false)
  const [leaderboardOpen, setLeaderboardOpen] = React.useState(false)
  const [eliminated, setEliminated] = React.useState(false)

  async function loadAll() {
    const { data: bkt } = await supabasePlayer
      .from('long_brackets')
      .select('id, current_round')
      .eq('tournament_id', tournamentId)
      .maybeSingle()

    if (!bkt) { setLoading(false); setLastUpdated(new Date()); return }
    setBracket(bkt)

    const { data: allMatches } = await supabasePlayer
      .from('long_br_matches')
      .select('id, match_number, round_number, status')
      .eq('bracket_id', bkt.id)
      .eq('round_number', bkt.current_round)
      .order('match_number', { ascending: true })

    setMatches(allMatches || [])

    let foundMatch = null
    let foundSlot = null

    if (allMatches?.length && myReg?.team_name) {
      const matchIds = allMatches.map(m => m.id)

      const { data: allScoreRows } = await supabasePlayer
        .from('long_br_match_scores')
        .select('id, match_id, team_name, kills, position, points, player_names, created_at')
        .in('match_id', matchIds)
        .order('created_at', { ascending: true })

      if (allScoreRows?.length) {
        const byMatch = {}
        for (const s of allScoreRows) {
          if (!byMatch[s.match_id]) byMatch[s.match_id] = []
          byMatch[s.match_id].push(s)
        }
        setRoundOverview(byMatch)

        const myScoreRow = allScoreRows.find(s => s.team_name === myReg.team_name)
        if (myScoreRow) {
          foundMatch = allMatches.find(m => m.id === myScoreRow.match_id) || null
          const teamsInMyMatch = byMatch[myScoreRow.match_id] || []
          const slotIdx = teamsInMyMatch.findIndex(s => s.team_name === myReg.team_name)
          foundSlot = slotIdx >= 0 ? slotIdx + 1 : null
        }
      } else {
        const byMatch = {}
        for (const m of allMatches) { byMatch[m.id] = [] }
        setRoundOverview(byMatch)
      }
    } else if (allMatches?.length) {
      const matchIds = allMatches.map(m => m.id)
      const { data: allScoreRows } = await supabasePlayer
        .from('long_br_match_scores')
        .select('id, match_id, team_name, kills, position, points, player_names, created_at')
        .in('match_id', matchIds)
        .order('created_at', { ascending: true })

      if (allScoreRows?.length) {
        const byMatch = {}
        for (const s of allScoreRows) {
          if (!byMatch[s.match_id]) byMatch[s.match_id] = []
          byMatch[s.match_id].push(s)
        }
        setRoundOverview(byMatch)
      } else {
        const byMatch = {}
        for (const m of allMatches) { byMatch[m.id] = [] }
        setRoundOverview(byMatch)
      }
    }

    // Room code for my match
    if (foundMatch) {
      const { data: rc } = await supabasePlayer
        .from('room_codes')
        .select('room_id, room_password, is_revealed')
        .eq('tournament_id', tournamentId)
        .eq('match_id', foundMatch.id)
        .maybeSingle()
      setRoomCode(rc || null)
      setMyMatch(foundMatch)
      setMySlot(foundSlot)
    } else {
      setRoomCode(null)
    }

    // Check elimination
    if (myReg?.team_name && bkt.current_round > 1) {
      const { data: prevScores } = await supabasePlayer
        .from('long_br_match_scores')
        .select('team_name, position')
        .eq('team_name', myReg.team_name)
        .limit(1)
      if (!prevScores?.length) setEliminated(true)
    }

    // Leaderboard
    const { data: lbRows } = await supabasePlayer
      .from('long_br_leaderboard')
      .select('team_name, total_points, total_kills, rounds_played, rank')
      .eq('bracket_id', bkt.id)
      .order('rank', { ascending: true })
      .limit(20)
    setLeaderboard(lbRows || [])

    setLoading(false)
    setLastUpdated(new Date())
  }

  React.useEffect(() => {
    loadAll()
    const interval = setInterval(loadAll, 30000)
    return () => clearInterval(interval)
  }, [tournamentId, myReg?.team_name])

  if (loading) {
    return (
      <div className="card space-y-3">
        <div className="flex items-center gap-2 text-xs text-slate-500 animate-pulse">
          <div className="h-3 w-3 rounded-full border-2 border-slate-600 border-t-amber-400 animate-spin" />
          Loading bracket…
        </div>
      </div>
    )
  }

  if (!bracket) {
    return (
      <div className="card space-y-2">
        <p className="text-xs font-semibold text-slate-300">🏆 Long Tournament</p>
        <p className="text-[11px] text-slate-500">Bracket hasn't been created yet. Check back soon.</p>
      </div>
    )
  }

  const matchList = matches || []
  const myMatchData = myMatch
    ? (roundOverview?.[myMatch.id] || []).sort((a, b) => (b.points ?? 0) - (a.points ?? 0))
    : null

  return (
    <div className="space-y-4">
      {/* Round header */}
      <div className="card space-y-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-amber-300">🏆 Round {bracket.current_round}{totalRounds ? ` of ${totalRounds}` : ''}</p>
          {lastUpdated && (
            <span className="text-[10px] text-slate-600">
              Updated {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={loadAll}
          className="text-[10px] text-sky-400 hover:text-sky-300 transition-colors"
        >
          ↻ Refresh
        </button>
      </div>

      {/* My match room code */}
      {myReg && myMatchData !== null && (
        <div className="card space-y-2 border border-sky-800/40 bg-sky-500/5">
          <p className="text-xs font-semibold text-sky-300">
            🎮 Your Match{mySlot ? ` — Slot #${mySlot}` : ''}
          </p>
          {eliminated ? (
            <p className="text-[11px] text-red-400">You have been eliminated from this tournament.</p>
          ) : roomCode === undefined ? (
            <div className="flex items-center gap-2 text-[11px] text-slate-500 animate-pulse">
              <div className="h-3 w-3 rounded-full border-2 border-slate-600 border-t-amber-400 animate-spin" />Loading…
            </div>
          ) : !roomCode ? (
            <p className="text-[11px] text-slate-500">Room details will appear here when released.</p>
          ) : !roomCode.is_revealed ? (
            <p className="text-[11px] text-amber-400 animate-pulse">⏳ Room code is set — waiting for organiser to reveal it.</p>
          ) : (
            <div className="rounded-xl bg-slate-950/60 ring-1 ring-emerald-700/30 p-3 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-0.5">Room ID</p>
                  <span className="font-mono text-sm font-bold text-slate-50 tracking-wider select-all break-all">{roomCode.room_id}</span>
                </div>
                <CopyButton text={roomCode.room_id} />
              </div>
              <div className="border-t border-slate-800" />
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-0.5">Password</p>
                  <span className="font-mono text-sm font-bold text-slate-50 tracking-wider select-all break-all">{roomCode.room_password}</span>
                </div>
                <CopyButton text={roomCode.room_password} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Round overview — all matches */}
      {roundOverview && matchList.length > 0 && (
        <div className="card space-y-3">
          <p className="text-xs font-semibold text-slate-300">📊 Round {bracket.current_round} — Match Overview</p>
          <div className="space-y-3">
            {matchList.map((m, mi) => {
              const teams = (roundOverview[m.id] || []).sort((a, b) => (b.points ?? 0) - (a.points ?? 0))
              return (
                <div key={m.id} className="rounded-lg bg-slate-900/60 ring-1 ring-slate-700/60 overflow-hidden">
                  <div className="px-3 py-2 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Match {m.match_number}</span>
                    <span className={`text-[10px] font-semibold uppercase tracking-wide ${m.status === 'completed' ? 'text-emerald-400' : m.status === 'live' ? 'text-amber-400 animate-pulse' : 'text-slate-500'}`}>
                      {m.status}
                    </span>
                  </div>
                  {teams.length === 0 ? (
                    <p className="px-3 py-3 text-[11px] text-slate-600">No scores yet.</p>
                  ) : (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-[9px] uppercase tracking-wide text-slate-600">
                          <th className="px-3 py-1.5 text-left w-6">#</th>
                          <th className="px-3 py-1.5 text-left">Team</th>
                          <th className="px-3 py-1.5 text-center">K</th>
                          <th className="px-3 py-1.5 text-right">Pts</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {teams.map((t, ti) => (
                          <tr key={t.team_name + ti} className={`${t.team_name === myReg?.team_name ? 'bg-sky-500/10' : ''}`}>
                            <td className="px-3 py-1.5 text-slate-500 tabular-nums">{ti + 1}</td>
                            <td className={`px-3 py-1.5 font-medium truncate ${t.team_name === myReg?.team_name ? 'text-sky-300' : 'text-slate-200'}`}>
                              {t.team_name}
                              {t.team_name === myReg?.team_name && <span className="ml-1 text-[9px] text-sky-500">(you)</span>}
                            </td>
                            <td className="px-3 py-1.5 text-center text-slate-400 tabular-nums">{t.kills ?? '—'}</td>
                            <td className="px-3 py-1.5 text-right font-bold tabular-nums text-sky-300">{t.points != null ? Number(t.points).toFixed(1) : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Leaderboard */}
      {leaderboard && leaderboard.length > 0 && (
        <div className="card space-y-3">
          <button
            type="button"
            className="w-full flex items-center gap-2 text-left"
            onClick={() => setLeaderboardOpen(o => !o)}
          >
            <p className="text-xs font-semibold text-amber-300 flex-1">🏅 Overall Leaderboard</p>
            <svg className={`w-4 h-4 text-slate-400 transition-transform ${leaderboardOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          {leaderboardOpen && (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-700 text-[9px] uppercase tracking-wide text-slate-500">
                  <th className="pb-2 text-left w-6">#</th>
                  <th className="pb-2 text-left">Team</th>
                  <th className="pb-2 text-center">Kills</th>
                  <th className="pb-2 text-center">Rds</th>
                  <th className="pb-2 text-right">Pts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {leaderboard.map((row, i) => (
                  <tr key={row.team_name + i} className={`${row.team_name === myReg?.team_name ? 'bg-sky-500/10' : i === 0 ? 'bg-amber-500/10' : ''}`}>
                    <td className="py-1.5 pr-2 text-slate-500 tabular-nums">{row.rank ?? i + 1}</td>
                    <td className={`py-1.5 font-medium ${row.team_name === myReg?.team_name ? 'text-sky-300' : i === 0 ? 'text-amber-300' : 'text-slate-100'}`}>
                      {row.team_name}
                    </td>
                    <td className="py-1.5 text-center text-slate-400 tabular-nums">{row.total_kills}</td>
                    <td className="py-1.5 text-center text-slate-400 tabular-nums">{row.rounds_played}</td>
                    <td className={`py-1.5 text-right font-bold tabular-nums ${i === 0 ? 'text-amber-300' : 'text-sky-300'}`}>
                      {Number(row.total_points).toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Registration Form ────────────────────────────────────────────────────────
function RegistrationForm({ tournament, player, profile, onSuccess }) {
  const tc = teammateCount(tournament.team_size)
  const [teamName, setTeamName] = React.useState('')
  const [teammates, setTeammates] = React.useState(Array(tc).fill(''))
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState(null)

  function setTeammate(i, val) {
    setTeammates(prev => { const next = [...prev]; next[i] = val; return next })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const hostUid = profile.game_uid
      const hostName = profile.in_game_name

      // Check if already registered
      const { data: existing } = await supabasePlayer
        .from('tournament_registrations')
        .select('id, status')
        .eq('tournament_id', tournament.id)
        .eq('host_uid', hostUid)
        .not('status', 'in', '("rejected","cancelled")')
        .maybeSingle()

      if (existing) {
        setError('You are already registered for this tournament.')
        setSubmitting(false)
        return
      }

      // Check capacity
      const { count: regCount } = await supabasePlayer
        .from('tournament_registrations')
        .select('id', { count: 'exact', head: true })
        .eq('tournament_id', tournament.id)
        .not('status', 'in', '("rejected","cancelled")')

      if (tournament.max_teams && regCount >= tournament.max_teams) {
        setError('This tournament is full.')
        setSubmitting(false)
        return
      }

      const finalTeamName = tc > 0 ? teamName.trim() : (hostName || hostUid)

      if (tc > 0 && !finalTeamName) {
        setError('Please enter a team name.')
        setSubmitting(false)
        return
      }

      // Insert registration
      const { data: reg, error: regErr } = await supabasePlayer
        .from('tournament_registrations')
        .insert({
          tournament_id: tournament.id,
          host_uid: hostUid,
          team_name: finalTeamName,
          status: 'pending',
        })
        .select('id')
        .single()

      if (regErr) throw regErr

      // Insert members
      const memberRows = [
        { registration_id: reg.id, slot: 0, game_uid: hostUid, in_game_name: hostName || hostUid },
        ...teammates
          .map((uid, i) => uid.trim() ? { registration_id: reg.id, slot: i + 1, game_uid: uid.trim(), in_game_name: null } : null)
          .filter(Boolean),
      ]

      // Fetch teammate names
      const teammateUids = teammates.filter(u => u.trim())
      if (teammateUids.length > 0) {
        const { data: profiles } = await supabasePlayer
          .from('game_profiles')
          .select('game_uid, in_game_name')
          .in('game_uid', teammateUids)
          .eq('status', 'verified')
        const nameMap = {}
        for (const p of (profiles || [])) nameMap[p.game_uid] = p.in_game_name
        for (const m of memberRows) {
          if (m.slot > 0 && nameMap[m.game_uid]) m.in_game_name = nameMap[m.game_uid]
        }
      }

      const { error: memErr } = await supabasePlayer
        .from('registration_members')
        .insert(memberRows)

      if (memErr) throw memErr

      onSuccess()
    } catch (err) {
      console.error('Registration error:', err)
      setError(err.message || 'Registration failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {tc > 0 && (
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 mb-1">Team Name</label>
          <input
            type="text"
            className="input w-full"
            placeholder="Enter your team name"
            value={teamName}
            onChange={e => setTeamName(e.target.value)}
            required
            maxLength={32}
          />
        </div>
      )}

      <div>
        <label className="block text-[11px] font-semibold text-slate-400 mb-1">Your UID (Host)</label>
        <div className="input bg-slate-900/60 text-slate-400 cursor-not-allowed select-none">
          {profile.game_uid} — {profile.in_game_name}
        </div>
      </div>

      {tc > 0 && (
        <div className="space-y-2">
          <label className="block text-[11px] font-semibold text-slate-400">
            Teammate UIDs <span className="text-slate-600 font-normal">(optional)</span>
          </label>
          {teammates.map((val, i) => (
            <TeammateInput
              key={i}
              index={i}
              value={val}
              onChange={v => setTeammate(i, v)}
              hostUid={profile.game_uid}
              gameId={tournament.game_id}
            />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-500/10 ring-1 ring-red-700/40 px-3 py-2">
          <p className="text-[11px] text-red-400">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="btn-primary w-full"
      >
        {submitting ? (
          <span className="flex items-center justify-center gap-2">
            <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            Registering…
          </span>
        ) : 'Register Now'}
      </button>
    </form>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TournamentDetails() {
  const { id } = useParams()
  const { player } = usePlayer()
  const { games } = useGame()

  const [tournament, setTournament] = React.useState(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(null)

  // My registration state
  const [myReg, setMyReg] = React.useState(undefined) // undefined = loading, null = not registered
  const [myProfile, setMyProfile] = React.useState(null)
  const [showRegForm, setShowRegForm] = React.useState(false)

  // ── Fetch tournament ──
  React.useEffect(() => {
    async function load() {
      setLoading(true)
      const { data, error } = await supabasePlayer
        .from('tournaments')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !data) {
        setError('Tournament not found.')
        setLoading(false)
        return
      }
      setTournament(data)
      setLoading(false)
    }
    load()
  }, [id])

  // ── Realtime tournament updates ──
  React.useEffect(() => {
    if (!id) return
    const channel = supabasePlayer
      .channel(`tournament:${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tournaments', filter: `id=eq.${id}` },
        (payload) => { if (payload.new) setTournament(payload.new) }
      )
      .subscribe()
    return () => { supabasePlayer.removeChannel(channel) }
  }, [id])

  // ── Check my registration ──
  React.useEffect(() => {
    async function checkMyReg() {
      if (!player?.id || !id) { setMyReg(null); return }

      // Get player's game profile for this tournament's game
      const { data: tourData } = await supabasePlayer
        .from('tournaments')
        .select('game_id')
        .eq('id', id)
        .maybeSingle()

      const gameId = tourData?.game_id

      let profile = null
      if (gameId) {
        const { data: gp } = await supabasePlayer
          .from('game_profiles')
          .select('game_uid, in_game_name, status')
          .eq('player_id', player.id)
          .eq('game_id', gameId)
          .eq('status', 'verified')
          .maybeSingle()
        profile = gp
      } else {
        const { data: gp } = await supabasePlayer
          .from('game_profiles')
          .select('game_uid, in_game_name, status, game_id')
          .eq('player_id', player.id)
          .eq('status', 'verified')
          .maybeSingle()
        profile = gp
      }

      setMyProfile(profile)

      if (!profile?.game_uid) { setMyReg(null); return }

      // Check as host
      const { data: asHost } = await supabasePlayer
        .from('tournament_registrations')
        .select('id, team_name, status, host_uid')
        .eq('tournament_id', id)
        .eq('host_uid', profile.game_uid)
        .not('status', 'in', '("rejected","cancelled")')
        .maybeSingle()

      if (asHost) { setMyReg(asHost); return }

      // Check as teammate member
      const { data: asMember } = await supabasePlayer
        .from('registration_members')
        .select('registration_id, game_uid')
        .eq('game_uid', profile.game_uid)
        .limit(20)

      if (asMember?.length) {
        const regIds = asMember.map(m => m.registration_id)
        const { data: regRows } = await supabasePlayer
          .from('tournament_registrations')
          .select('id, team_name, status, host_uid')
          .in('id', regIds)
          .eq('tournament_id', id)
          .not('status', 'in', '("rejected","cancelled")')
          .maybeSingle()

        if (regRows) { setMyReg(regRows); return }
      }

      setMyReg(null)
    }
    checkMyReg()
  }, [player?.id, id])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="flex items-center gap-2 text-sm text-slate-500 animate-pulse">
          <div className="h-4 w-4 rounded-full border-2 border-slate-600 border-t-amber-400 animate-spin" />
          Loading tournament…
        </div>
      </div>
    )
  }

  if (error || !tournament) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-center space-y-2">
          <p className="text-sm text-red-400">{error || 'Tournament not found.'}</p>
        </div>
      </div>
    )
  }

  const game = games?.find(g => g.id === tournament.game_id)
  const isBR = tournament.mode === 'br'
  const isLong = tournament.format === 'long'
  const isEnded = tournament.status === 'ended'
  const isLive = tournament.status === 'live'
  const isOpen = tournament.status === 'open'
  const isClosed = tournament.status === 'registration_closed'

  const hasJoined = !!myReg
  const myRegLoading = myReg === undefined

  const prizeEntries = tournament.prize_pool
    ? Object.entries(tournament.prize_pool).filter(([, v]) => v)
    : []

  const statusConfig = {
    open: { label: 'Registration Open', color: 'text-emerald-400', bg: 'bg-emerald-500/10 ring-emerald-700/40' },
    registration_closed: { label: 'Registration Closed', color: 'text-amber-400', bg: 'bg-amber-500/10 ring-amber-700/40' },
    live: { label: '🔴 Live Now', color: 'text-red-400', bg: 'bg-red-500/10 ring-red-700/40' },
    ended: { label: 'Ended', color: 'text-slate-400', bg: 'bg-slate-800 ring-slate-700' },
    cancelled: { label: 'Cancelled', color: 'text-slate-500', bg: 'bg-slate-900 ring-slate-800' },
  }
  const sc = statusConfig[tournament.status] || statusConfig.open

  return (
    <div className="max-w-lg mx-auto px-3 py-6 space-y-4">

      {/* Header card */}
      <section className="card space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 flex-1 min-w-0">
            <h1 className="text-base font-bold text-slate-50 leading-tight">{tournament.name}</h1>
            <div className="flex flex-wrap items-center gap-2">
              {game && (
                <span className="text-[10px] font-semibold text-slate-400 bg-slate-800 rounded-full px-2 py-0.5">
                  {game.name}
                </span>
              )}
              <span className="text-[10px] font-semibold text-slate-400 bg-slate-800 rounded-full px-2 py-0.5">
                {getModeLabel(tournament.mode)}
              </span>
              {tournament.team_size && (
                <span className="text-[10px] font-semibold text-slate-400 bg-slate-800 rounded-full px-2 py-0.5">
                  {teamSizeLabel(tournament.team_size)}
                </span>
              )}
              {isLong && (
                <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 ring-1 ring-amber-700/40 rounded-full px-2 py-0.5">
                  Multi-Round
                </span>
              )}
            </div>
          </div>
          <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full ring-1 shrink-0 ${sc.color} ${sc.bg}`}>
            {sc.label}
          </span>
        </div>

        {tournament.description && (
          <p className="text-[11px] text-slate-400 leading-relaxed">{tournament.description}</p>
        )}

        {/* Meta info */}
        <div className="grid grid-cols-2 gap-2">
          {tournament.start_time && (
            <div className="rounded-lg bg-slate-900/60 px-3 py-2 space-y-0.5">
              <p className="text-[9px] uppercase tracking-wide text-slate-600">Starts</p>
              <p className="text-[11px] text-slate-300 font-medium">{fmtDate(tournament.start_time)}</p>
            </div>
          )}
          {tournament.max_teams && (
            <div className="rounded-lg bg-slate-900/60 px-3 py-2 space-y-0.5">
              <p className="text-[9px] uppercase tracking-wide text-slate-600">Max Teams</p>
              <p className="text-[11px] text-slate-300 font-medium tabular-nums">{tournament.max_teams}</p>
            </div>
          )}
          {tournament.entry_fee != null && (
            <div className="rounded-lg bg-slate-900/60 px-3 py-2 space-y-0.5">
              <p className="text-[9px] uppercase tracking-wide text-slate-600">Entry Fee</p>
              <p className="text-[11px] text-slate-300 font-medium">
                {tournament.entry_fee === 0 ? 'Free' : `₹${tournament.entry_fee}`}
              </p>
            </div>
          )}
          {isLong && tournament.total_rounds && (
            <div className="rounded-lg bg-slate-900/60 px-3 py-2 space-y-0.5">
              <p className="text-[9px] uppercase tracking-wide text-slate-600">Total Rounds</p>
              <p className="text-[11px] text-slate-300 font-medium tabular-nums">{tournament.total_rounds}</p>
            </div>
          )}
        </div>

        {/* Prize pool */}
        {prizeEntries.length > 0 && (
          <div className="rounded-lg bg-amber-500/5 ring-1 ring-amber-700/30 px-3 py-2.5 space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-400">🏆 Prize Pool</p>
            <div className="flex flex-wrap gap-3">
              {prizeEntries.map(([place, prize]) => (
                <div key={place} className="text-center">
                  <p className="text-[10px] text-slate-500 capitalize">{place}</p>
                  <p className="text-xs font-bold text-amber-300">{prize}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── RESULTS (when ended or results exist) ── */}
      <ResultsPanel tournament={tournament} />

      {/* ── ROOM CODE (for non-long tournaments — always shown so registered players can see it) ── */}
      {!isLong && (
        <RoomCodeCard
          tournamentId={tournament.id}
          hasJoined={hasJoined}
        />
      )}

      {/* ── BR RULES (for BR mode tournaments only) ── */}
      {isBR && <BRRulesSection gameName={game?.name} />}

      {/* ── LONG TOURNAMENT PANEL ── */}
      {isLong && (isLive || isEnded) && myReg !== undefined && (
        <LongTournamentPanel
          tournamentId={tournament.id}
          myReg={myReg}
          totalRounds={tournament.total_rounds}
        />
      )}

      {/* ── REGISTRATION SECTION ──
          FIXED: Show registration status for ALL statuses (including ended).
          Only hide the Register button/form when tournament is ended or not open.
          Registered players always see their registration info.
      ── */}
      {!isLong && (
        <section className="card space-y-4" id="tournament-register">
          {myRegLoading ? (
            <div className="flex items-center gap-2 text-[11px] text-slate-500 animate-pulse">
              <div className="h-3 w-3 rounded-full border-2 border-slate-600 border-t-amber-400 animate-spin" />
              Checking registration…
            </div>
          ) : hasJoined ? (
            /* ── Already registered — always show this regardless of status ── */
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-base">✅</span>
                <p className="text-xs font-semibold text-emerald-300">You're registered!</p>
              </div>
              <div className="rounded-lg bg-slate-900/60 ring-1 ring-slate-700/40 px-3 py-2.5 space-y-1">
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="text-slate-500">Team</span>
                  <span className="text-slate-200 font-semibold">{myReg.team_name}</span>
                </div>
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="text-slate-500">Status</span>
                  <span className={`font-semibold ${myReg.status === 'confirmed' ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {myReg.status === 'confirmed' ? '✅ Confirmed' : '⏳ Pending'}
                  </span>
                </div>
              </div>
            </div>
          ) : isEnded ? (
            /* ── Tournament ended, not registered ── */
            <p className="text-xs text-slate-500 text-center py-2">This tournament has ended.</p>
          ) : isOpen ? (
            /* ── Registration open, not yet registered ── */
            !player ? (
              <div className="space-y-2 text-center py-2">
                <p className="text-xs text-slate-400">Sign in to register for this tournament.</p>
              </div>
            ) : !myProfile ? (
              <div className="space-y-2">
                <p className="text-xs text-slate-400">
                  You need a verified game profile to register. Please add and verify your {game?.name || 'game'} UID in your profile.
                </p>
              </div>
            ) : showRegForm ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-slate-300">Register for Tournament</p>
                  <button type="button" onClick={() => setShowRegForm(false)} className="text-[11px] text-slate-500 hover:text-slate-300">Cancel</button>
                </div>
                <RegistrationForm
                  tournament={tournament}
                  player={player}
                  profile={myProfile}
                  onSuccess={() => {
                    setShowRegForm(false)
                    setMyReg(undefined)
                  }}
                />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-300">Join this tournament</p>
                  <p className="text-[11px] text-slate-500">
                    Playing as: <span className="text-slate-300 font-medium">{myProfile.in_game_name}</span>
                    <span className="text-slate-600"> · {myProfile.game_uid}</span>
                  </p>
                </div>
                <button type="button" onClick={() => setShowRegForm(true)} className="btn-primary w-full">
                  Register Now
                </button>
              </div>
            )
          ) : isClosed ? (
            /* ── Registration closed, not registered ── */
            <p className="text-xs text-slate-500 text-center py-2">Registration is closed for this tournament.</p>
          ) : null}
        </section>
      )}

      {/* ── REGISTERED TEAMS LIST ── */}
      <RegisteredTeamsList tournamentId={tournament.id} teamSize={tournament.team_size} />

    </div>
  )
}
