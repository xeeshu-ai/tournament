import React from 'react'
import { useParams } from 'react-router-dom'
import { supabasePlayer } from '../../lib/supabaseClient'
import { usePlayer } from '../../lib/PlayerContext'
import { useGame } from '../../lib/GameContext'
import { getModeLabel } from '../../lib/constants'

// ─── Teammate UID Validator ────────────────────────────────────────────────────
function useUidValidation(uid, hostUid) {
  const [state, setState] = React.useState({ status: 'idle', name: null })
  React.useEffect(() => {
    const trimmed = uid.trim()
    if (!trimmed) { setState({ status: 'idle', name: null }); return }
    if (trimmed === hostUid) { setState({ status: 'invalid', name: null, msg: "That's your own UID" }); return }
    setState({ status: 'checking', name: null })
    const timer = setTimeout(async () => {
      const { data } = await supabasePlayer
        .from('game_profiles')
        .select('in_game_name, status')
        .eq('game_uid', trimmed)
        .maybeSingle()
      if (data && data.status === 'verified') {
        setState({ status: 'valid', name: data.in_game_name })
      } else if (data && data.status !== 'verified') {
        setState({ status: 'invalid', name: null, msg: 'Player UID not verified yet' })
      } else {
        setState({ status: 'invalid', name: null, msg: 'No player found with this UID' })
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [uid, hostUid])
  return state
}

function TeammateInput({ index, value, onChange, hostUid }) {
  const v = useUidValidation(value, hostUid)
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-2">
        <input
          type="text"
          className={`input flex-1 ${v.status === 'valid' ? 'border-emerald-500/60' : v.status === 'invalid' ? 'border-red-500/60' : ''}`}
          placeholder={`Teammate ${index + 1} UID`}
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
  const [brScores, setBrScores] = React.useState(null)
  const [loading, setLoading] = React.useState(false)

  const isBR = tournament.mode === 'br'
  const isCSorLW = tournament.mode === 'cs' || tournament.mode === 'lw'
  const isSingleBR = isBR

  React.useEffect(() => {
    if (!isBR || isSingleBR) return
    async function fetchBrScores() {
      setLoading(true)
      const { data: bracket } = await supabasePlayer
        .from('long_brackets').select('id').eq('tournament_id', tournament.id).maybeSingle()
      if (!bracket) { setLoading(false); return }
      const { data: match } = await supabasePlayer
        .from('long_br_matches').select('id').eq('bracket_id', bracket.id)
        .order('round_number', { ascending: true }).limit(1).maybeSingle()
      if (!match) { setLoading(false); return }
      const { data: scores } = await supabasePlayer
        .from('long_br_match_scores')
        .select('team_name, kills, position, points, player_names')
        .eq('match_id', match.id).order('points', { ascending: false })
      setBrScores(scores || [])
      setLoading(false)
    }
    fetchBrScores()
  }, [tournament.id, isBR, isSingleBR])

  if (loading) {
    return (
      <section className="card flex items-center gap-3 py-5 text-xs text-slate-400">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-amber-400" />
        <p>Loading results…</p>
      </section>
    )
  }

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

      {isSingleBR && Array.isArray(tournament.single_br_results) && tournament.single_br_results.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-700 text-[10px] uppercase tracking-wide text-slate-500">
                <th className="pb-2 text-left w-8">#</th>
                <th className="pb-2 text-left">Team</th>
                <th className="pb-2 text-center">Kills</th>
                <th className="pb-2 text-center">Position</th>
                <th className="pb-2 text-right">Points</th>
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

      {isSingleBR && (!tournament.single_br_results || tournament.single_br_results.length === 0) && !tournament.winner_text && (
        <p className="text-xs text-slate-400">Results will be posted shortly.</p>
      )}

      {isBR && !isSingleBR && brScores?.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-700 text-[10px] uppercase tracking-wide text-slate-500">
                <th className="pb-2 text-left w-8">#</th>
                <th className="pb-2 text-left">Team</th>
                <th className="pb-2 text-center">Kills</th>
                <th className="pb-2 text-center">Position</th>
                <th className="pb-2 text-right">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {brScores.map((row, i) => (
                <tr key={row.team_name} className={i === 0 ? 'bg-amber-500/10' : ''}>
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

      {isBR && !isSingleBR && brScores !== null && brScores.length === 0 && !tournament.winner_text && (
        <p className="text-xs text-slate-400">Results will be posted shortly.</p>
      )}

      {isCSorLW && tournament.cs_lw_results && (() => {
        const matches = tournament.cs_lw_results?.matches || []
        if (!matches.length) return <p className="text-xs text-slate-400">Results will be posted shortly.</p>
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
    </section>
  )
}

// ─── Results Panel (shown when results exist OR tournament ended) ─────────────
function ResultsPanel({ tournament }) {
  const isBR = tournament.mode === 'br'
  const isCSorLW = tournament.mode === 'cs' || tournament.mode === 'lw'

  const hasResults =
    (isBR && Array.isArray(tournament.single_br_results) && tournament.single_br_results.length > 0) ||
    (isBR && tournament.winner_text) ||
    (isCSorLW && tournament.cs_lw_results?.matches?.length > 0) ||
    (isCSorLW && tournament.winner_text) ||
    tournament.winner_text

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

// ─── Room Code Card ───────────────────────────────────────────────────────────
function RoomCodeCard({ tournamentId }) {
  const [roomCode, setRoomCode] = React.useState(undefined)

  React.useEffect(() => {
    async function fetchRoom() {
      const { data } = await supabasePlayer
        .from('room_codes').select('room_id, room_password, is_revealed')
        .eq('tournament_id', tournamentId).maybeSingle()
      setRoomCode(data || null)
    }
    fetchRoom()
    const interval = setInterval(fetchRoom, 15_000)
    return () => clearInterval(interval)
  }, [tournamentId])

  if (roomCode === undefined) {
    return (
      <div className="card space-y-2" id="tournament-room">
        <p className="text-xs font-semibold text-slate-300">🎮 Room Details <span className="text-[10px] text-amber-400 font-normal ml-1">(Host only)</span></p>
        <p className="text-[11px] text-slate-500 animate-pulse">Loading…</p>
      </div>
    )
  }
  if (!roomCode) {
    return (
      <div className="card space-y-2" id="tournament-room">
        <p className="text-xs font-semibold text-slate-300">🎮 Room Details <span className="text-[10px] text-amber-400 font-normal ml-1">(Host only)</span></p>
        <p className="text-[11px] text-slate-500">Room details not added yet. Check back later.</p>
      </div>
    )
  }
  if (!roomCode.is_revealed) {
    return (
      <div className="card space-y-2 border border-amber-700/40 bg-amber-500/5" id="tournament-room">
        <p className="text-xs font-semibold text-amber-300">🎮 Room Details <span className="text-[10px] font-normal ml-1 text-amber-400">(Host only)</span></p>
        <p className="text-[11px] text-slate-400 leading-relaxed">Room code added but not yet revealed. Keep this page open and refresh later.</p>
      </div>
    )
  }
  return (
    <div className="card space-y-3 border border-emerald-700/40 bg-emerald-500/5" id="tournament-room">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-emerald-300">🎮 Room Details <span className="text-[10px] font-normal ml-1 text-amber-400">(Host only)</span></p>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-600/20 text-emerald-300 font-semibold uppercase tracking-wide">Live</span>
      </div>
      <p className="text-[11px] text-slate-400">Share carefully with your teammates only.</p>
      <div className="rounded-xl bg-slate-950/50 ring-1 ring-white/10 p-3 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-slate-500">Room ID</p>
            <span className="font-mono text-sm font-bold text-slate-50 tracking-wider select-all">{roomCode.room_id}</span>
          </div>
          <button type="button" className="btn-secondary text-[11px] px-3 py-1.5" onClick={() => navigator.clipboard.writeText(roomCode.room_id || '')}>Copy</button>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-slate-500">Password</p>
            <span className="font-mono text-sm font-bold text-slate-50 tracking-wider select-all">{roomCode.room_password}</span>
          </div>
          <button type="button" className="btn-secondary text-[11px] px-3 py-1.5" onClick={() => navigator.clipboard.writeText(roomCode.room_password || '')}>Copy</button>
        </div>
      </div>
    </div>
  )
}

// ─── Registration Form ────────────────────────────────────────────────────────
function RegistrationForm({ tournament, player, onRegistered }) {
  const tc = teammateCount(tournament.team_size)
  const [teamName, setTeamName] = React.useState('')
  const [teammates, setTeammates] = React.useState(Array(tc).fill(''))
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState(null)

  function setTm(i, v) { setTeammates(prev => { const n = [...prev]; n[i] = v; return n }) }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (!teamName.trim()) { setError('Team name is required.'); return }
    if (tc > 0 && teammates.some(t => !t.trim())) { setError('All teammate UIDs are required.'); return }
    const allUids = [player.game_uid, ...teammates.map(t => t.trim())]
    if (new Set(allUids).size !== allUids.length) { setError('Duplicate UIDs found.'); return }
    setSubmitting(true)
    const { data: existing } = await supabasePlayer
      .from('tournament_registrations')
      .select('id')
      .eq('tournament_id', tournament.id)
      .eq('host_uid', player.game_uid)
      .maybeSingle()
    if (existing) { setError('You have already registered for this tournament.'); setSubmitting(false); return }
    const { data: reg, error: regErr } = await supabasePlayer
      .from('tournament_registrations')
      .insert({
        tournament_id: tournament.id,
        team_name: teamName.trim(),
        host_uid: player.game_uid,
        status: 'pending',
      })
      .select('id')
      .single()
    if (regErr) { setError(regErr.message); setSubmitting(false); return }
    if (tc > 0) {
      const memberRows = [
        { registration_id: reg.id, slot: 0, game_uid: player.game_uid, in_game_name: player.in_game_name },
        ...teammates.map((uid, i) => ({ registration_id: reg.id, slot: i + 1, game_uid: uid.trim(), in_game_name: null })),
      ]
      const { error: memErr } = await supabasePlayer.from('registration_members').insert(memberRows)
      if (memErr) { setError(memErr.message); setSubmitting(false); return }
    }
    setSubmitting(false)
    if (onRegistered) onRegistered()
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      <p className="text-xs font-semibold text-slate-300">📝 Register Your Team</p>
      {error && <p className="text-[11px] text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>}
      <div className="space-y-1">
        <label className="text-[11px] text-slate-400">Team Name</label>
        <input
          type="text"
          className="input"
          placeholder="Enter team name"
          value={teamName}
          onChange={e => setTeamName(e.target.value)}
          maxLength={32}
        />
      </div>
      {tc > 0 && teammates.map((val, i) => (
        <TeammateInput key={i} index={i} value={val} onChange={v => setTm(i, v)} hostUid={player.game_uid} />
      ))}
      <button type="submit" className="btn-primary w-full" disabled={submitting}>
        {submitting ? 'Registering…' : 'Register'}
      </button>
    </form>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TournamentDetails() {
  // FIX: route is /:gameId/tournaments/:id — param is 'id' not 'tournamentId'
  const { id: tournamentId } = useParams()
  const { player } = usePlayer()
  const { game } = useGame()

  const [tournament, setTournament] = React.useState(null)
  const [loading, setLoading] = React.useState(true)
  const [myReg, setMyReg] = React.useState(undefined)
  const [registered, setRegistered] = React.useState(false)

  async function loadTournament() {
    const { data, error } = await supabasePlayer
      .from('tournaments')
      .select('*')
      .eq('id', tournamentId)
      .maybeSingle()
    if (error) console.error(error)
    setTournament(data || null)
    setLoading(false)
  }

  async function checkMyReg() {
    if (!player?.game_uid) { setMyReg(null); return }
    const { data } = await supabasePlayer
      .from('tournament_registrations')
      .select('id, team_name, status')
      .eq('tournament_id', tournamentId)
      .eq('host_uid', player.game_uid)
      .maybeSingle()
    setMyReg(data || null)
  }

  React.useEffect(() => {
    loadTournament()
    checkMyReg()
  }, [tournamentId, player?.game_uid])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] gap-3 text-xs text-slate-400">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-600 border-t-amber-400" />
        Loading tournament…
      </div>
    )
  }

  if (!tournament) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3 text-xs text-slate-400">
        <span className="text-3xl">🔍</span>
        <p>Tournament not found.</p>
      </div>
    )
  }

  const regOpen = tournament.registration_status === 'open'
  const isEnded = tournament.status === 'ended'
  const canRegister = regOpen && !isEnded && player && !myReg

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="card space-y-2">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-base font-bold text-slate-50 leading-tight">{tournament.title}</h1>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide shrink-0 ${
            isEnded ? 'bg-red-600/20 text-red-400' :
            tournament.status === 'live' ? 'bg-emerald-600/20 text-emerald-400' :
            'bg-slate-700 text-slate-400'
          }`}>
            {isEnded ? 'Ended' : tournament.status}
          </span>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400">
          <span>🎮 {getModeLabel(tournament.mode)}</span>
          {tournament.team_size && <span>👥 {teamSizeLabel(tournament.team_size)}</span>}
          {tournament.prize_pool && <span>🏆 ₹{tournament.prize_pool}</span>}
          {tournament.entry_fee != null && (
            <span>{tournament.entry_fee === 0 ? '🆓 Free Entry' : `💰 ₹${tournament.entry_fee} entry`}</span>
          )}
          {tournament.start_time && <span>📅 {fmtDate(tournament.start_time)}</span>}
          {tournament.max_teams && <span>🔢 Max {tournament.max_teams} teams</span>}
        </div>

        {tournament.description && (
          <p className="text-[11px] text-slate-400 leading-relaxed mt-1">{tournament.description}</p>
        )}
      </div>

      {/* Results panel — shown as soon as results exist, regardless of status */}
      <ResultsPanel tournament={tournament} />

      {/* Room code — only for registered players in active tournaments */}
      {myReg && !isEnded && <RoomCodeCard tournamentId={tournamentId} />}

      {/* Registration */}
      {canRegister && (
        <RegistrationForm
          tournament={tournament}
          player={player}
          onRegistered={() => { setRegistered(true); checkMyReg(); loadTournament() }}
        />
      )}

      {registered && (
        <div className="card border border-emerald-700/40 bg-emerald-500/5 text-center py-4 space-y-1">
          <span className="text-2xl">🎉</span>
          <p className="text-sm font-semibold text-emerald-300">Registration successful!</p>
          <p className="text-[11px] text-slate-400">You will receive room details before the match starts.</p>
        </div>
      )}

      {myReg && !registered && (
        <div className={`card space-y-1 border ${myReg.status === 'confirmed' ? 'border-emerald-700/40 bg-emerald-500/5' : 'border-amber-700/40 bg-amber-500/5'}`}>
          <p className="text-xs font-semibold text-slate-300">
            {myReg.status === 'confirmed' ? '✅ You are registered' : '⏳ Registration pending'}
          </p>
          <p className="text-[11px] text-slate-400">
            Team: <span className="font-semibold text-slate-200">{myReg.team_name}</span>
          </p>
          {myReg.status !== 'confirmed' && (
            <p className="text-[11px] text-amber-400">Awaiting confirmation from the organiser.</p>
          )}
        </div>
      )}

      {!player && regOpen && !isEnded && (
        <div className="card border border-slate-700 text-center py-4 space-y-1">
          <p className="text-xs text-slate-400">Sign in to register for this tournament.</p>
        </div>
      )}

      {/* Registered teams list */}
      <RegisteredTeamsList tournamentId={tournamentId} teamSize={tournament.team_size} />
    </div>
  )
}
