import React from 'react'
import { useParams } from 'react-router-dom'
import { supabasePlayer } from '../../lib/supabaseClient'
import { usePlayer } from '../../lib/PlayerContext'
import { useGame } from '../../lib/GameContext'
import { getModeLabel } from '../../lib/constants'

// ─── Teammate UID Validator ────────────────────────────────────────────────────────────────────────
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
        .single()
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

// ─── Single validated teammate input ─────────────────────────────────────────────────────────────────
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

// ─── helpers ───────────────────────────────────────────────────────────────────────────────
function teammateCount(teamSize) {
  if (teamSize === null || teamSize === undefined) return 0
  const n = Number(teamSize)
  if (!isNaN(n)) {
    if (n <= 1) return 0
    if (n === 2) return 1
    return 3
  }
  const s = String(teamSize).toLowerCase()
  if (s.includes('duo') || s.includes('2v2')) return 1
  if (s.includes('squad') || s === '3' || s === '4') return 3
  return 0
}

function modeBadgeLabel(t) {
  if (!t) return ''
  return [getModeLabel(t), t.format_label].filter(Boolean).join(' • ')
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
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function findUidConflict(registrations, uidsToCheck) {
  const uids = uidsToCheck.filter(Boolean).map((u) => String(u).trim())
  if (!uids.length) return null
  for (const reg of registrations) {
    const takenUids = [
      reg.host_uid,
      reg.teammate_uid_1,
      reg.teammate_uid_2,
      reg.teammate_uid_3,
    ].filter(Boolean).map(String)
    for (const uid of uids) {
      if (takenUids.includes(uid)) return uid
    }
  }
  return null
}

// ─── Tournament Results Component ─────────────────────────────────────────────────────────────────

function TournamentResults({ tournament }) {
  const [brScores, setBrScores] = React.useState(null)
  const [loading, setLoading] = React.useState(false)

  const isBR = tournament.mode === 'br'
  const isCSorLW = tournament.mode === 'cs' || tournament.mode === 'lw'
  const isSingle = tournament.type === 'single'
  const isSingleBR = isSingle && isBR

  React.useEffect(() => {
    // Single-match BR: results are stored directly on tournament.single_br_results
    // Long tournament BR: fetch from long_brackets -> long_br_matches -> long_br_match_scores
    if (!isBR || isSingleBR) return
    async function fetchBrScores() {
      setLoading(true)
      const { data: bracket } = await supabasePlayer
        .from('long_brackets')
        .select('id')
        .eq('tournament_id', tournament.id)
        .maybeSingle()

      if (!bracket) { setLoading(false); return }

      const { data: match } = await supabasePlayer
        .from('long_br_matches')
        .select('id')
        .eq('bracket_id', bracket.id)
        .order('round_number', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (!match) { setLoading(false); return }

      const { data: scores } = await supabasePlayer
        .from('long_br_match_scores')
        .select('team_name, kills, position, points, player_names')
        .eq('match_id', match.id)
        .order('points', { ascending: false })

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
    <section className="card space-y-4 border border-amber-700/40 bg-amber-500/5">
      <div className="flex items-center gap-2">
        <span className="text-lg">🏆</span>
        <h2 className="text-sm font-semibold text-amber-300">Final Results</h2>
        <span className="ml-auto text-[10px] rounded-full bg-red-600/20 text-red-400 px-2 py-0.5 font-semibold uppercase tracking-wide">
          Match Ended
        </span>
      </div>

      {tournament.winner_text && (
        <div className="rounded-lg bg-amber-500/10 px-3 py-3 ring-1 ring-amber-700/50">
          <p className="text-xs text-amber-200 whitespace-pre-line">{tournament.winner_text}</p>
        </div>
      )}

      {/* Single-match BR: read directly from tournament.single_br_results */}
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
                <tr key={row.team_name + i} className={`transition-colors ${i === 0 ? 'bg-amber-500/10' : ''}`}>
                  <td className="py-2 pr-2">
                    {i === 0 ? <span className="text-amber-400 font-bold">🥇</span>
                      : i === 1 ? <span className="text-slate-300 font-bold">🥈</span>
                      : i === 2 ? <span className="text-orange-400 font-bold">🥉</span>
                      : <span className="text-slate-500">{i + 1}</span>}
                  </td>
                  <td className={`py-2 font-semibold ${i === 0 ? 'text-amber-300' : 'text-slate-100'}`}>
                    <div>{row.team_name}</div>
                    {row.player_names?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {row.player_names.map((name, ni) => (
                          <span key={ni} className="text-[10px] text-slate-400 font-normal">{name}</span>
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

      {/* Long-tournament BR: read from long_brackets tables */}
      {isBR && !isSingleBR && brScores && brScores.length > 0 && (
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
                <tr
                  key={row.team_name}
                  className={`transition-colors ${i === 0 ? 'bg-amber-500/10' : ''}`}
                >
                  <td className="py-2 pr-2">
                    {i === 0 ? (
                      <span className="text-amber-400 font-bold">🥇</span>
                    ) : i === 1 ? (
                      <span className="text-slate-300 font-bold">🥈</span>
                    ) : i === 2 ? (
                      <span className="text-orange-400 font-bold">🥉</span>
                    ) : (
                      <span className="text-slate-500">{i + 1}</span>
                    )}
                  </td>
                  <td className={`py-2 font-semibold ${i === 0 ? 'text-amber-300' : 'text-slate-100'}`}>
                    <div>{row.team_name}</div>
                    {row.player_names?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {row.player_names.map((name, ni) => (
                          <span key={ni} className="text-[10px] text-slate-400 font-normal">{name}</span>
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
        const results = tournament.cs_lw_results
        const matches = results?.matches || []
        if (!matches.length) return (
          <p className="text-xs text-slate-400">Results will be posted shortly.</p>
        )
        return (
          <div className="space-y-4">
            {matches.map((match, i) => (
              <div key={i} className="rounded-lg bg-slate-900/60 ring-1 ring-slate-700 overflow-hidden">
                <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-900/80 border-b border-slate-800">
                  Match {i + 1}
                </div>
                <div className="grid grid-cols-[1fr_auto_1fr] gap-2 px-3 py-3 text-xs items-start">
                  <div className={`space-y-1 ${match.winner_team === match.teamA?.name ? 'text-emerald-300' : 'text-slate-200'}`}>
                    <p className="font-semibold">{match.teamA?.name}</p>
                    <p className="text-[11px] text-slate-400">Rounds won: {match.teamA?.rounds_won ?? 0}</p>
                    <p className="text-[11px] text-slate-400">Kills: {match.teamA?.kills ?? 0}</p>
                    {Array.isArray(match.teamA?.players) && match.teamA.players.length > 0 && (
                      <div className="pt-1 space-y-0.5">
                        {match.teamA.players.map((p, idx) => (
                          <div key={idx} className="flex items-center justify-between gap-2 text-[10px] text-slate-400">
                            <span className="truncate">{p.name}</span>
                            <span className="tabular-nums">K {p.kills ?? 0} • D {p.deaths ?? 0}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-center justify-center gap-2 pt-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">VS</span>
                    <span className="text-[11px] text-amber-400 font-semibold">{match.winner_team ? `Winner: ${match.winner_team}` : '—'}</span>
                  </div>
                  <div className={`space-y-1 text-right ${match.winner_team === match.teamB?.name ? 'text-emerald-300' : 'text-slate-200'}`}>
                    <p className="font-semibold">{match.teamB?.name}</p>
                    <p className="text-[11px] text-slate-400">Rounds won: {match.teamB?.rounds_won ?? 0}</p>
                    <p className="text-[11px] text-slate-400">Kills: {match.teamB?.kills ?? 0}</p>
                    {Array.isArray(match.teamB?.players) && match.teamB.players.length > 0 && (
                      <div className="pt-1 space-y-0.5">
                        {match.teamB.players.map((p, idx) => (
                          <div key={idx} className="flex items-center justify-between gap-2 text-[10px] text-slate-400">
                            <span className="tabular-nums">K {p.kills ?? 0} • D {p.deaths ?? 0}</span>
                            <span className="truncate">{p.name}</span>
                          </div>
                        ))}
                      </div>
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

function EndedTournamentPanel({ tournament }) {
  return (
    <div className="space-y-4">
      <div className="card border border-red-900/30 bg-red-500/5 text-center py-6 space-y-2">
        <span className="text-2xl">🏁</span>
        <p className="text-sm font-semibold text-red-400">This tournament has concluded.</p>
        <p className="text-xs text-slate-400">
          This tournament has concluded. Check the results section below.
        </p>
      </div>
      <TournamentResults tournament={tournament} />
    </div>
  )
}

// ─── Room Code Card (host-only) ─────────────────────────────────────────────────────────────────────

function RoomCodeCard({ tournamentId }) {
  const [roomCode, setRoomCode] = React.useState(undefined)
  const [shown, setShown] = React.useState(false)

  React.useEffect(() => {
    async function fetchRoom() {
      const { data } = await supabasePlayer
        .from('room_codes')
        .select('room_id, room_password, is_revealed')
        .eq('tournament_id', tournamentId)
        .maybeSingle()
      setRoomCode(data || null)
      if (!data?.is_revealed) setShown(false)
    }
    fetchRoom()
    const interval = setInterval(fetchRoom, 15_000)
    return () => clearInterval(interval)
  }, [tournamentId])

  if (roomCode === undefined) {
    return (
      <div className="card space-y-2">
        <p className="text-xs font-semibold text-slate-300">🎮 Room Details <span className="text-[10px] text-amber-400 font-normal ml-1">(Host only)</span></p>
        <p className="text-[11px] text-slate-500 animate-pulse">Loading…</p>
      </div>
    )
  }

  if (!roomCode) {
    return (
      <div className="card space-y-2">
        <p className="text-xs font-semibold text-slate-300">🎮 Room Details <span className="text-[10px] text-amber-400 font-normal ml-1">(Host only)</span></p>
        <p className="text-[11px] text-slate-500">Room details have not been added yet. Please check again later.</p>
      </div>
    )
  }

  if (!roomCode.is_revealed) {
    return (
      <div className="card space-y-2 border border-amber-700/40 bg-amber-500/5">
        <p className="text-xs font-semibold text-amber-300">🎮 Room Details <span className="text-[10px] font-normal ml-1 text-amber-400">(Host only)</span></p>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          The admin has added the room code, but it hasn’t been revealed to players yet.
        </p>
        <p className="text-[11px] text-slate-500">Keep this page open and refresh later.</p>
      </div>
    )
  }

  return (
    <div className="card space-y-3 border border-emerald-700/40 bg-emerald-500/5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-emerald-300">🎮 Room Details <span className="text-[10px] font-normal ml-1 text-amber-400">(Host only)</span></p>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-600/20 text-emerald-300 font-semibold uppercase tracking-wide">Live</span>
      </div>
      <p className="text-[11px] text-slate-400">These room details are now visible. Share carefully with your teammates.</p>
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
      <button
        type="button"
        className="btn-primary text-xs"
        onClick={() => setShown(v => !v)}
      >
        {shown ? 'Hide from my screen' : 'Keep visible on my screen'}
      </button>
      {shown && (
        <p className="text-[11px] text-emerald-300/90">Room details pinned on screen for quick access.</p>
      )}
    </div>
  )
}

function AlreadyRegisteredPanel({ tournament, reg, gameProfile, onUpdated }) {
  const isHost = gameProfile?.game_uid && reg.host_uid === gameProfile.game_uid
  const canEdit = reg.status !== 'confirmed'
  const teammateNeed = teammateCount(tournament.team_size)

  const initialTeammates = React.useMemo(() => {
    const vals = [reg.teammate_uid_1 || '', reg.teammate_uid_2 || '', reg.teammate_uid_3 || '']
    return vals.slice(0, teammateNeed)
  }, [reg, teammateNeed])

  const [editing, setEditing] = React.useState(false)
  const [teamName, setTeamName] = React.useState(reg.team_name || '')
  const [teammates, setTeammates] = React.useState(initialTeammates)
  const [saving, setSaving] = React.useState(false)
  const [saveErr, setSaveErr] = React.useState('')

  React.useEffect(() => {
    setTeamName(reg.team_name || '')
    setTeammates(initialTeammates)
    setEditing(false)
    setSaveErr('')
  }, [reg.id, reg.team_name, initialTeammates])

  async function saveChanges(e) {
    e.preventDefault()
    setSaveErr('')
    if (!isHost) return
    const cleanTeam = teamName.trim()
    if (!cleanTeam) return setSaveErr('Team name is required.')

    const cleanTeammates = teammates.map(v => v.trim())

    const dup = cleanTeammates.filter(Boolean).find((v, idx) => cleanTeammates.indexOf(v) !== idx)
    if (dup) return setSaveErr(`❌ Duplicate teammate UID: ${dup}`)

    if (gameProfile?.game_uid && cleanTeammates.includes(gameProfile.game_uid)) {
      return setSaveErr(`❌ You cannot enter your own UID in teammate fields.`)
    }

    setSaving(true)

    for (let i = 0; i < cleanTeammates.length; i++) {
      const uid = cleanTeammates[i]
      if (!uid) {
        setSaveErr(`❌ Teammate ${i + 1} UID is required.`)
        setSaving(false)
        return
      }
      const { data: p } = await supabasePlayer
        .from('game_profiles')
        .select('in_game_name, status')
        .eq('game_uid', uid)
        .single()

      if (!p) { setSaveErr(`❌ Teammate ${i + 1}: No player found with UID ${uid}`); setSaving(false); return }
      if (p.status !== 'verified') { setSaveErr(`❌ Teammate ${i + 1}: Player \"${p.in_game_name}\" is not verified yet.`); setSaving(false); return }
    }

    const conflictUid = findUidConflict(
      (await supabasePlayer
        .from('tournament_registrations')
        .select('host_uid,teammate_uid_1,teammate_uid_2,teammate_uid_3')
        .eq('tournament_id', tournament.id)
        .neq('id', reg.id)).data || [],
      [gameProfile?.game_uid, ...cleanTeammates]
    )
    if (conflictUid) {
      setSaveErr(`❌ UID already registered in another team: ${conflictUid}`)
      setSaving(false)
      return
    }

    const patch = {
      team_name: cleanTeam,
      teammate_uid_1: cleanTeammates[0] || null,
      teammate_uid_2: cleanTeammates[1] || null,
      teammate_uid_3: cleanTeammates[2] || null,
    }

    const { error } = await supabasePlayer
      .from('tournament_registrations')
      .update(patch)
      .eq('id', reg.id)

    setSaving(false)
    if (error) {
      setSaveErr(error.message || 'Failed to save changes.')
      return
    }

    setEditing(false)
    await onUpdated()
  }

  const statusColor = {
    pending: 'text-amber-400',
    confirmed: 'text-emerald-400',
    rejected: 'text-red-400',
    cancelled: 'text-slate-500'
  }[reg.status] || 'text-slate-400'

  return (
    <div className="space-y-4">
      <div className="card space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Your registration</p>
            <h3 className="text-base font-semibold text-slate-100 mt-1">{reg.team_name}</h3>
          </div>
          <span className={`text-[11px] font-semibold uppercase tracking-wide ${statusColor}`}>
            {reg.status}
          </span>
        </div>

        <div className="space-y-2 text-xs text-slate-300">
          <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-900/50 px-3 py-2">
            <span className="text-slate-400">Host UID</span>
            <span className="font-mono text-slate-100">{reg.host_uid}</span>
          </div>
          {[reg.teammate_uid_1, reg.teammate_uid_2, reg.teammate_uid_3]
            .slice(0, teammateNeed)
            .map((uid, idx) => (
              <div key={idx} className="flex items-center justify-between gap-3 rounded-lg bg-slate-900/40 px-3 py-2">
                <span className="text-slate-400">Teammate {idx + 1}</span>
                <span className="font-mono text-slate-100">{uid || '—'}</span>
              </div>
            ))}
        </div>

        {isHost && canEdit && (
          <div className="flex gap-2">
            <button type="button" className="btn-secondary text-xs" onClick={() => setEditing(v => !v)}>
              {editing ? 'Cancel edit' : 'Edit registration'}
            </button>
            {!editing && reg.status !== 'confirmed' && (
              <p className="text-[11px] text-slate-500 self-center">You can edit until admin confirms your slot.</p>
            )}
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
                <TeammateInput
                  key={i}
                  index={i}
                  value={teammates[i] || ''}
                  onChange={(val) => {
                    const copy = [...teammates]
                    copy[i] = val
                    setTeammates(copy)
                  }}
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

      {reg.status === 'pending' && tournament.entry_fee > 0 && (
        <div className="card border border-amber-700/40 bg-amber-500/5 space-y-2">
          <p className="text-xs font-semibold text-amber-300">Payment under review</p>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Your payment has been recorded and is awaiting admin confirmation. Room details will appear here once your slot is confirmed.
          </p>
        </div>
      )}

      {reg.status === 'confirmed' && isHost && (
        <RoomCodeCard tournamentId={tournament.id} />
      )}

      {reg.status === 'confirmed' && !isHost && (
        <div className="card border border-slate-700 bg-slate-900/40 space-y-2">
          <p className="text-xs font-semibold text-slate-200">Room details</p>
          <p className="text-[11px] text-slate-400">
            Only the host account can view room details. Please contact your team host.
          </p>
        </div>
      )}
    </div>
  )
}

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

    if (cleanTeammates.some(v => !v)) {
      return setErr('All teammate UIDs are required.')
    }

    const dup = cleanTeammates.find((v, idx) => cleanTeammates.indexOf(v) !== idx)
    if (dup) return setErr(`❌ Duplicate teammate UID: ${dup}`)

    if (cleanTeammates.includes(gameProfile.game_uid)) {
      return setErr(`❌ You cannot enter your own UID in teammate fields.`)
    }

    setSaving(true)

    for (let i = 0; i < cleanTeammates.length; i++) {
      const uid = cleanTeammates[i]
      const { data: p } = await supabasePlayer
        .from('game_profiles')
        .select('in_game_name, status')
        .eq('game_uid', uid)
        .single()

      if (!p) return setErr(`❌ Teammate ${i + 1}: No player found with UID ${uid}`)
      if (p.status !== 'verified') return setErr(`❌ Teammate ${i + 1}: Player \"${p.in_game_name}\" is not verified yet.`)
    }

    const conflictUid = findUidConflict(
      (await supabasePlayer
        .from('tournament_registrations')
        .select('host_uid,teammate_uid_1,teammate_uid_2,teammate_uid_3')
        .eq('tournament_id', tournament.id)).data || [],
      [gameProfile.game_uid, ...cleanTeammates]
    )
    if (conflictUid) {
      setSaving(false)
      return setErr(`❌ UID already registered in another team: ${conflictUid}`)
    }

    const payload = {
      tournament_id: tournament.id,
      host_player_id: profile.id,
      host_uid: gameProfile.game_uid,
      team_name: cleanTeam,
      teammate_uid_1: cleanTeammates[0] || null,
      teammate_uid_2: cleanTeammates[1] || null,
      teammate_uid_3: cleanTeammates[2] || null,
      status: hasFee ? 'pending' : 'confirmed',
    }

    const { error } = await supabasePlayer.from('tournament_registrations').insert(payload)

    setSaving(false)
    if (error) return setErr(error.message || 'Registration failed.')

    setDone(true)
    await onRegistered()
  }

  if (done) {
    return (
      <div className="card text-center py-10 space-y-3 border border-emerald-700/30 bg-emerald-500/5">
        <p className="text-sm font-semibold text-emerald-400">Registration submitted ✅</p>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          {hasFee
            ? 'Your slot is under review. Please complete payment if required and wait for admin confirmation.'
            : 'Your slot has been confirmed. Room details will appear here when the admin reveals them.'}
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="card space-y-4">
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-wide">Register team</p>
        <h3 className="text-base font-semibold text-slate-100 mt-1">Join this tournament</h3>
      </div>

      <div className="rounded-xl bg-slate-900/50 ring-1 ring-white/10 p-3 space-y-2 text-xs text-slate-300">
        <div className="flex items-center justify-between gap-3">
          <span className="text-slate-400">Host UID</span>
          <span className="font-mono text-slate-100">{gameProfile?.game_uid || '—'}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-slate-400">Host IGN</span>
          <span className="text-slate-100">{gameProfile?.in_game_name || '—'}</span>
        </div>
      </div>

      <div>
        <label className="label">Team name</label>
        <input
          type="text"
          className="input"
          placeholder="Enter your team name"
          value={teamName}
          onChange={e => setTeamName(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <label className="label">Teammates</label>
        {Array.from({ length: teammateNeed }).map((_, i) => (
          <TeammateInput
            key={i}
            index={i}
            value={teammates[i] || ''}
            onChange={(val) => {
              const copy = [...teammates]
              copy[i] = val
              setTeammates(copy)
            }}
            hostUid={gameProfile?.game_uid || ''}
          />
        ))}
      </div>

      {hasFee && (
        <div className="rounded-xl bg-amber-500/5 ring-1 ring-amber-700/40 p-3 space-y-2 text-xs text-slate-300">
          <p className="font-semibold text-amber-300">Payment details</p>
          <p>
            Entry fee: <span className="text-slate-100 font-semibold">₹{Number(tournament.entry_fee).toFixed(0)}</span>
          </p>
          {tournament.upi_id && (
            <p>
              UPI ID: <span className="font-mono text-slate-100 select-all">{tournament.upi_id}</span>
            </p>
          )}
          <p className="text-[11px] text-slate-400 leading-relaxed">
            After you submit your registration, your status will stay pending until the admin confirms your payment.
          </p>
        </div>
      )}

      {err && <p className="text-xs text-red-400">{err}</p>}

      <button disabled={saving} className="btn-primary text-xs" type="submit">
        {saving ? 'Submitting…' : 'Register now'}
      </button>
    </form>
  )
}

function SummaryStat({ label, value, accent = 'text-slate-100' }) {
  return (
    <div className="rounded-xl bg-slate-900/50 ring-1 ring-white/10 px-4 py-3">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-sm font-semibold ${accent}`}>{value}</p>
    </div>
  )
}

export default function TournamentDetails() {
  const { id } = useParams()
  const { user, profile, loading: authLoading } = usePlayer()
  const { gameProfile } = useGame()
  const [tournament, setTournament] = React.useState(null)
  const [myReg, setMyReg] = React.useState(undefined)
  const [allRegs, setAllRegs] = React.useState([])
  const [loading, setLoading] = React.useState(true)

  async function loadData() {
    const { data: t } = await supabasePlayer
      .from('tournaments')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    setTournament(t || null)

    if (t && profile) {
      // FIX: query by host_player_id (actual column), not player_id
      const { data: reg } = await supabasePlayer
        .from('tournament_registrations')
        .select('*')
        .eq('tournament_id', t.id)
        .eq('host_player_id', profile.id)
        .maybeSingle()
      setMyReg(reg || null)
    } else {
      setMyReg(null)
    }

    if (t) {
      const { data: regs } = await supabasePlayer
        .from('tournament_registrations')
        .select('id, team_name, host_uid, status')
        .eq('tournament_id', t.id)
        .order('created_at', { ascending: true })
      setAllRegs(regs || [])
    }

    setLoading(false)
  }

  React.useEffect(() => {
    if (!authLoading) loadData()
  }, [id, profile, authLoading])

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-xs text-slate-400">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-600 border-t-sky-400 mr-3" />
        Loading tournament…
      </div>
    )
  }

  if (!tournament) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-400 text-sm">Tournament not found.</p>
      </div>
    )
  }

  const isEnded = tournament.status === 'ended'
  const regOpen = tournament.registration_status === 'open'
  const regClosed = tournament.registration_status === 'closed'
  const isRegistered = !!myReg
  const notLoggedIn = !user

  function renderRightPanel() {
    if (isEnded) return <EndedTournamentPanel tournament={tournament} />
    if (notLoggedIn) {
      return (
        <div className="card text-center space-y-3 py-8">
          <p className="text-xs text-slate-300">Log in to register for this tournament.</p>
          <a href="/login" className="btn-primary text-xs inline-block px-6">
            Log In
          </a>
        </div>
      )
    }
    if (isRegistered) {
      return (
        <AlreadyRegisteredPanel
          tournament={tournament}
          reg={myReg}
          gameProfile={gameProfile}
          onUpdated={loadData}
        />
      )
    }
    if (regClosed) {
      return (
        <div className="card text-center space-y-3 py-8 border border-slate-700 bg-slate-900/40">
          <p className="text-sm font-semibold text-slate-200">Registration closed</p>
          <p className="text-xs text-slate-400">This tournament is no longer accepting new entries.</p>
        </div>
      )
    }
    if (!profile) {
      return (
        <div className="card text-center space-y-3 py-8 border border-amber-700/40 bg-amber-500/5">
          <p className="text-xs text-slate-300">Complete your player profile first to register.</p>
          <a href="/profile" className="btn-primary text-xs inline-block px-6">
            Open Profile
          </a>
        </div>
      )
    }
    if (!gameProfile?.game_uid) {
      return (
        <div className="card text-center space-y-3 py-8 border border-amber-700/40 bg-amber-500/5">
          <p className="text-xs text-slate-300">Set up your game profile and verify your UID before registering.</p>
          <a href="/profile" className="btn-primary text-xs inline-block px-6">
            Complete Game Profile
          </a>
        </div>
      )
    }
    if (!regOpen) {
      return (
        <div className="card text-center space-y-3 py-8 border border-slate-700 bg-slate-900/40">
          <p className="text-sm font-semibold text-slate-200">Registration not available</p>
          <p className="text-xs text-slate-400">Registration for this tournament is currently unavailable.</p>
        </div>
      )
    }
    return (
      <RegisterPanel
        tournament={tournament}
        profile={profile}
        gameProfile={gameProfile}
        allRegs={allRegs}
        onRegistered={loadData}
      />
    )
  }

  const modeLabel = modeBadgeLabel(tournament)
  const sizeLabel = teamSizeLabel(tournament.team_size)
  const confirmedCount = allRegs.filter(r => r.status === 'confirmed').length
  const pendingCount = allRegs.filter(r => r.status === 'pending').length

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1.25fr_0.95fr] items-start">
        <div className="space-y-6">
          <section className="card space-y-5 overflow-hidden">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {modeLabel && <span className="badge">{modeLabel}</span>}
                  {sizeLabel && <span className="badge-alt">{sizeLabel}</span>}
                  {isEnded && (
                    <span className="rounded-full bg-red-600/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-red-400">
                      Ended
                    </span>
                  )}
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-50">{tournament.title}</h1>
                  <p className="mt-2 max-w-2xl text-sm text-slate-400 leading-relaxed">
                    Join this match, confirm your squad, and stay ready for room code reveal and final standings.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryStat label="Entry Fee" value={Number(tournament.entry_fee) > 0 ? `₹${Number(tournament.entry_fee).toFixed(0)}` : 'Free'} accent="text-emerald-400" />
              <SummaryStat label="Slots" value={`${confirmedCount}/${tournament.max_slots || 0}`} />
              <SummaryStat label="Pending" value={pendingCount} accent="text-amber-400" />
              <SummaryStat label="Starts" value={fmtDate(tournament.start_time) || 'TBA'} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-slate-900/50 ring-1 ring-white/10 p-4 space-y-3">
                <h2 className="text-sm font-semibold text-slate-100">Tournament info</h2>
                <dl className="space-y-2 text-xs">
                  <div className="flex items-start justify-between gap-3">
                    <dt className="text-slate-500">Registration closes</dt>
                    <dd className="text-right text-slate-200">{fmtDate(tournament.entry_closing_time) || 'Not set'}</dd>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <dt className="text-slate-500">Map</dt>
                    <dd className="text-right text-slate-200">{tournament.map || 'TBA'}</dd>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <dt className="text-slate-500">Prize</dt>
                    <dd className="text-right text-slate-200 whitespace-pre-line">{tournament.prize_text || 'To be announced'}</dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-2xl bg-slate-900/50 ring-1 ring-white/10 p-4 space-y-3">
                <h2 className="text-sm font-semibold text-slate-100">Rules & points</h2>
                {tournament.points_table ? (
                  <pre className="text-[11px] leading-6 whitespace-pre-wrap font-sans text-slate-300">{tournament.points_table}</pre>
                ) : (
                  <p className="text-xs text-slate-400">Points table or round rules will be shared by the admin.</p>
                )}
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          {renderRightPanel()}
        </div>
      </div>
    </div>
  )
}
