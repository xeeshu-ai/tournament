import React from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabasePlayer } from '../../lib/supabaseClient'
import { usePlayer } from '../../lib/PlayerContext'

// ─── helpers ────────────────────────────────────────────────────────────────

function calcPoints(position, kills) {
  const base = Math.floor((kills + 1) / position * 10)
  const bonus = position === 1 ? 10 : position === 2 ? 6 : position === 3 ? 4 : 0
  return base + bonus
}

function Badge({ children, color = 'slate' }) {
  const colors = {
    blue:   'bg-blue-500/15 text-blue-300 border-blue-500/30',
    green:  'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    yellow: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
    purple: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    slate:  'bg-slate-700/50 text-slate-300 border-slate-600',
    red:    'bg-red-500/15 text-red-300 border-red-500/30',
  }
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${colors[color]}`}>
      {children}
    </span>
  )
}

// ─── UID Lookup Field ────────────────────────────────────────────────────────

function UidLookupField({ gameId, onConfirmed, onClear, excludeUids = [], label }) {
  const [uid, setUid] = React.useState('')
  const [state, setState] = React.useState('idle')
  const [found, setFound] = React.useState(null)
  const [confirmed, setConfirmed] = React.useState(false)
  const timerRef = React.useRef(null)

  async function search(val) {
    if (!val.trim()) return
    setState('searching')
    const { data } = await supabasePlayer
      .from('game_profiles')
      .select('id, game_uid, in_game_name, player_id, status')
      .eq('game_id', gameId)
      .eq('game_uid', val.trim())
      .eq('status', 'verified')
      .maybeSingle()

    if (!data) { setState('error'); setFound(null); return }
    if (excludeUids.includes(data.game_uid)) {
      setState('error'); setFound({ error: 'Already added or is you' }); return
    }
    setState('found'); setFound(data)
  }

  function handleChange(e) {
    const val = e.target.value
    setUid(val); setConfirmed(false); setFound(null); setState('idle')
    onClear()
    clearTimeout(timerRef.current)
    if (val.length >= 4) {
      timerRef.current = setTimeout(() => search(val), 600)
    }
  }

  function handleConfirm() {
    setConfirmed(true)
    onConfirmed({ playerId: found.player_id, gameUid: found.game_uid, inGameName: found.in_game_name })
  }

  function handleReset() {
    setUid(''); setState('idle'); setFound(null); setConfirmed(false); onClear()
  }

  if (confirmed && found) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-emerald-300">{found.in_game_name}</p>
          <p className="text-[11px] text-slate-500">UID: {found.game_uid}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-emerald-400 text-sm">✓</span>
          <button onClick={handleReset} className="text-[11px] text-slate-500 hover:text-slate-300 underline">change</button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-slate-400">{label} <span className="text-slate-600">(optional)</span></label>
      <div className="flex gap-2">
        <input
          value={uid}
          onChange={handleChange}
          inputMode="text"
          placeholder="Enter in-game UID (optional)…"
          className="flex-1 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:border-sky-500/50 focus:outline-none focus:ring-1 focus:ring-sky-500/30"
        />
        <button
          onClick={() => search(uid)}
          disabled={!uid.trim() || state === 'searching'}
          className="rounded-xl bg-slate-700 px-4 py-3 text-sm text-slate-200 hover:bg-slate-600 disabled:opacity-40 transition-colors"
        >
          {state === 'searching' ? '…' : '🔍'}
        </button>
      </div>

      {state === 'found' && found && !confirmed && (
        <div className="flex items-center justify-between rounded-xl border border-slate-600 bg-slate-800/60 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-slate-100">{found.in_game_name}</p>
            <p className="text-[11px] text-slate-500">UID: {found.game_uid} · Verified ✓</p>
          </div>
          <button onClick={handleConfirm} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 transition-colors">
            Add
          </button>
        </div>
      )}

      {state === 'error' && (
        <p className="text-[11px] text-red-400 px-1">
          {found?.error ?? `No verified ${gameId?.toUpperCase()} player found with this UID.`}
        </p>
      )}
    </div>
  )
}

// ─── Register Sheet ──────────────────────────────────────────────────────────

function RegisterSheet({ tournament, playerProfile, hostGameProfile, onClose, onSuccess }) {
  const [step, setStep] = React.useState(1)
  const [teamName, setTeamName] = React.useState('')
  const [teammates, setTeammates] = React.useState([])
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState('')

  const teamSize = tournament.team_size || 1
  const need = teamSize - 1
  // Teammates are optional — we no longer block progression on allConfirmed
  const excludeUids = [hostGameProfile?.game_uid, ...teammates.map(t => t.gameUid)].filter(Boolean)

  function setTeammate(idx, data) {
    setTeammates(prev => {
      const next = [...prev]
      next[idx] = data
      return next
    })
  }

  function clearTeammate(idx) {
    setTeammates(prev => {
      const next = [...prev]
      next[idx] = undefined
      return next.filter(Boolean)
    })
  }

  async function submit() {
    setSubmitting(true); setError('')
    try {
      const { data: reg, error: regErr } = await supabasePlayer
        .from('tournament_registrations')
        .insert({
          tournament_id: tournament.id,
          host_player_id: playerProfile.id,
          host_uid: hostGameProfile.game_uid,
          team_name: teamName.trim(),
          status: 'pending',
        })
        .select('id')
        .single()

      if (regErr) throw regErr

      // Only insert members that were actually confirmed; host is always slot 1
      const members = [
        { registration_id: reg.id, player_id: playerProfile.id, slot: 1, game_uid: hostGameProfile.game_uid, in_game_name: hostGameProfile.in_game_name },
        ...teammates.map((t, i) => ({
          registration_id: reg.id,
          player_id: t.playerId,
          slot: i + 2,
          game_uid: t.gameUid,
          in_game_name: t.inGameName,
        })),
      ]

      const { error: memErr } = await supabasePlayer.from('registration_members').insert(members)
      if (memErr) throw memErr

      onSuccess()
    } catch (e) {
      setError(e.message || 'Registration failed. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-slate-900 border border-slate-700/60 max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-slate-700" />
        </div>

        <div className="sticky top-0 z-10 bg-slate-900 border-b border-slate-800 px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-slate-500 uppercase tracking-widest">Register Team</p>
            <p className="text-sm font-semibold text-slate-100 mt-0.5 truncate max-w-[240px]">{tournament.title}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors">
            ✕
          </button>
        </div>

        <div className="flex gap-1.5 px-5 pt-4">
          {[1, 2, 3].filter(s => s <= (need > 0 ? 3 : 2)).map(s => (
            <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${s <= step ? 'bg-sky-500' : 'bg-slate-700'}`} />
          ))}
        </div>

        <div className="px-5 py-5 space-y-5">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-slate-100">Choose your team name</h2>
                <p className="text-xs text-slate-500 mt-1">This is how your team will appear in standings and brackets.</p>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-400">Team Name</label>
                <input
                  value={teamName}
                  onChange={e => setTeamName(e.target.value)}
                  maxLength={20}
                  placeholder="e.g. Phantom Squad"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:border-sky-500/50 focus:outline-none focus:ring-1 focus:ring-sky-500/30"
                />
                <p className="text-[11px] text-slate-600 text-right">{teamName.length}/20</p>
              </div>
              <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 px-4 py-3 flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-sky-500/20 flex items-center justify-center text-sky-400 text-sm font-bold flex-shrink-0">
                  {hostGameProfile?.in_game_name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-200">{hostGameProfile?.in_game_name}</p>
                  <p className="text-[11px] text-slate-500">You (Captain) · UID: {hostGameProfile?.game_uid}</p>
                </div>
                <Badge color="purple">Host</Badge>
              </div>
            </div>
          )}

          {step === 2 && need > 0 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-slate-100">Add teammates <span className="text-slate-500 font-normal text-sm">(optional)</span></h2>
                <p className="text-xs text-slate-500 mt-1">You can skip this and add teammates later. UIDs must belong to verified {tournament.game_id?.toUpperCase()} profiles.</p>
              </div>
              {Array.from({ length: need }).map((_, i) => (
                <UidLookupField
                  key={i}
                  gameId={tournament.game_id}
                  label={`Teammate ${i + 1}`}
                  excludeUids={excludeUids}
                  onConfirmed={(data) => setTeammate(i, data)}
                  onClear={() => clearTeammate(i)}
                />
              ))}
            </div>
          )}

          {((step === 3 && need > 0) || (step === 2 && need === 0)) && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-slate-100">Review & Submit</h2>
                <p className="text-xs text-slate-500 mt-1">You can add remaining teammates after registration from your team dashboard.</p>
              </div>
              <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 divide-y divide-slate-700/50">
                <div className="px-4 py-3">
                  <p className="text-[11px] text-slate-500 uppercase tracking-widest">Team</p>
                  <p className="text-sm font-semibold text-slate-100 mt-0.5">{teamName}</p>
                </div>
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="h-7 w-7 rounded-full bg-sky-500/20 flex items-center justify-center text-sky-400 text-xs font-bold flex-shrink-0">
                    {hostGameProfile?.in_game_name?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-200">{hostGameProfile?.in_game_name}</p>
                    <p className="text-[10px] text-slate-600">UID: {hostGameProfile?.game_uid}</p>
                  </div>
                  <Badge color="purple">Captain</Badge>
                </div>
                {teammates.map((t, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3">
                    <div className="h-7 w-7 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 text-xs font-bold flex-shrink-0">
                      {t.inGameName[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-200">{t.inGameName}</p>
                      <p className="text-[10px] text-slate-600">UID: {t.gameUid}</p>
                    </div>
                  </div>
                ))}
                {need > 0 && teammates.length < need && (
                  <div className="px-4 py-3">
                    <p className="text-[11px] text-slate-500">
                      {need - teammates.length} teammate slot{need - teammates.length > 1 ? 's' : ''} empty — can be filled after registration.
                    </p>
                  </div>
                )}
              </div>
              <div className="rounded-xl border border-slate-700/40 bg-slate-800/20 px-4 py-3 flex items-center justify-between">
                <span className="text-xs text-slate-400">Entry Fee</span>
                <span className="text-sm font-semibold text-slate-100">
                  {tournament.entry_fee > 0 ? `₹${tournament.entry_fee}` : 'Free'}
                </span>
              </div>
              {error && <p className="text-xs text-red-400 bg-red-500/10 rounded-xl px-4 py-3">{error}</p>}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-slate-900 border-t border-slate-800 px-5 py-4 flex gap-3">
          {step > 1 && (
            <button onClick={() => setStep(s => s - 1)} className="flex-1 rounded-xl border border-slate-700 py-3 text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors">
              ← Back
            </button>
          )}
          {step === 1 && (
            <button
              onClick={() => setStep(need > 0 ? 2 : 2)}
              disabled={teamName.trim().length < 3}
              className="flex-1 rounded-xl bg-sky-600 py-3 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-40 transition-colors"
            >
              Continue →
            </button>
          )}
          {step === 2 && need > 0 && (
            <button
              onClick={() => setStep(3)}
              className="flex-1 rounded-xl bg-sky-600 py-3 text-sm font-semibold text-white hover:bg-sky-500 transition-colors"
            >
              Review →
            </button>
          )}
          {((step === 3 && need > 0) || (step === 2 && need === 0)) && (
            <button
              onClick={submit}
              disabled={submitting}
              className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-40 transition-colors"
            >
              {submitting ? 'Submitting…' : '✅ Submit Team'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── My Team Dashboard ───────────────────────────────────────────────────────

function MyTeamDashboard({ registration, bracket, matchScores, allScores, tournament }) {
  const status = registration.status
  const totalPoints = matchScores.reduce((s, r) => s + (r.points || 0), 0)

  const teamTotals = {}
  allScores.forEach(row => {
    teamTotals[row.team_name] = (teamTotals[row.team_name] || 0) + (row.points || 0)
  })
  const sorted = Object.entries(teamTotals).sort((a, b) => b[1] - a[1])
  const rank = sorted.findIndex(([name]) => name === registration.team_name) + 1

  return (
    <div className="card space-y-4 border-sky-500/20 bg-sky-500/5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-slate-500">My Team</p>
          <h3 className="text-base font-semibold text-slate-100 mt-0.5">{registration.team_name}</h3>
        </div>
        <Badge color={status === 'approved' ? 'green' : status === 'pending' ? 'yellow' : 'red'}>
          {status === 'approved' ? 'Approved' : status === 'pending' ? 'Pending Review' : status}
        </Badge>
      </div>

      {status === 'pending' && (
        <p className="text-xs text-slate-400 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3">
          ⏳ Your registration is under review. Admin will approve it shortly.
        </p>
      )}

      {status === 'approved' && (
        <>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: 'Total Points', val: totalPoints },
              { label: 'Rank', val: rank > 0 ? `#${rank}` : '—' },
              { label: 'Round', val: bracket ? `${bracket.current_round}/${tournament.total_rounds}` : '—' },
            ].map(({ label, val }) => (
              <div key={label} className="rounded-xl bg-slate-800/60 px-2 py-3">
                <p className="text-sm font-bold text-slate-100">{val}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {matchScores.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-widest text-slate-500">Match History</p>
              {matchScores.map((row, i) => (
                <div key={i} className="flex items-center justify-between rounded-xl border border-slate-700/50 bg-slate-800/40 px-4 py-2.5">
                  <div>
                    <p className="text-xs font-medium text-slate-200">Round {row.round_number ?? '?'} · Match {row.match_number ?? i + 1}</p>
                    <p className="text-[11px] text-slate-500">Pos: {row.position ?? '—'} · Kills: {row.kills ?? '—'}</p>
                  </div>
                  <span className="text-sm font-bold text-sky-300">{row.points ?? 0} pts</span>
                </div>
              ))}
            </div>
          )}

          {matchScores.length === 0 && (
            <p className="text-xs text-slate-500 text-center py-4">
              Match results will appear here once the tournament begins.
            </p>
          )}
        </>
      )}
    </div>
  )
}

// ─── Standings ───────────────────────────────────────────────────────────────

function Standings({ allScores, myTeamName }) {
  const teamTotals = {}
  allScores.forEach(row => {
    if (!teamTotals[row.team_name]) teamTotals[row.team_name] = { points: 0, kills: 0, matches: 0 }
    teamTotals[row.team_name].points += row.points || 0
    teamTotals[row.team_name].kills += row.kills || 0
    teamTotals[row.team_name].matches += 1
  })

  const sorted = Object.entries(teamTotals).sort((a, b) => b[1].points - a[1].points)

  if (sorted.length === 0) {
    return (
      <div className="card text-center py-8">
        <p className="text-sm text-slate-500">Standings will appear once matches are posted.</p>
      </div>
    )
  }

  return (
    <div className="card overflow-hidden p-0">
      <div className="px-4 py-3 border-b border-slate-800">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Live Standings</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-500">
              <th className="px-4 py-2.5 text-left font-medium">#</th>
              <th className="px-4 py-2.5 text-left font-medium">Team</th>
              <th className="px-4 py-2.5 text-right font-medium">Matches</th>
              <th className="px-4 py-2.5 text-right font-medium">Kills</th>
              <th className="px-4 py-2.5 text-right font-medium font-bold text-slate-300">Pts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {sorted.map(([name, stats], i) => {
              const isMe = name === myTeamName
              return (
                <tr key={name} className={`transition-colors ${isMe ? 'bg-sky-500/10' : 'hover:bg-slate-800/30'}`}>
                  <td className="px-4 py-3 text-slate-400">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-medium ${isMe ? 'text-sky-300' : 'text-slate-200'}`}>
                      {name} {isMe && <span className="text-[10px] text-sky-500">(you)</span>}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-400">{stats.matches}</td>
                  <td className="px-4 py-3 text-right text-slate-400">{stats.kills}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-100">{stats.points}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Match Schedule ──────────────────────────────────────────────────────────

function MatchSchedule({ matches, myRegistrationId }) {
  const byRound = {}
  matches.forEach(m => {
    if (!byRound[m.round_number]) byRound[m.round_number] = []
    byRound[m.round_number].push(m)
  })

  if (Object.keys(byRound).length === 0) {
    return (
      <div className="card text-center py-8">
        <p className="text-sm text-slate-500">Match schedule will appear once generated by admin.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {Object.entries(byRound).sort((a, b) => a[0] - b[0]).map(([round, roundMatches]) => (
        <div key={round} className="card space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Round {round}</p>
          {roundMatches.map(m => {
            const isMyMatch = m.team_a_registration_id === myRegistrationId || m.team_b_registration_id === myRegistrationId
            return (
              <div key={m.id} className={`rounded-xl border px-4 py-3 flex items-center justify-between gap-3 ${isMyMatch ? 'border-sky-500/30 bg-sky-500/5' : 'border-slate-700/50 bg-slate-800/30'}`}>
                <div>
                  <p className="text-xs font-medium text-slate-200">Match {m.match_number}</p>
                  {isMyMatch && <p className="text-[10px] text-sky-400 mt-0.5">Your match</p>}
                </div>
                <Badge color={m.status === 'completed' ? 'green' : m.status === 'pending' ? 'yellow' : 'slate'}>
                  {m.status === 'completed' ? 'Done' : m.status === 'pending' ? 'Upcoming' : m.status}
                </Badge>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function LeagueTournamentPage() {
  const { tournamentId } = useParams()
  const navigate = useNavigate()
  const { profile, loading: profileLoading, fetchGameProfile } = usePlayer()

  const [tournament, setTournament] = React.useState(null)
  const [bracket, setBracket] = React.useState(null)
  const [matches, setMatches] = React.useState([])
  const [allScores, setAllScores] = React.useState([])
  const [myRegistration, setMyRegistration] = React.useState(null)
  const [myScores, setMyScores] = React.useState([])
  const [hostGameProfile, setHostGameProfile] = React.useState(null)
  const [gameProfileState, setGameProfileState] = React.useState('loading')
  const [loading, setLoading] = React.useState(true)
  const [showRegister, setShowRegister] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState('standings')
  const [regSuccess, setRegSuccess] = React.useState(false)

  const load = React.useCallback(async () => {
    if (!tournamentId) return
    if (profileLoading) return

    setLoading(true)
    setGameProfileState('loading')

    const [{ data: t }, { data: b }, { data: m }, { data: scores }] = await Promise.all([
      supabasePlayer.from('tournaments').select('*').eq('id', tournamentId).maybeSingle(),
      supabasePlayer.from('long_brackets').select('*').eq('tournament_id', tournamentId).maybeSingle(),
      supabasePlayer.from('long_br_matches').select('*').eq('tournament_id', tournamentId).order('round_number').order('match_number'),
      supabasePlayer.from('long_br_match_scores').select('*, long_br_matches(round_number, match_number)').eq('long_br_matches.tournament_id', tournamentId),
    ])

    setTournament(t || null)
    setBracket(b || null)
    setMatches(m || [])

    const flatScores = (scores || []).map(s => ({
      ...s,
      round_number: s.long_br_matches?.round_number,
      match_number: s.long_br_matches?.match_number,
    }))
    setAllScores(flatScores)

    if (profile?.id) {
      const { data: reg } = await supabasePlayer
        .from('tournament_registrations')
        .select('id, team_name, status, host_player_id')
        .eq('tournament_id', tournamentId)
        .eq('host_player_id', profile.id)
        .maybeSingle()

      let myReg = reg
      if (!myReg) {
        const { data: memRow } = await supabasePlayer
          .from('registration_members')
          .select('registration_id, tournament_registrations(id, team_name, status, host_player_id)')
          .eq('player_id', profile.id)
          .eq('tournament_registrations.tournament_id', tournamentId)
          .maybeSingle()
        myReg = memRow?.tournament_registrations || null
      }

      setMyRegistration(myReg || null)

      if (myReg) {
        const myTeamScores = flatScores.filter(s => s.team_name === myReg.team_name)
        setMyScores(myTeamScores)
      }

      if (t?.game_id) {
        const gp = await fetchGameProfile(profile.id, t.game_id)
        setHostGameProfile(gp)
        setGameProfileState('done')
      } else {
        setGameProfileState('done')
      }
    } else {
      setGameProfileState('done')
    }

    setLoading(false)
  }, [tournamentId, profile?.id, profileLoading])

  React.useEffect(() => { load() }, [load])

  function handleRegSuccess() {
    setShowRegister(false)
    setRegSuccess(true)
    load()
  }

  if (loading || profileLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-6 w-2/3 rounded bg-slate-700" />
        <div className="h-4 w-1/3 rounded bg-slate-800" />
        <div className="card space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-4 rounded bg-slate-700" />)}
        </div>
      </div>
    )
  }

  if (!tournament) {
    return (
      <div className="card text-center py-12 space-y-3">
        <p className="text-slate-400">Tournament not found.</p>
        <button onClick={() => navigate('/league')} className="btn-secondary text-sm">← Back to League</button>
      </div>
    )
  }

  // Bug 1 fix: check for 'verified' (the actual DB value), not 'approved'
  const profileNotApproved =
    gameProfileState === 'done' &&
    (!hostGameProfile || hostGameProfile.status !== 'verified')

  const canRegister = !myRegistration
    && tournament.status !== 'completed'
    && tournament.registration_status !== 'closed'
    && !profileNotApproved

  const tabs = [
    { id: 'standings', label: '🏆 Standings' },
    { id: 'schedule', label: '📅 Schedule' },
    ...(myRegistration ? [{ id: 'myteam', label: '👥 My Team' }] : []),
  ]

  return (
    <>
      <div className="space-y-5">
        <button onClick={() => navigate('/league')} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors">
          ← The League
        </button>

        <div className="card space-y-3">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-slate-500">
                {tournament.game_id?.toUpperCase()} · {tournament.mode_label || tournament.mode}
              </p>
              <h1 className="text-lg font-semibold text-slate-100 mt-1">{tournament.title}</h1>
            </div>
            <Badge color={tournament.status === 'ongoing' ? 'blue' : tournament.status === 'completed' ? 'green' : 'yellow'}>
              {tournament.status === 'ongoing' ? 'Live' : tournament.status === 'completed' ? 'Ended' : 'Upcoming'}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-2 text-[11px]">
            <span className="bg-slate-800 rounded-full px-2.5 py-1 text-slate-400">
              {tournament.filled_slots || 0}/{tournament.max_slots} teams
            </span>
            <span className="bg-slate-800 rounded-full px-2.5 py-1 text-slate-400">
              {tournament.total_rounds} rounds
            </span>
            {tournament.prize_text && (
              <span className="bg-slate-800 rounded-full px-2.5 py-1 text-slate-400">
                🏆 {tournament.prize_text}
              </span>
            )}
            {bracket && (
              <span className="bg-sky-500/15 border border-sky-500/30 rounded-full px-2.5 py-1 text-sky-300">
                Round {bracket.current_round} active
              </span>
            )}
          </div>

          {regSuccess && (
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-xs text-emerald-300">
              ✅ Registration submitted! Waiting for admin approval.
            </div>
          )}

          {!myRegistration && !regSuccess && profile && (
            <>
              {gameProfileState === 'loading' ? (
                <div className="rounded-xl bg-slate-800/60 px-4 py-3 text-xs text-slate-500 animate-pulse">
                  Checking your game profile…
                </div>
              ) : profileNotApproved ? (
                <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/20 px-4 py-3 text-xs text-yellow-300">
                  ⚠️ You need a verified {tournament.game_id?.toUpperCase()} profile to register.{' '}
                  <Link to={`/${tournament.game_id}/setup`} className="underline">Set up profile →</Link>
                </div>
              ) : canRegister ? (
                <button onClick={() => setShowRegister(true)} className="btn-primary w-full">
                  Register Team
                </button>
              ) : null}
            </>
          )}

          {myRegistration && !regSuccess && (
            <div className="flex items-center justify-between rounded-xl bg-sky-500/10 border border-sky-500/20 px-4 py-2.5">
              <p className="text-xs text-sky-300">You're registered as <strong>{myRegistration.team_name}</strong></p>
              <button onClick={() => setActiveTab('myteam')} className="text-[11px] text-sky-400 underline">View →</button>
            </div>
          )}
        </div>

        <div className="flex gap-1 rounded-xl bg-slate-800/60 p-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 rounded-lg py-2 text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-slate-700 text-slate-100 shadow-sm'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'standings' && (
          <Standings allScores={allScores} myTeamName={myRegistration?.team_name} />
        )}
        {activeTab === 'schedule' && (
          <MatchSchedule matches={matches} myRegistrationId={myRegistration?.id} />
        )}
        {activeTab === 'myteam' && myRegistration && (
          <MyTeamDashboard
            registration={myRegistration}
            bracket={bracket}
            matchScores={myScores}
            allScores={allScores}
            tournament={tournament}
          />
        )}
      </div>

      {showRegister && hostGameProfile && (
        <RegisterSheet
          tournament={tournament}
          playerProfile={profile}
          hostGameProfile={hostGameProfile}
          onClose={() => setShowRegister(false)}
          onSuccess={handleRegSuccess}
        />
      )}
    </>
  )
}
