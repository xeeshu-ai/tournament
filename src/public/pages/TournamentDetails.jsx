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
  const isSingle = tournament.type === 'single'
  const isSingleBR = isSingle && isBR

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

function EndedTournamentPanel({ tournament }) {
  return (
    <div className="space-y-4" id="tournament-ended">
      <div className="card border border-red-900/30 bg-red-500/5 text-center py-6 space-y-2">
        <span className="text-2xl">🏁</span>
        <p className="text-sm font-semibold text-red-400">This tournament has concluded.</p>
        <p className="text-xs text-slate-400">Check the results section below.</p>
      </div>
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

// ─── Already Registered Panel ─────────────────────────────────────────────────
function AlreadyRegisteredPanel({ tournament, reg, gameProfile, onUpdated }) {
  const isHost = gameProfile?.game_uid && reg.host_uid === gameProfile.game_uid
  const canEdit = isHost
  const teammateNeed = teammateCount(tournament.team_size)

  const [members, setMembers] = React.useState([])
  React.useEffect(() => {
    async function loadMembers() {
      if (!reg.id) return
      const { data } = await supabasePlayer
        .from('registration_members').select('slot, game_uid, in_game_name')
        .eq('registration_id', reg.id).order('slot', { ascending: true })
      setMembers(data || [])
    }
    loadMembers()
  }, [reg.id])

  const teammates = members.filter(m => m.slot > 0)

  const [editing, setEditing] = React.useState(false)
  const [teamName, setTeamName] = React.useState(reg.team_name || '')
  const [editTeammates, setEditTeammates] = React.useState(
    Array.from({ length: teammateNeed }, (_, i) => teammates[i]?.game_uid || '')
  )
  const [saving, setSaving] = React.useState(false)
  const [saveErr, setSaveErr] = React.useState('')

  React.useEffect(() => {
    setTeamName(reg.team_name || '')
    setEditTeammates(Array.from({ length: teammateNeed }, (_, i) => teammates[i]?.game_uid || ''))
    setEditing(false)
    setSaveErr('')
  }, [reg.id, reg.team_name, teammateNeed])

  async function saveChanges(e) {
    e.preventDefault()
    setSaveErr('')
    if (!isHost) return
    const cleanTeam = teamName.trim()
    if (!cleanTeam) return setSaveErr('Team name is required.')
    const cleanTeammates = editTeammates.map(v => v.trim())
    const dup = cleanTeammates.filter(Boolean).find((v, idx) => cleanTeammates.indexOf(v) !== idx)
    if (dup) return setSaveErr(`❌ Duplicate teammate UID: ${dup}`)
    if (gameProfile?.game_uid && cleanTeammates.includes(gameProfile.game_uid))
      return setSaveErr(`❌ You cannot enter your own UID in teammate fields.`)

    setSaving(true)
    for (let i = 0; i < cleanTeammates.length; i++) {
      const uid = cleanTeammates[i]
      if (!uid) { setSaveErr(`❌ Teammate ${i + 1} UID is required.`); setSaving(false); return }
      const { data: p } = await supabasePlayer
        .from('game_profiles').select('in_game_name, status').eq('game_uid', uid).maybeSingle()
      if (!p) { setSaveErr(`❌ Teammate ${i + 1}: No player with UID ${uid}`); setSaving(false); return }
      if (p.status !== 'verified') { setSaveErr(`❌ Teammate ${i + 1}: "${p.in_game_name}" not verified yet.`); setSaving(false); return }
    }

    const { error: regErr } = await supabasePlayer
      .from('tournament_registrations').update({ team_name: cleanTeam }).eq('id', reg.id)
    if (regErr) { setSaveErr(regErr.message || 'Failed to save.'); setSaving(false); return }

    await supabasePlayer.from('registration_members').delete()
      .eq('registration_id', reg.id).gt('slot', 0)

    if (cleanTeammates.length > 0) {
      const inserts = await Promise.all(cleanTeammates.map(async (uid, i) => {
        const { data: p } = await supabasePlayer
          .from('game_profiles').select('in_game_name').eq('game_uid', uid).maybeSingle()
        return { registration_id: reg.id, slot: i + 1, game_uid: uid, in_game_name: p?.in_game_name || null }
      }))
      await supabasePlayer.from('registration_members').insert(inserts)
    }

    setSaving(false)
    setEditing(false)
    await onUpdated()
  }

  return (
    <div className="space-y-4">
      <div className="card space-y-4" id="tournament-registration">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Your registration</p>
            <h3 className="text-base font-semibold text-slate-100 mt-1">{reg.team_name}</h3>
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-400">✅ Joined</span>
        </div>
        <div className="space-y-2 text-xs text-slate-300">
          <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-900/50 px-3 py-2">
            <span className="text-slate-400">Host UID</span>
            <span className="font-mono text-slate-100">{reg.host_uid}</span>
          </div>
          {teammates.map((m, idx) => (
            <div key={m.game_uid} className="flex items-center justify-between gap-3 rounded-lg bg-slate-900/40 px-3 py-2">
              <span className="text-slate-400">Teammate {idx + 1}{m.in_game_name ? ` (${m.in_game_name})` : ''}</span>
              <span className="font-mono text-slate-100">{m.game_uid}</span>
            </div>
          ))}
          {teammateNeed > 0 && teammates.length === 0 && (
            <p className="text-[11px] text-slate-500 px-1">No teammates added yet.</p>
          )}
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <button type="button" className="btn-secondary text-xs" onClick={() => setEditing(v => !v)}>
              {editing ? 'Cancel edit' : 'Edit registration'}
            </button>
          </div>
        )}
        {editing && (
          <form className="space-y-3 border-t border-white/10 pt-4" onSubmit={saveChanges}>
            <div>
              <label className="label">Team name</label>
              <input className="input" value={teamName} onChange={e => setTeamName(e.target.value)} />
            </div>
            <div className="space-y-2">
              {Array.from({ length: teammateNeed }).map((_, i) => (
                <TeammateInput key={i} index={i}
                  value={editTeammates[i] || ''}
                  onChange={(val) => { const c = [...editTeammates]; c[i] = val; setEditTeammates(c) }}
                  hostUid={gameProfile?.game_uid || ''}
                />
              ))}
            </div>
            {saveErr && <p className="text-xs text-red-400">{saveErr}</p>}
            <button disabled={saving} className="btn-primary text-xs" type="submit">
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </form>
        )}
      </div>
      {isHost && <RoomCodeCard tournamentId={tournament.id} />}
      {!isHost && (
        <div className="card border border-slate-700 bg-slate-900/40 space-y-2">
          <p className="text-xs font-semibold text-slate-200">Room details</p>
          <p className="text-[11px] text-slate-400">Only the host account can view room details. Contact your team host.</p>
        </div>
      )}
    </div>
  )
}

// ─── Register Panel ───────────────────────────────────────────────────────────
function RegisterPanel({ tournament, profile, gameProfile, allRegs, onRegistered }) {
  const teammateNeed = teammateCount(tournament.team_size)
  const hasFee = Number(tournament.entry_fee) > 0

  const [teamName, setTeamName] = React.useState('')
  const [teammates, setTeammates] = React.useState(Array.from({ length: teammateNeed }, () => ''))
  const [saving, setSaving] = React.useState(false)
  const [err, setErr] = React.useState('')
  const [done, setDone] = React.useState(false)

  React.useEffect(() => {
    setTeammates(Array.from({ length: teammateNeed }, () => ''))
  }, [teammateNeed])

  async function submit(e) {
    e.preventDefault()
    setErr('')
    const cleanTeam = teamName.trim()
    if (!cleanTeam) return setErr('Team name is required.')
    if (!gameProfile?.game_uid) return setErr('Your in-game UID is missing from your profile.')

    const cleanTeammates = teammates.map(v => v.trim())
    if (teammateNeed > 0 && cleanTeammates.some(v => !v)) return setErr('All teammate UIDs are required.')
    const dup = cleanTeammates.find((v, idx) => cleanTeammates.indexOf(v) !== idx)
    if (dup) return setErr(`❌ Duplicate teammate UID: ${dup}`)
    if (cleanTeammates.includes(gameProfile.game_uid)) return setErr(`❌ You cannot enter your own UID as a teammate.`)

    setSaving(true)
    for (let i = 0; i < cleanTeammates.length; i++) {
      const uid = cleanTeammates[i]
      const { data: p } = await supabasePlayer
        .from('game_profiles').select('in_game_name, status').eq('game_uid', uid).maybeSingle()
      if (!p) { setErr(`❌ Teammate ${i + 1}: No player with UID ${uid}`); setSaving(false); return }
      if (p.status !== 'verified') { setErr(`❌ Teammate ${i + 1}: "${p.in_game_name}" not verified yet.`); setSaving(false); return }
    }

    const allUids = [gameProfile.game_uid, ...cleanTeammates].filter(Boolean)
    for (const reg of (allRegs || [])) {
      const { data: existingMembers } = await supabasePlayer
        .from('registration_members').select('game_uid').eq('registration_id', reg.id)
      const takenUids = (existingMembers || []).map(m => m.game_uid)
      const conflict = allUids.find(u => takenUids.includes(u))
      if (conflict) { setErr(`❌ UID already registered: ${conflict}`); setSaving(false); return }
    }

    const { data: newReg, error: regErr } = await supabasePlayer
      .from('tournament_registrations')
      .insert({
        tournament_id: tournament.id,
        host_uid: gameProfile.game_uid,
        team_name: cleanTeam,
        status: 'confirmed',
        host_player_id: profile?.id || null,
      })
      .select('id').single()

    if (regErr || !newReg) { setErr(regErr?.message || 'Registration failed.'); setSaving(false); return }

    const { data: hostGP } = await supabasePlayer
      .from('game_profiles').select('in_game_name').eq('game_uid', gameProfile.game_uid).maybeSingle()

    const memberRows = [
      { registration_id: newReg.id, slot: 0, game_uid: gameProfile.game_uid, in_game_name: hostGP?.in_game_name || null, player_id: profile?.id || null },
      ...await Promise.all(cleanTeammates.map(async (uid, i) => {
        const { data: p } = await supabasePlayer
          .from('game_profiles').select('in_game_name').eq('game_uid', uid).maybeSingle()
        return { registration_id: newReg.id, slot: i + 1, game_uid: uid, in_game_name: p?.in_game_name || null, player_id: null }
      }))
    ]

    const { error: membersErr } = await supabasePlayer.from('registration_members').insert(memberRows)
    if (membersErr) {
      await supabasePlayer.from('tournament_registrations').delete().eq('id', newReg.id)
      setErr(membersErr.message || 'Failed to save team members.')
      setSaving(false)
      return
    }

    setSaving(false)
    setDone(true)
    onRegistered()
  }

  if (done) {
    return (
      <div className="card border border-emerald-700/40 bg-emerald-500/5 text-center py-6 space-y-2">
        <span className="text-2xl">🎉</span>
        <p className="text-sm font-semibold text-emerald-400">You're in!</p>
        <p className="text-xs text-slate-400">
          {hasFee ? 'Complete your payment to secure your slot. Room details will be revealed before the match.' : 'Your slot is confirmed. Room details will be revealed before the match.'}
        </p>
      </div>
    )
  }

  return (
    <div className="card space-y-4" id="tournament-register">
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-wide">Join Tournament</p>
        <h3 className="text-sm font-semibold text-slate-100 mt-0.5">Register your team</h3>
      </div>
      <form className="space-y-3" onSubmit={submit}>
        <div>
          <label className="label">Team / Player name</label>
          <input className="input" placeholder="Enter your team name" value={teamName} onChange={e => setTeamName(e.target.value)} />
        </div>
        <div>
          <label className="label">Your UID (Host)</label>
          <input className="input opacity-60 cursor-not-allowed" readOnly value={gameProfile?.game_uid || 'No game profile found'} />
        </div>
        {Array.from({ length: teammateNeed }).map((_, i) => (
          <TeammateInput key={i} index={i}
            value={teammates[i] || ''}
            onChange={(val) => { const c = [...teammates]; c[i] = val; setTeammates(c) }}
            hostUid={gameProfile?.game_uid || ''}
          />
        ))}
        {hasFee && (
          <div className="rounded-xl bg-amber-500/10 ring-1 ring-amber-700/40 px-3 py-3 space-y-1">
            <p className="text-xs font-semibold text-amber-300">Entry Fee: ₹{tournament.entry_fee}</p>
            <p className="text-[11px] text-slate-400 leading-relaxed">Register now then complete payment. Your slot is held once you register.</p>
          </div>
        )}
        {err && <p className="text-xs text-red-400">{err}</p>}
        <button disabled={saving || !gameProfile?.game_uid} className="btn-primary text-xs w-full" type="submit">
          {saving ? 'Registering…' : hasFee ? 'Register & Pay' : 'Register'}
        </button>
      </form>
    </div>
  )
}

// ─── Main TournamentDetails page ─────────────────────────────────────────────
export default function TournamentDetails() {
  const { id } = useParams()
  // profile = player row, loading = auth/profile loading
  const { profile, loading: playerLoading } = usePlayer()
  // gameProfile comes from GameContext — has game_uid, status, etc.
  const { gameProfile, gpLoading } = useGame()

  const [tournament, setTournament] = React.useState(null)
  const [allRegs, setAllRegs] = React.useState([])
  const [myReg, setMyReg] = React.useState(undefined)
  const [loading, setLoading] = React.useState(true)
  const [notFound, setNotFound] = React.useState(false)

  async function loadData() {
    setLoading(true)
    const { data: t, error } = await supabasePlayer
      .from('tournaments').select('*').eq('id', id).maybeSingle()

    if (error || !t) { setNotFound(true); setLoading(false); return }
    setTournament(t)

    const { data: regs } = await supabasePlayer
      .from('tournament_registrations')
      .select('id, team_name, host_uid, status, created_at, host_player_id')
      .eq('tournament_id', id)

    setAllRegs(regs || [])

    if (gameProfile?.game_uid) {
      const mine = (regs || []).find(r =>
        r.host_uid === gameProfile.game_uid ||
        (profile?.id && r.host_player_id === profile.id)
      )
      setMyReg(mine || null)
    } else {
      setMyReg(null)
    }

    setLoading(false)
  }

  React.useEffect(() => {
    // Wait for both player auth AND game profile to finish loading
    if (!playerLoading && !gpLoading) loadData()
  }, [id, playerLoading, gpLoading, gameProfile?.game_uid])

  // Show spinner while auth or game profile is still resolving
  if (loading || playerLoading || gpLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] gap-3 text-xs text-slate-400">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-amber-400" />
        Loading tournament…
      </div>
    )
  }

  if (notFound || !tournament) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3 text-center px-4">
        <span className="text-3xl">🔍</span>
        <p className="text-sm font-semibold text-slate-300">Tournament not found</p>
        <p className="text-xs text-slate-500">This tournament may have been removed or the link is incorrect.</p>
      </div>
    )
  }

  const isArchived = tournament.is_archived === true
  const isEnded = tournament.status === 'ended' || tournament.status === 'cancelled' || isArchived
  const regOpen = tournament.registration_status === 'open'
  const activeRegs = allRegs.filter(r => r.status !== 'cancelled' && r.status !== 'rejected')
  const isFull = tournament.max_slots && activeRegs.length >= tournament.max_slots

  // Only verified game profile can register
  const isProfileVerified = gameProfile?.status === 'verified'
  const hasGameUid = !!gameProfile?.game_uid
  const canRegister = !isEnded && regOpen && !myReg && hasGameUid && isProfileVerified && !isFull

  return (
    <div className="space-y-4 pb-10">

      {/* ── Header card ── */}
      <div className="card space-y-3">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-base font-bold text-slate-100 leading-snug flex-1">{tournament.title}</h1>
          <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full shrink-0 ${
            tournament.status === 'active' ? 'bg-emerald-600/20 text-emerald-400'
            : tournament.status === 'ended' ? 'bg-slate-700/40 text-slate-400'
            : 'bg-amber-600/20 text-amber-400'
          }`}>
            {tournament.status}
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {tournament.mode_label && (
            <span className="text-[10px] rounded-full bg-slate-800 text-slate-300 px-2 py-0.5 font-medium">{tournament.mode_label}</span>
          )}
          {tournament.format_label && (
            <span className="text-[10px] rounded-full bg-slate-800 text-slate-300 px-2 py-0.5 font-medium">{tournament.format_label}</span>
          )}
          {tournament.map && (
            <span className="text-[10px] rounded-full bg-slate-800 text-slate-400 px-2 py-0.5">{tournament.map}</span>
          )}
          {tournament.registration_status && (
            <span className={`text-[10px] rounded-full px-2 py-0.5 font-semibold ${
              tournament.registration_status === 'open'
                ? 'bg-emerald-600/20 text-emerald-400'
                : 'bg-red-600/20 text-red-400'
            }`}>
              Reg: {tournament.registration_status}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px]">
          {tournament.team_size !== undefined && (
            <div className="rounded-lg bg-slate-900/50 px-3 py-2">
              <p className="text-slate-500 text-[10px] uppercase tracking-wide mb-0.5">Mode</p>
              <p className="text-slate-200 font-medium">{teamSizeLabel(tournament.team_size)}</p>
            </div>
          )}
          {tournament.entry_fee !== undefined && (
            <div className="rounded-lg bg-slate-900/50 px-3 py-2">
              <p className="text-slate-500 text-[10px] uppercase tracking-wide mb-0.5">Entry Fee</p>
              <p className="text-slate-200 font-medium">{Number(tournament.entry_fee) === 0 ? 'Free' : `₹${tournament.entry_fee}`}</p>
            </div>
          )}
          {tournament.prize_text && (
            <div className="rounded-lg bg-slate-900/50 px-3 py-2">
              <p className="text-slate-500 text-[10px] uppercase tracking-wide mb-0.5">Prize</p>
              <p className="text-slate-200 font-medium">{tournament.prize_text}</p>
            </div>
          )}
          {tournament.max_slots && (
            <div className="rounded-lg bg-slate-900/50 px-3 py-2">
              <p className="text-slate-500 text-[10px] uppercase tracking-wide mb-0.5">Slots</p>
              <p className="text-slate-200 font-medium tabular-nums">
                {activeRegs.length} / {tournament.max_slots}
              </p>
            </div>
          )}
          {tournament.start_time && (
            <div className="rounded-lg bg-slate-900/50 px-3 py-2 col-span-2">
              <p className="text-slate-500 text-[10px] uppercase tracking-wide mb-0.5">Starts</p>
              <p className="text-slate-200 font-medium">{fmtDate(tournament.start_time)}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Ended state ── */}
      {isEnded && <EndedTournamentPanel tournament={tournament} />}

      {/* ── Registration / My Reg ── */}
      {!isEnded && (
        <>
          {myReg !== undefined && myReg !== null && (
            <AlreadyRegisteredPanel
              tournament={tournament}
              reg={myReg}
              gameProfile={gameProfile}
              onUpdated={loadData}
            />
          )}

          {canRegister && (
            <RegisterPanel
              tournament={tournament}
              profile={profile}
              gameProfile={gameProfile}
              allRegs={allRegs}
              onRegistered={loadData}
            />
          )}

          {/* No game profile at all */}
          {!gameProfile && !myReg && regOpen && (
            <div className="card border border-slate-700 bg-slate-900/40 space-y-2 text-center py-5">
              <p className="text-xs font-semibold text-slate-300">Set up your game profile to register</p>
              <p className="text-[11px] text-slate-500">Go to Profile and link your in-game account first.</p>
            </div>
          )}

          {/* Profile exists but pending verification */}
          {gameProfile && !isProfileVerified && !myReg && regOpen && (
            <div className="card border border-amber-700/40 bg-amber-500/5 space-y-2 text-center py-5">
              <span className="text-2xl">⏳</span>
              <p className="text-xs font-semibold text-amber-300">Profile under review</p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Your game profile is pending admin verification. Once verified, you can register for tournaments.
              </p>
            </div>
          )}

          {isFull && !myReg && (
            <div className="card border border-red-900/30 bg-red-500/5 text-center py-5">
              <p className="text-xs font-semibold text-red-400">Tournament Full</p>
              <p className="text-[11px] text-slate-400 mt-1">All slots have been filled.</p>
            </div>
          )}

          {!regOpen && !myReg && !isEnded && (
            <div className="card border border-slate-700 bg-slate-900/40 text-center py-5">
              <p className="text-xs font-semibold text-slate-300">Registrations Closed</p>
              <p className="text-[11px] text-slate-500 mt-1">Registration is not open for this tournament.</p>
            </div>
          )}
        </>
      )}

      {/* ── Registered Teams List — always visible ── */}
      <RegisteredTeamsList tournamentId={tournament.id} teamSize={tournament.team_size} />

    </div>
  )
}
