import React from 'react'
import { useParams } from 'react-router-dom'
import { supabasePlayer } from '../../lib/supabaseClient'
import { usePlayer } from '../../lib/PlayerContext'
import { getModeLabel } from '../../lib/constants'

// ─── Razorpay key ───────────────────────────────────────────────────────────────────────────────────
const RZP_KEY = import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_SaUtkNyiEDfrAm'

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
        .from('players')
        .select('full_name, is_verified')
        .eq('ff_uid', trimmed)
        .single()
      if (data && data.is_verified) {
        setState({ status: 'valid', name: data.full_name })
      } else if (data && !data.is_verified) {
        setState({ status: 'invalid', name: null, msg: 'Player not approved yet' })
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
          placeholder={`Teammate ${index + 1} FF UID`}
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
  return [getModeLabel(t), t.format_label].filter(Boolean).join(' \u2022 ')
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

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true)
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
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
      reg.member_2_uid,
      reg.member_3_uid,
      reg.member_4_uid,
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

  React.useEffect(() => {
    if (!isBR) return
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
  }, [tournament.id, isBR])

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

      {isBR && brScores && brScores.length > 0 && (
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

      {isBR && brScores !== null && brScores.length === 0 && !tournament.winner_text && (
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
                    <p className="font-bold text-[11px] truncate">{match.teamA?.name}</p>
                    <p className="text-slate-400 text-[10px]">Rounds: <span className="text-slate-100 font-semibold">{match.teamA?.rounds_won}</span></p>
                    {match.winner_team === match.teamA?.name && (
                      <span className="inline-block text-[9px] rounded-full bg-emerald-600/20 text-emerald-400 px-2 py-0.5 font-semibold">Winner ✓</span>
                    )}
                    {match.teamA?.players?.length > 0 && (
                      <div className="pt-1 space-y-0.5">
                        {match.teamA.players.map((p, pi) => (
                          <div key={pi} className="flex justify-between gap-2 text-[10px] text-slate-400">
                            <span className="truncate">{p.name}</span>
                            <span className="tabular-nums shrink-0">{p.kills}K/{p.deaths}D</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="text-center text-slate-500 font-bold text-xs pt-1">VS</div>

                  <div className={`space-y-1 text-right ${match.winner_team === match.teamB?.name ? 'text-emerald-300' : 'text-slate-200'}`}>
                    <p className="font-bold text-[11px] truncate">{match.teamB?.name}</p>
                    <p className="text-slate-400 text-[10px]">Rounds: <span className="text-slate-100 font-semibold">{match.teamB?.rounds_won}</span></p>
                    {match.winner_team === match.teamB?.name && (
                      <span className="inline-block text-[9px] rounded-full bg-emerald-600/20 text-emerald-400 px-2 py-0.5 font-semibold">Winner ✓</span>
                    )}
                    {match.teamB?.players?.length > 0 && (
                      <div className="pt-1 space-y-0.5">
                        {match.teamB.players.map((p, pi) => (
                          <div key={pi} className="flex justify-between gap-2 text-[10px] text-slate-400">
                            <span className="tabular-nums shrink-0">{p.kills}K/{p.deaths}D</span>
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

      {!tournament.winner_text && !isBR && !isCSorLW && (
        <p className="text-xs text-slate-400">Results will be posted shortly.</p>
      )}
    </section>
  )
}

// ─── Ended Tournament Right Panel ───────────────────────────────────────────────────────────────

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
  const [roomCode, setRoomCode] = React.useState(undefined) // undefined = loading

  React.useEffect(() => {
    async function fetchRoom() {
      const { data } = await supabasePlayer
        .from('room_codes')
        .select('room_id, room_password, is_revealed')
        .eq('tournament_id', tournamentId)
        .maybeSingle()
      setRoomCode(data || null)
    }
    fetchRoom()

    // Poll every 15s so the card auto-updates when admin reveals the code
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
        <p className="text-[11px] text-slate-400">Room details will be shared before the match starts.</p>
        <p className="text-[10px] text-slate-500">Share these with your teammates once you receive them.</p>
      </div>
    )
  }

  if (!roomCode.is_revealed) {
    return (
      <div className="card space-y-2">
        <p className="text-xs font-semibold text-slate-300">🎮 Room Details <span className="text-[10px] text-amber-400 font-normal ml-1">(Host only)</span></p>
        <p className="text-[11px] text-amber-400">
          ⏳ Room details haven't been revealed yet. Check back closer to match time.
        </p>
        <p className="text-[10px] text-slate-500">Once revealed, share the room ID and password with your teammates.</p>
      </div>
    )
  }

  return (
    <div className="card space-y-3 border border-emerald-800/40 bg-emerald-500/5">
      <p className="text-xs font-semibold text-emerald-300">🎮 Room Details <span className="text-[10px] text-amber-400 font-normal ml-1">(Host only — share with teammates)</span></p>
      <div className="space-y-2">
        <div className="flex items-center justify-between rounded-lg bg-slate-900/60 px-3 py-2">
          <span className="text-[11px] text-slate-400">Room ID</span>
          <span className="font-mono text-sm font-bold text-slate-50 tracking-wider select-all">{roomCode.room_id}</span>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-slate-900/60 px-3 py-2">
          <span className="text-[11px] text-slate-400">Password</span>
          <span className="font-mono text-sm font-bold text-slate-50 tracking-wider select-all">{roomCode.room_password}</span>
        </div>
      </div>
      <p className="text-[10px] text-slate-500">📤 Share this with your teammates. Do not post publicly.</p>
    </div>
  )
}

// ─── Already Registered Panel (with teammate editor + room code for host) ──────────────────────────────

function AlreadyRegisteredPanel({ tournament, reg: initialReg, profile, onUpdated }) {
  const slots = teammateCount(tournament.team_size)
  const [mates, setMates] = React.useState([
    initialReg.teammate_uid_1 || '',
    initialReg.teammate_uid_2 || '',
    initialReg.teammate_uid_3 || '',
  ])
  const [editing, setEditing] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [saveErr, setSaveErr] = React.useState('')
  const [saveOk, setSaveOk] = React.useState(false)
  const reg = initialReg

  React.useEffect(() => {
    setMates([
      initialReg.teammate_uid_1 || '',
      initialReg.teammate_uid_2 || '',
      initialReg.teammate_uid_3 || '',
    ])
  }, [initialReg])

  const isHost = profile?.ff_uid && String(profile.ff_uid).trim() === String(reg.host_uid).trim()

  async function handleSaveMates() {
    setSaving(true); setSaveErr(''); setSaveOk(false)

    for (let i = 0; i < slots; i++) {
      const uid = mates[i]?.trim()
      if (!uid) continue
      const { data: p } = await supabasePlayer
        .from('players')
        .select('full_name, is_verified')
        .eq('ff_uid', uid)
        .single()
      if (!p) { setSaveErr(`❌ Teammate ${i + 1}: No player found with UID "${uid}". Only registered app users can be added.`); setSaving(false); return }
      if (!p.is_verified) { setSaveErr(`❌ Teammate ${i + 1}: Player "${p.full_name}" is not approved by admin yet.`); setSaving(false); return }
    }

    const t1 = slots >= 1 ? mates[0].trim() || null : null
    const t2 = slots >= 2 ? mates[1].trim() || null : null
    const t3 = slots >= 3 ? mates[2].trim() || null : null
    const newMates = [t1, t2, t3].filter(Boolean)

    const { data: existingRegs } = await supabasePlayer
      .from('tournament_registrations')
      .select('host_uid,teammate_uid_1,teammate_uid_2,teammate_uid_3,member_2_uid,member_3_uid,member_4_uid')
      .eq('tournament_id', tournament.id)
      .neq('id', reg.id)

    const allNewUids = [reg.host_uid, ...newMates]
    if (new Set(allNewUids).size !== allNewUids.length) {
      setSaveErr('❌ Duplicate UIDs detected in your team. Each player must have a unique UID.')
      setSaving(false); return
    }

    const conflict = findUidConflict(existingRegs || [], newMates)
    if (conflict) {
      setSaveErr(`❌ UID "${conflict}" is already registered. Use a different UID.`)
      setSaving(false); return
    }

    const { error } = await supabasePlayer
      .from('tournament_registrations')
      .update({
        teammate_uid_1: t1,
        teammate_uid_2: t2,
        teammate_uid_3: t3,
      })
      .eq('id', reg.id)

    setSaving(false)
    if (error) { setSaveErr('❌ Failed to update: ' + error.message); return }
    setSaveOk(true)
    setEditing(false)
    if (onUpdated) onUpdated()
  }

  const statusColor = {
    pending: 'text-amber-400',
    confirmed: 'text-emerald-400',
    rejected: 'text-red-400',
    waitlisted: 'text-sky-400',
  }[reg.status] || 'text-slate-400'

  return (
    <div className="space-y-4">
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-300">Your Registration</span>
          <span className={`text-[11px] font-semibold uppercase tracking-wide ${statusColor}`}>
            {reg.status}
          </span>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-400">Team</span>
            <span className="font-semibold text-slate-100">{reg.team_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Your UID</span>
            <span className="font-mono text-slate-200">{reg.host_uid}</span>
          </div>
          {isHost && (
            <div className="flex justify-between">
              <span className="text-slate-400">Role</span>
              <span className="text-amber-400 text-[11px] font-semibold">Host 👑</span>
            </div>
          )}
          {reg.payment_screenshot_url && (
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Payment</span>
              <a
                href={reg.payment_screenshot_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-400 hover:underline text-[11px]"
              >
                View Screenshot
              </a>
            </div>
          )}
        </div>

        {slots > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-semibold">Teammates</span>
              {!editing && reg.status !== 'confirmed' && (
                <button
                  onClick={() => { setEditing(true); setSaveOk(false); setSaveErr('') }}
                  className="text-[11px] text-sky-400 hover:text-sky-300"
                >
                  Edit
                </button>
              )}
            </div>

            {editing ? (
              <div className="space-y-2">
                {Array.from({ length: slots }).map((_, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-[10px] text-slate-500 w-16 pt-2">Teammate {i + 1}</span>
                    <div className="flex-1">
                      <TeammateInput
                        index={i}
                        value={mates[i] || ''}
                        hostUid={reg.host_uid}
                        onChange={val => {
                          const next = [...mates]
                          next[i] = val
                          setMates(next)
                        }}
                      />
                    </div>
                  </div>
                ))}
                {saveErr && <p className="text-[11px] text-red-400">{saveErr}</p>}
                {saveOk && <p className="text-[11px] text-emerald-400">✅ Teammates updated!</p>}
                <div className="flex gap-2">
                  <button className="btn-primary text-xs flex-1" disabled={saving} onClick={handleSaveMates}>
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    className="flex-1 rounded-lg bg-slate-800 text-slate-300 text-xs py-1.5 hover:bg-slate-700"
                    onClick={() => { setEditing(false); setSaveErr('') }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Host</span>
                  <span className="font-mono text-slate-100">{reg.host_uid}</span>
                </div>
                {Array.from({ length: slots }).map((_, i) => {
                  const uid = [reg.teammate_uid_1, reg.teammate_uid_2, reg.teammate_uid_3][i]
                  return (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="text-slate-400">Teammate {i + 1}</span>
                      {uid
                        ? <span className="font-mono text-slate-200">{uid}</span>
                        : <span className="text-slate-600 italic">Not set</span>
                      }
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Room code: shown ONLY to the host, only when confirmed */}
      {reg.status === 'confirmed' && isHost && (
        <RoomCodeCard tournamentId={tournament.id} />
      )}

      {/* Non-host confirmed teammates: generic message */}
      {reg.status === 'confirmed' && !isHost && (
        <div className="card space-y-2">
          <p className="text-xs font-semibold text-slate-300">🎮 Room Details</p>
          <p className="text-[11px] text-slate-400">Room details are shared with the host of your team. Ask your host for the room ID and password before the match.</p>
        </div>
      )}
    </div>
  )
}

// ─── Registration Form ──────────────────────────────────────────────────────────────────────────────────
function RegistrationForm({ tournament, onRegistered }) {
  const { player: profile } = usePlayer()
  const slots = teammateCount(tournament.team_size)
  const [teamName, setTeamName] = React.useState('')
  const [mates, setMates] = React.useState(['', '', ''])
  const [payProof, setPayProof] = React.useState(null)
  const [uploading, setUploading] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [err, setErr] = React.useState('')
  const [ok, setOk] = React.useState(false)

  const hostUid = profile?.ff_uid || ''
  const entryFee = Number(tournament.entry_fee) || 0
  const hasFee = entryFee > 0
  const paymentMode = tournament.payment_mode || 'upi'

  async function handleSubmit(e) {
    e.preventDefault()
    setErr('')
    if (!profile) return setErr('Please log in first.')
    if (!hostUid) return setErr('Your FF UID is missing. Update your profile first.')
    if (slots > 0 && !teamName.trim()) return setErr('Enter your team name.')

    const filledMates = mates.slice(0, slots).map(m => m.trim()).filter(Boolean)

    for (let i = 0; i < slots; i++) {
      const uid = mates[i].trim()
      if (!uid) continue
      const { data: p } = await supabasePlayer
        .from('players')
        .select('full_name, is_verified')
        .eq('ff_uid', uid)
        .single()
      if (!p) return setErr(`❌ Teammate ${i + 1}: No player found with UID "${uid}". Only registered app users can be added.`)
      if (!p.is_verified) return setErr(`❌ Teammate ${i + 1}: Player "${p.full_name}" is not approved by admin yet.`)
    }

    if (filledMates.includes(hostUid)) return setErr('❌ Your UID cannot also be a teammate UID.')
    if (new Set(filledMates).size !== filledMates.length) return setErr('❌ Duplicate teammate UIDs found.')

    const { data: existingRegs } = await supabasePlayer
      .from('tournament_registrations')
      .select('host_uid,teammate_uid_1,teammate_uid_2,teammate_uid_3,member_2_uid,member_3_uid,member_4_uid')
      .eq('tournament_id', tournament.id)

    const teammateConflict = findUidConflict(existingRegs || [], filledMates)
    if (teammateConflict) {
      return setErr(`❌ UID "${teammateConflict}" is already registered in this tournament. Use a different UID.`)
    }
    if (filledMates.length !== new Set(filledMates).size) {
      return setErr('❌ Duplicate UIDs in your submission. Each player must have a unique UID.')
    }

    setSubmitting(true)
    let screenshotUrl = null

    if (hasFee && paymentMode === 'upi' && payProof) {
      setUploading(true)
      const ext = payProof.name.split('.').pop()
      const filePath = `payments/${profile.id}_${Date.now()}.${ext}`
      const { error: upErr } = await supabasePlayer.storage
        .from('payment-proofs')
        .upload(filePath, payProof, { upsert: true })
      setUploading(false)
      if (upErr) { setErr('❌ Upload failed: ' + upErr.message); setSubmitting(false); return }
      const { data: urlData } = supabasePlayer.storage.from('payment-proofs').getPublicUrl(filePath)
      screenshotUrl = urlData?.publicUrl || null
    }

    if (hasFee && paymentMode === 'razorpay') {
      const loaded = await loadRazorpayScript()
      if (!loaded) { setErr('❌ Razorpay failed to load. Try again.'); setSubmitting(false); return }

      const orderRes = await supabasePlayer.functions.invoke('create-razorpay-order', {
        body: {
          amount: entryFee * 100,
          currency: 'INR',
          receipt: `reg_${profile.id}_${tournament.id}`,
          player_name: profile.full_name || '',
          player_email: profile.email || '',
        },
      })
      if (orderRes.error || !orderRes.data?.id) {
        setErr('❌ Payment initiation failed: ' + (orderRes.error?.message || 'Unknown error'))
        setSubmitting(false); return
      }
      const orderData = orderRes.data

      await new Promise((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: RZP_KEY,
          amount: entryFee * 100,
          currency: 'INR',
          name: 'Tournament Registration',
          description: tournament.title,
          order_id: orderData.id,
          prefill: {
            name: orderData.player_name || '',
            email: orderData.player_email || '',
          },
          handler: (response) => {
            screenshotUrl = `rzp:${response.razorpay_payment_id}`
            resolve()
          },
          modal: { ondismiss: () => reject(new Error('dismissed')) },
        })
        rzp.open()
      }).catch(() => {
        setErr('❌ Payment cancelled.')
        setSubmitting(false)
        return
      })
      if (!screenshotUrl) { setSubmitting(false); return }
    }

    const t1 = slots >= 1 ? mates[0].trim() || null : null
    const t2 = slots >= 2 ? mates[1].trim() || null : null
    const t3 = slots >= 3 ? mates[2].trim() || null : null

    const { error: regErr } = await supabasePlayer
      .from('tournament_registrations')
      .insert({
        tournament_id: tournament.id,
        player_id: profile.id,
        team_name: slots > 0 ? teamName.trim() : (profile.full_name || hostUid),
        host_uid: hostUid,
        host_player_id: profile.id,
        teammate_uid_1: t1,
        teammate_uid_2: t2,
        teammate_uid_3: t3,
        payment_screenshot_url: screenshotUrl,
        status: hasFee ? 'pending' : 'confirmed',
      })

    setSubmitting(false)
    if (regErr) { setErr('❌ ' + regErr.message); return }
    setOk(true)
    if (onRegistered) onRegistered()
  }

  if (ok) {
    return (
      <div className="card text-center space-y-2 py-6">
        <span className="text-2xl">✅</span>
        <p className="text-sm font-semibold text-emerald-400">Registered successfully!</p>
        <p className="text-xs text-slate-400">
          {hasFee ? 'Your payment is under review. You will be confirmed soon.' : 'You are confirmed!'}
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      <p className="text-xs font-semibold text-slate-300">Register for this tournament</p>

      <div className="space-y-1">
        <label className="label">Your FF UID (auto-filled)</label>
        <input type="text" className="input bg-slate-900" value={hostUid} readOnly />
      </div>

      {slots > 0 && (
        <div className="space-y-1">
          <label className="label">Team Name</label>
          <input
            type="text"
            className="input"
            placeholder="Enter team name"
            value={teamName}
            onChange={e => setTeamName(e.target.value)}
            required
          />
        </div>
      )}

      {slots > 0 && (
        <div className="space-y-2">
          <label className="label">Teammate UIDs</label>
          <p className="text-[11px] text-amber-300">💡 Only players registered and approved on this app can be added as teammates.</p>
          {Array.from({ length: slots }).map((_, i) => (
            <TeammateInput
              key={i}
              index={i}
              value={mates[i] || ''}
              hostUid={hostUid}
              onChange={val => {
                const next = [...mates]
                next[i] = val
                setMates(next)
              }}
            />
          ))}
        </div>
      )}

      {hasFee && paymentMode === 'upi' && (
        <div className="space-y-2">
          <label className="label">Entry Fee: ₹{entryFee}</label>
          {tournament.upi_id && (
            <div className="rounded-lg bg-slate-900/80 px-3 py-2 text-xs">
              <p className="text-slate-400">UPI ID: <span className="font-mono text-slate-100">{tournament.upi_id}</span></p>
              {tournament.upi_qr_url && (
                <img src={tournament.upi_qr_url} alt="UPI QR" className="mt-2 w-32 h-32 rounded" />
              )}
            </div>
          )}
          <div className="space-y-1">
            <label className="label">Upload Payment Screenshot</label>
            <input
              type="file"
              accept="image/*"
              className="input text-xs py-1.5"
              onChange={e => setPayProof(e.target.files?.[0] || null)}
            />
          </div>
        </div>
      )}

      {hasFee && paymentMode === 'razorpay' && (
        <div className="rounded-lg bg-slate-900/60 px-3 py-2 text-xs space-y-1">
          <p className="text-slate-300 font-semibold">Entry Fee: ₹{entryFee}</p>
          <p className="text-slate-400">You will be redirected to Razorpay to complete the payment.</p>
        </div>
      )}

      {err && <p className="text-[11px] text-red-400">{err}</p>}

      <button type="submit" className="btn-primary w-full" disabled={submitting || uploading}>
        {uploading ? 'Uploading…' : submitting ? 'Registering…' : hasFee ? `Pay ₹${entryFee} & Register` : 'Register'}
      </button>
    </form>
  )
}

// ─── Main TournamentDetails Page ───────────────────────────────────────────────────────────────────────────

export default function TournamentDetails() {
  const { id } = useParams()
  const { player: profile, loading: authLoading } = usePlayer()
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
      const { data: reg } = await supabasePlayer
        .from('tournament_registrations')
        .select('*')
        .eq('tournament_id', t.id)
        .eq('player_id', profile.id)
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
  const notLoggedIn = !profile

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
          profile={profile}
          onUpdated={loadData}
        />
      )
    }
    if (regOpen) {
      return <RegistrationForm tournament={tournament} onRegistered={loadData} />
    }
    if (regClosed) {
      return (
        <div className="card text-center space-y-2 py-8">
          <span className="text-2xl">🔒</span>
          <p className="text-sm font-semibold text-slate-300">Registrations Closed</p>
          <p className="text-xs text-slate-400">This tournament is no longer accepting new registrations.</p>
        </div>
      )
    }
    return null
  }

  const confirmedCount = allRegs.filter(r => r.status === 'confirmed').length
  const totalSlots = Number(tournament.max_teams) || 0

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Hero banner */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700">
        {tournament.banner_url && (
          <img
            src={tournament.banner_url}
            alt={tournament.title}
            className="absolute inset-0 w-full h-full object-cover opacity-20"
          />
        )}
        <div className="relative px-5 py-6 space-y-3">
          <div className="flex flex-wrap gap-2">
            <span className="badge">{modeBadgeLabel(tournament)}</span>
            <span className="badge">{teamSizeLabel(tournament.team_size)}</span>
            {isEnded && (
              <span className="badge bg-red-600/20 text-red-400 border-red-700/40">Ended</span>
            )}
          </div>
          <h1 className="text-xl font-bold text-slate-50 leading-tight">{tournament.title}</h1>
          {tournament.description && (
            <p className="text-xs text-slate-400 max-w-prose">{tournament.description}</p>
          )}
          <div className="flex flex-wrap gap-4 text-xs text-slate-400">
            {tournament.start_time && (
              <span>📅 {fmtDate(tournament.start_time)}</span>
            )}
            {tournament.entry_fee > 0 && (
              <span>💰 Entry: ₹{tournament.entry_fee}</span>
            )}
            {totalSlots > 0 && (
              <span>👥 {confirmedCount}/{totalSlots} teams</span>
            )}
            {tournament.prize_pool && (
              <span>🏆 Prize: {tournament.prize_pool}</span>
            )}
          </div>
        </div>
      </div>

      {/* Main two-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_340px] gap-6">
        {/* Left column */}
        <div className="space-y-4">

          {tournament.rules && (
            <section className="card space-y-2">
              <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">📜 Rules</h2>
              <p className="text-xs text-slate-400 whitespace-pre-line leading-relaxed">{tournament.rules}</p>
            </section>
          )}

          {(tournament.start_time || tournament.end_time) && (
            <section className="card space-y-2">
              <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">📅 Schedule</h2>
              <div className="space-y-1 text-xs">
                {tournament.start_time && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Starts</span>
                    <span className="text-slate-200">{fmtDate(tournament.start_time)}</span>
                  </div>
                )}
                {tournament.end_time && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Ends</span>
                    <span className="text-slate-200">{fmtDate(tournament.end_time)}</span>
                  </div>
                )}
              </div>
            </section>
          )}

          {allRegs.length > 0 && (
            <section className="card space-y-2">
              <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                👥 Registered Teams ({allRegs.length})
              </h2>
              <div className="space-y-2">
                {allRegs.map((reg, i) => (
                  <div key={reg.id} className="flex items-center gap-3 rounded-lg bg-slate-900/60 px-3 py-2 text-xs">
                    <span className="text-slate-500 w-5 text-right">{i + 1}.</span>
                    <span className="flex-1 font-semibold text-slate-100">{reg.team_name}</span>
                    <span className="font-mono text-slate-400">{reg.host_uid}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right column */}
        <div>
          {renderRightPanel()}
        </div>
      </div>
    </div>
  )
}
