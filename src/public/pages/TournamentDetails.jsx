import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabasePlayer } from '../../lib/supabaseClient'
import { usePlayer } from '../../lib/PlayerContext'
import { getModeLabel } from '../../lib/constants'

function getTeammateUids(reg) {
  const src = Array.isArray(reg?.teammate_uids)
    ? reg.teammate_uids
    : Array.isArray(reg?.teammates)
      ? reg.teammates.map(t => t?.game_uid).filter(Boolean)
      : []
  return [...new Set(src.filter(Boolean).map(v => String(v).trim()).filter(Boolean))]
}

function LoadingDots() {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="w-1 h-1 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.3s]" />
      <span className="w-1 h-1 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.15s]" />
      <span className="w-1 h-1 rounded-full bg-slate-400 animate-bounce" />
    </span>
  )
}

function DetailRow({ label, value, highlight = false }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400">{label}</div>
      <div className={`mt-1 text-sm font-semibold ${highlight ? 'text-sky-300' : 'text-slate-100'}`}>{value || '—'}</div>
    </div>
  )
}

function StatPill({ label, value, tone = 'default' }) {
  const toneClass =
    tone === 'success'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
      : tone === 'warning'
        ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
        : tone === 'danger'
          ? 'border-rose-500/30 bg-rose-500/10 text-rose-300'
          : 'border-white/10 bg-white/[0.04] text-slate-200'
  return (
    <div className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold ${toneClass}`}>
      <span className="text-slate-400 mr-1">{label}:</span>{value}
    </div>
  )
}

function SectionCard({ title, subtitle, children, right }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#111827]/90 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.85)] overflow-hidden backdrop-blur-sm">
      <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
          {subtitle ? <p className="mt-1 text-xs text-slate-400">{subtitle}</p> : null}
        </div>
        {right ? <div>{right}</div> : null}
      </div>
      <div className="px-5 py-4">{children}</div>
    </section>
  )
}

function StatusBadge({ status }) {
  const map = {
    upcoming:   'border-sky-500/30 bg-sky-500/10 text-sky-300',
    ongoing:    'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    ended:      'border-slate-500/30 bg-slate-500/10 text-slate-400',
    cancelled:  'border-rose-500/30 bg-rose-500/10 text-rose-300',
  }
  const cls = map[status] || 'border-white/10 bg-white/[0.04] text-slate-300'
  return (
    <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${cls}`}>
      {status || 'unknown'}
    </span>
  )
}

// ─── Results Panel ────────────────────────────────────────────────────────────
// Fetches match results from the DB when status is ended.
// Covers: CS/LW (rounds from single_matches + cs_lw_results), BR, TDM.
function ResultsPanel({ tournament }) {
  const [loading, setLoading] = React.useState(false)
  const [matchResults, setMatchResults] = React.useState(null) // for CS/LW bracket matches

  const isBR  = tournament?.mode === 'br'
  const isCSLW = tournament?.mode === 'cs' || tournament?.mode === 'lw'
  const isTDM  = tournament?.mode === 'tdm'

  // Static results stored directly on the tournament row
  const hasBRResults  = isBR  && Array.isArray(tournament.single_br_results)  && tournament.single_br_results.length  > 0
  const hasCSLWStatic = isCSLW && Array.isArray(tournament.cs_lw_results)      && tournament.cs_lw_results.length      > 0
  const hasTDMResults = isTDM  && Array.isArray(tournament.tdm_results)        && tournament.tdm_results.length        > 0

  const isEnded = tournament?.status === 'ended'

  // Fetch bracket-based match results for CS/LW single tournaments
  React.useEffect(() => {
    if (!isEnded) return
    if (!isCSLW) return
    if (hasCSLWStatic) return // already have them inline
    let mounted = true
    setLoading(true)
    async function fetchMatchResults() {
      // single_matches table stores individual bracket matches with winner info
      const { data: matches } = await supabasePlayer
        .from('single_matches')
        .select('*')
        .eq('tournament_id', tournament.id)
        .order('round_no', { ascending: true })
        .order('match_no', { ascending: true })
      if (!mounted) return
      setMatchResults(matches || [])
      setLoading(false)
    }
    fetchMatchResults()
    return () => { mounted = false }
  }, [tournament?.id, isEnded, isCSLW, hasCSLWStatic])

  if (!isEnded) return null

  return (
    <SectionCard title="Results" subtitle="Final standings for this tournament.">
      <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
        This tournament has ended. Final results are shown below.
      </div>

      {/* ── BR results ── */}
      {hasBRResults && (
        <div className="overflow-hidden rounded-xl border border-white/10">
          <table className="min-w-full divide-y divide-white/10 text-sm">
            <thead className="bg-white/[0.04] text-[11px] uppercase tracking-[0.18em] text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Team</th>
                <th className="px-4 py-3 text-left">Kills</th>
                <th className="px-4 py-3 text-left">Position</th>
                <th className="px-4 py-3 text-left">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-200">
              {tournament.single_br_results.map((row, i) => (
                <tr key={`${row.team_name}-${i}`}>
                  <td className="px-4 py-3 text-slate-400 font-semibold">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-slate-100">{row.team_name}</td>
                  <td className="px-4 py-3">{row.kills ?? 0}</td>
                  <td className="px-4 py-3">{row.position ?? '—'}</td>
                  <td className="px-4 py-3 font-semibold text-sky-300">{row.points ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── CS / LW static results (from tournament column) ── */}
      {hasCSLWStatic && (
        <div className="overflow-hidden rounded-xl border border-white/10">
          <table className="min-w-full divide-y divide-white/10 text-sm">
            <thead className="bg-white/[0.04] text-[11px] uppercase tracking-[0.18em] text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Team</th>
                <th className="px-4 py-3 text-left">Wins</th>
                <th className="px-4 py-3 text-left">Losses</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-200">
              {tournament.cs_lw_results.map((row, i) => (
                <tr key={`${row.team_name}-${i}`}>
                  <td className="px-4 py-3 text-slate-400 font-semibold">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-slate-100">{row.team_name}</td>
                  <td className="px-4 py-3">{row.wins ?? 0}</td>
                  <td className="px-4 py-3">{row.losses ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── CS / LW bracket match results (fetched from single_matches) ── */}
      {isCSLW && !hasCSLWStatic && (
        loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <LoadingDots /><span>Loading match results…</span>
          </div>
        ) : matchResults && matchResults.length > 0 ? (
          <div className="space-y-4">
            {/* Group by round */}
            {Array.from(new Set(matchResults.map(m => m.round_no))).map(round => {
              const roundMatches = matchResults.filter(m => m.round_no === round)
              return (
                <div key={round}>
                  <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-slate-400 font-semibold">Round {round}</div>
                  <div className="space-y-2">
                    {roundMatches.map((match, mi) => {
                      const teams = Array.isArray(match.teams) ? match.teams : []
                      const winner = match.winner_team_name || match.winner
                      return (
                        <div key={match.id || mi} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                          <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500 mb-3">
                            Match {match.match_no}
                            {match.status === 'completed' && (
                              <span className="ml-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-emerald-400">Completed</span>
                            )}
                          </div>
                          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                            {/* Team A */}
                            {teams[0] ? (
                              <div className={`rounded-xl border p-3 text-center ${
                                winner === teams[0].team_name
                                  ? 'border-emerald-500/40 bg-emerald-500/10'
                                  : 'border-white/10 bg-white/[0.02]'
                              }`}>
                                <div className={`text-sm font-bold ${
                                  winner === teams[0].team_name ? 'text-emerald-300' : 'text-slate-100'
                                }`}>{teams[0].team_name}</div>
                                {(match.team_a_rounds != null || teams[0].rounds_won != null) && (
                                  <div className="mt-1 text-2xl font-black text-slate-100">
                                    {match.team_a_rounds ?? teams[0].rounds_won ?? 0}
                                  </div>
                                )}
                                {winner === teams[0].team_name && (
                                  <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">Winner</div>
                                )}
                              </div>
                            ) : (
                              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-center text-slate-600">TBD</div>
                            )}

                            <div className="text-xs font-bold text-slate-500">VS</div>

                            {/* Team B */}
                            {teams[1] ? (
                              <div className={`rounded-xl border p-3 text-center ${
                                winner === teams[1].team_name
                                  ? 'border-emerald-500/40 bg-emerald-500/10'
                                  : 'border-white/10 bg-white/[0.02]'
                              }`}>
                                <div className={`text-sm font-bold ${
                                  winner === teams[1].team_name ? 'text-emerald-300' : 'text-slate-100'
                                }`}>{teams[1].team_name}</div>
                                {(match.team_b_rounds != null || teams[1].rounds_won != null) && (
                                  <div className="mt-1 text-2xl font-black text-slate-100">
                                    {match.team_b_rounds ?? teams[1].rounds_won ?? 0}
                                  </div>
                                )}
                                {winner === teams[1].team_name && (
                                  <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">Winner</div>
                                )}
                              </div>
                            ) : (
                              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-center text-slate-600">TBD</div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
            Results are not available yet.
          </div>
        )
      )}

      {/* ── TDM results ── */}
      {hasTDMResults && (
        <div className="overflow-hidden rounded-xl border border-white/10 mt-4">
          <table className="min-w-full divide-y divide-white/10 text-sm">
            <thead className="bg-white/[0.04] text-[11px] uppercase tracking-[0.18em] text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Team</th>
                <th className="px-4 py-3 text-left">Kills</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-200">
              {tournament.tdm_results.map((row, i) => (
                <tr key={`${row.team_name}-${i}`}>
                  <td className="px-4 py-3 text-slate-400 font-semibold">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-slate-100">{row.team_name}</td>
                  <td className="px-4 py-3">{row.kills ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* No results at all */}
      {!hasBRResults && !hasCSLWStatic && !hasTDMResults && (!isCSLW || (!loading && (!matchResults || matchResults.length === 0))) && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
          Results are not available yet.
        </div>
      )}
    </SectionCard>
  )
}

function BRRulesSection({ gameName }) {
  const label = String(gameName || '').toLowerCase()
  const isBgmi = label.includes('bgmi') || label.includes('pubg')
  const rules = isBgmi
    ? [
        'All players must join the custom room using the same registered account and in-game UID.',
        'Teaming, spectator abuse, emulator use, hacks, scripts, or exploit abuse leads to disqualification.',
        'Players must be ready before the room closes. Late join requests may be ignored by the organizer.',
        'Points are counted using placement plus kills exactly as published by the organizer.',
        'Any dispute must be raised with valid proof soon after the match ends.'
      ]
    : [
        'Use the registered account and nickname while joining the room.',
        'No cheating, teaming, external tools, or exploit abuse is allowed.',
        'Be present before the match starts; late join requests are not guaranteed.',
        'Standings are based on the published placement and elimination rules for this event.',
        'Disputes should be reported quickly with screenshots or recordings.'
      ]
  return (
    <SectionCard title="Battle royale rules" subtitle="Important match rules for registered teams.">
      <ul className="space-y-2 text-sm text-slate-300">
        {rules.map((rule, idx) => (
          <li key={idx} className="flex gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
            <span className="mt-0.5 text-sky-300">•</span>
            <span>{rule}</span>
          </li>
        ))}
      </ul>
    </SectionCard>
  )
}

function LockedHint({ text }) {
  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
      {text}
    </div>
  )
}

function RoomCodeCard({ tournamentId, hasJoined, myRegLoading }) {
  const [roomCode, setRoomCode] = React.useState(undefined)
  const [copied, setCopied] = React.useState(false)

  React.useEffect(() => {
    let mounted = true
    async function loadRoomCode() {
      const { data } = await supabasePlayer
        .from('room_codes')
        .select('*')
        .eq('tournament_id', tournamentId)
        .maybeSingle()
      if (mounted) setRoomCode(data || null)
    }
    if (tournamentId) loadRoomCode()

    const channel = supabasePlayer
      .channel(`room_code:${tournamentId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'room_codes', filter: `tournament_id=eq.${tournamentId}` },
        (payload) => {
          if (!mounted) return
          if (payload.eventType === 'DELETE') setRoomCode(null)
          else if (payload.new) setRoomCode(payload.new)
        }
      )
      .subscribe()

    return () => { mounted = false; supabasePlayer.removeChannel(channel) }
  }, [tournamentId])

  const copy = async (value) => {
    try {
      await navigator.clipboard.writeText(String(value || ''))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (_) {}
  }

  if (roomCode === undefined || myRegLoading) {
    return (
      <SectionCard title="Room code" subtitle="Checking eligibility and room details.">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <LoadingDots /><span>Loading room information…</span>
        </div>
      </SectionCard>
    )
  }

  if (!roomCode || !roomCode.is_revealed) {
    return (
      <SectionCard title="Room code" subtitle="The organizer has not revealed room credentials yet.">
        <LockedHint text="Room ID and password will appear here once the organizer reveals them." />
      </SectionCard>
    )
  }

  if (!hasJoined) {
    return (
      <SectionCard title="Room code" subtitle="Only joined teams can view room credentials.">
        <LockedHint text="Join this tournament first to unlock the room ID and password." />
      </SectionCard>
    )
  }

  return (
    <SectionCard
      title="Room code"
      subtitle="Use these exact credentials in-game."
      right={copied ? <span className="text-[11px] text-emerald-300">Copied</span> : null}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
          <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Room ID</div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <div className="text-lg font-semibold text-slate-100 break-all">{roomCode.room_id || '—'}</div>
            <button onClick={() => copy(roomCode.room_id)} className="rounded-lg border border-sky-500/20 bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-300 hover:bg-sky-500/20">Copy</button>
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
          <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Password</div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <div className="text-lg font-semibold text-slate-100 break-all">{roomCode.room_password || '—'}</div>
            <button onClick={() => copy(roomCode.room_password)} className="rounded-lg border border-sky-500/20 bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-300 hover:bg-sky-500/20">Copy</button>
          </div>
        </div>
      </div>
    </SectionCard>
  )
}

function RegisteredTeamsList({ tournamentId, teamSize }) {
  const [rows, setRows] = React.useState([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    let mounted = true
    async function loadRows() {
      setLoading(true)
      const { data } = await supabasePlayer
        .from('tournament_registrations')
        .select('*')
        .eq('tournament_id', tournamentId)
        .not('status', 'in', '(rejected,cancelled)')
        .order('created_at', { ascending: true })
      if (mounted) { setRows(data || []); setLoading(false) }
    }
    if (tournamentId) loadRows()
    return () => { mounted = false }
  }, [tournamentId])

  return (
    <SectionCard title="Registered teams" subtitle="Live registration list for this tournament.">
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-400"><LoadingDots /><span>Loading registrations…</span></div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">No registrations yet.</div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10">
          <table className="min-w-full divide-y divide-white/10 text-sm">
            <thead className="bg-white/[0.04] text-[11px] uppercase tracking-[0.18em] text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Team</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Size</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-200">
              {rows.map((row, idx) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 text-slate-400 font-semibold">{idx + 1}</td>
                  <td className="px-4 py-3 font-medium text-slate-100">{row.team_name || 'Unnamed team'}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${row.status === 'confirmed' ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border border-amber-500/30 bg-amber-500/10 text-amber-300'}`}>
                      {row.status || 'pending'}
                    </span>
                  </td>
                  <td className="px-4 py-3">{teamSize || row.team_size || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  )
}

function LongTournamentPanel({ tournamentId, myReg, totalRounds }) {
  const [loading, setLoading] = React.useState(true)
  const [bracket, setBracket] = React.useState(null)
  const [allMatches, setAllMatches] = React.useState([])
  const [allScoreRows, setAllScoreRows] = React.useState([])
  const [myMatchData, setMyMatchData] = React.useState(null)

  React.useEffect(() => {
    let mounted = true
    async function loadLongData() {
      setLoading(true)

      const [{ data: bkt }, { data: matches }, { data: scores }] = await Promise.all([
        supabasePlayer.from('long_brackets').select('*').eq('tournament_id', tournamentId).maybeSingle(),
        supabasePlayer.from('long_br_matches').select('*').eq('tournament_id', tournamentId).order('round_no', { ascending: true }).order('match_no', { ascending: true }),
        supabasePlayer.from('long_br_match_scores').select('*').eq('tournament_id', tournamentId).order('round_no', { ascending: true }).order('match_no', { ascending: true })
      ])

      if (!mounted) return

      const matchRows = matches || []
      const scoreRows = scores || []
      setBracket(bkt || null)
      setAllMatches(matchRows)
      setAllScoreRows(scoreRows)

      if (matchRows.length && myReg?.team_name) {
        const myMatch = matchRows.find(m => {
          const teams = Array.isArray(m?.teams) ? m.teams : []
          return teams.some(t => t?.team_name === myReg.team_name)
        }) || null

        if (myMatch) {
          const teamsInMyMatch = Array.isArray(myMatch.teams) ? myMatch.teams : []
          const slotIdx = teamsInMyMatch.findIndex(t => t?.team_name === myReg.team_name)
          setMyMatchData({ ...myMatch, slot_index: slotIdx })
        } else {
          setMyMatchData(null)
        }
      } else {
        setMyMatchData(null)
      }

      setLoading(false)
    }

    if (tournamentId) loadLongData()
    return () => { mounted = false }
  }, [tournamentId, myReg?.team_name])

  if (loading) {
    return (
      <SectionCard title="Bracket progress" subtitle="Loading your bracket and round status.">
        <div className="flex items-center gap-2 text-sm text-slate-400"><LoadingDots /><span>Loading bracket…</span></div>
      </SectionCard>
    )
  }

  return (
    <div className="space-y-5">
      <SectionCard title="Bracket progress" subtitle={`Tournament bracket — ${totalRounds || bracket?.total_rounds || 'multiple'} rounds.`}>
        {bracket ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <DetailRow label="Current round" value={`Round ${bracket.current_round || 1}`} highlight />
            <DetailRow label="Total rounds" value={String(bracket.total_rounds || totalRounds || '—')} />
            <DetailRow label="Qualified teams" value={String(bracket.qualified_count || 0)} />
            <DetailRow label="Bracket status" value={bracket.status || 'pending'} />
          </div>
        ) : (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">Bracket has not been generated yet.</div>
        )}
      </SectionCard>

      {myReg && myMatchData && (
        <SectionCard title="Your current match" subtitle="Your match slot, round, and current scoring.">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <DetailRow label="Team" value={myReg.team_name} highlight />
            <DetailRow label="Round" value={`Round ${myMatchData.round_no || '—'}`} />
            <DetailRow label="Match" value={`Match ${myMatchData.match_no || '—'}`} />
            <DetailRow label="Status" value={myMatchData.status || 'pending'} />
          </div>

          {Array.isArray(myMatchData.teams) && myMatchData.teams.length > 0 ? (
            <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
              <table className="min-w-full divide-y divide-white/10 text-sm">
                <thead className="bg-white/[0.04] text-[11px] uppercase tracking-[0.18em] text-slate-400">
                  <tr>
                    <th className="px-4 py-3 text-left">Slot</th>
                    <th className="px-4 py-3 text-left">Team</th>
                    <th className="px-4 py-3 text-left">Kills</th>
                    <th className="px-4 py-3 text-left">Position</th>
                    <th className="px-4 py-3 text-left">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-200">
                  {myMatchData.teams.map((t, ti) => {
                    const row = allScoreRows.find(s =>
                      s.round_no === myMatchData.round_no &&
                      s.match_no === myMatchData.match_no &&
                      s.team_name === t.team_name
                    )
                    const isMe = t.team_name === myReg?.team_name
                    return (
                      <tr key={t.team_name + ti} className={isMe ? 'bg-sky-500/10' : ''}>
                        <td className="px-4 py-3 text-slate-400 font-semibold">{ti + 1}</td>
                        <td className={`px-4 py-3 font-medium ${isMe ? 'text-sky-300' : 'text-slate-100'}`}>
                          {t.team_name} {isMe ? <span className="ml-1 text-[10px] text-sky-400">(you)</span> : null}
                        </td>
                        <td className="px-4 py-3">{row?.kills ?? '—'}</td>
                        <td className="px-4 py-3">{row?.position ?? '—'}</td>
                        <td className="px-4 py-3 font-semibold text-sky-300">{row?.points ?? '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </SectionCard>
      )}

      {allScoreRows.length > 0 ? (
        <SectionCard title="Overall bracket standings" subtitle="All published score rows across rounds.">
          <div className="overflow-hidden rounded-xl border border-white/10">
            <table className="min-w-full divide-y divide-white/10 text-sm">
              <thead className="bg-white/[0.04] text-[11px] uppercase tracking-[0.18em] text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left">Round</th>
                  <th className="px-4 py-3 text-left">Match</th>
                  <th className="px-4 py-3 text-left">Team</th>
                  <th className="px-4 py-3 text-left">Kills</th>
                  <th className="px-4 py-3 text-left">Position</th>
                  <th className="px-4 py-3 text-left">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-200">
                {allScoreRows.map((row, i) => (
                  <tr key={row.team_name + i} className={row.team_name === myReg?.team_name ? 'bg-sky-500/10' : ''}>
                    <td className="px-4 py-3">{row.round_no}</td>
                    <td className="px-4 py-3">{row.match_no}</td>
                    <td className={`px-4 py-3 font-medium ${row.team_name === myReg?.team_name ? 'text-sky-300' : 'text-slate-100'}`}>{row.team_name}</td>
                    <td className="px-4 py-3">{row.kills ?? 0}</td>
                    <td className="px-4 py-3">{row.position ?? '—'}</td>
                    <td className="px-4 py-3 font-semibold text-sky-300">{row.points ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      ) : null}
    </div>
  )
}

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
      <label className="block text-xs font-medium text-slate-400">
        {label}
        <span className="ml-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] text-sky-400">must be verified</span>
      </label>
      <div className="flex gap-2">
        <input
          value={uid}
          onChange={handleChange}
          inputMode="text"
          placeholder="Enter in-game UID…"
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
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-slate-100">{found.in_game_name}</p>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-400">✓ Verified</span>
            </div>
            <p className="text-[11px] text-slate-500">UID: {found.game_uid}</p>
          </div>
          <button onClick={handleConfirm} className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 transition-colors">Add ✓</button>
        </div>
      )}
      {state === 'error' && (
        <p className="text-[11px] text-rose-400">{found?.error || 'No verified profile found for this UID.'}</p>
      )}
    </div>
  )
}

function RegisterSheet({ tournament, playerProfile, hostGameProfile, onClose, onSuccess }) {
  const need = Math.max(0, (tournament.team_size || 1) - 1)
  const [step, setStep] = React.useState(1)
  const [teamName, setTeamName] = React.useState('')
  const [teammates, setTeammates] = React.useState([])
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState('')

  const teamSize = tournament.team_size || 1

  function addTeammate(data) { setTeammates(prev => [...prev, data]) }
  function clearTeammate(idx) {
    setTeammates(prev => { const next = [...prev]; next[idx] = undefined; return next.filter(Boolean) })
  }

  const reviewStep = need > 0 ? 3 : 2
  const totalSteps = reviewStep

  async function submit() {
    setSubmitting(true); setError('')
    try {
      const { data: reg, error: regErr } = await supabasePlayer
        .from('tournament_registrations')
        .insert({
          tournament_id: tournament.id,
          player_id: playerProfile.id,
          host_player_id: playerProfile.id,
          host_uid: hostGameProfile.game_uid,
          host_ign: hostGameProfile.in_game_name || '',
          team_name: teamName.trim(),
          status: 'pending',
          team_size: teamSize,
        })
        .select('id').single()
      if (regErr) throw regErr

      const members = [
        { registration_id: reg.id, player_id: playerProfile.id, slot: 1, game_uid: hostGameProfile.game_uid, in_game_name: hostGameProfile.in_game_name },
        ...teammates.map((t, i) => ({ registration_id: reg.id, player_id: t.playerId, slot: i + 2, game_uid: t.gameUid, in_game_name: t.inGameName })),
      ]
      const { error: memErr } = await supabasePlayer.from('registration_members').insert(members)
      if (memErr) throw memErr

      if (tournament.max_teams) {
        const { count } = await supabasePlayer
          .from('tournament_registrations')
          .select('id', { count: 'exact', head: true })
          .eq('tournament_id', tournament.id)
          .not('status', 'in', '(rejected,cancelled)')
        if (count >= tournament.max_teams) {
          await supabasePlayer
            .from('tournaments')
            .update({ registration_status: 'closed', status: 'ongoing' })
            .eq('id', tournament.id)
        }
      }
      onSuccess()
    } catch (e) {
      setError(e.message || 'Registration failed. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-slate-900 border border-slate-700/60 max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-1 sm:hidden"><div className="h-1 w-10 rounded-full bg-slate-700" /></div>
        <div className="sticky top-0 z-10 bg-slate-900 border-b border-slate-800 px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-slate-500 uppercase tracking-widest">Register Team</p>
            <p className="text-sm font-semibold text-slate-100 mt-0.5 truncate max-w-[240px]">{tournament.name}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors">✕</button>
        </div>
        <div className="flex gap-1.5 px-5 pt-4">
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map(s => (
            <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${s <= step ? 'bg-sky-500' : 'bg-slate-700'}`} />
          ))}
        </div>
        <div className="px-5 py-5 space-y-5">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-slate-100">Team name</h2>
                <p className="text-xs text-slate-500 mt-1">Choose a name for your team in this tournament.</p>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3">
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-1">Your in-game profile</div>
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-sky-500/20 flex items-center justify-center text-sky-300 text-sm font-bold">
                    {(hostGameProfile.in_game_name || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-100">{hostGameProfile.in_game_name}</div>
                    <div className="text-[11px] text-slate-500">UID: {hostGameProfile.game_uid}</div>
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-400">Team name</label>
                <input
                  value={teamName}
                  onChange={e => setTeamName(e.target.value)}
                  placeholder="e.g. Team Alpha, Dark Knights…"
                  maxLength={32}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:border-sky-500/50 focus:outline-none focus:ring-1 focus:ring-sky-500/30"
                />
                <div className="text-right text-[11px] text-slate-600">{teamName.length}/32</div>
              </div>
              <button
                onClick={() => { if (teamName.trim().length >= 2) setStep(need > 0 ? 2 : reviewStep) }}
                disabled={teamName.trim().length < 2}
                className="w-full rounded-xl bg-sky-600 py-3 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Continue →
              </button>
            </div>
          )}
          {step === 2 && need > 0 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-slate-100">Add teammates</h2>
                <p className="text-xs text-slate-500 mt-1">Search by in-game UID. Teammates must have a verified profile.</p>
              </div>
              {Array.from({ length: need }, (_, i) => (
                <UidLookupField
                  key={i}
                  gameId={tournament.game_id}
                  label={`Teammate ${i + 1}`}
                  excludeUids={[hostGameProfile.game_uid, ...teammates.filter((_, ti) => ti !== i).map(t => t?.gameUid).filter(Boolean)]}
                  onConfirmed={data => {
                    setTeammates(prev => {
                      const next = [...prev]
                      next[i] = data
                      return next
                    })
                  }}
                  onClear={() => clearTeammate(i)}
                />
              ))}
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 rounded-xl border border-slate-700 py-3 text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors">← Back</button>
                <button onClick={() => setStep(reviewStep)} className="flex-1 rounded-xl bg-sky-600 py-3 text-sm font-semibold text-white hover:bg-sky-500 transition-colors">Continue →</button>
              </div>
            </div>
          )}
          {step === reviewStep && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-slate-100">Review & Submit</h2>
                <p className="text-xs text-slate-500 mt-1">Check your team details before submitting.</p>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-800/40 divide-y divide-slate-700/60">
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-xs text-slate-500">Team name</span>
                  <span className="text-sm font-semibold text-slate-100">{teamName}</span>
                </div>
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-xs text-slate-500">Host</span>
                  <span className="text-sm text-slate-200">{hostGameProfile.in_game_name} <span className="text-slate-500 text-[11px]">({hostGameProfile.game_uid})</span></span>
                </div>
                {teammates.length > 0 && teammates.map((t, i) => (
                  <div key={i} className="px-4 py-3 flex items-center justify-between">
                    <span className="text-xs text-slate-500">Teammate {i + 1}</span>
                    <span className="text-sm text-slate-200">{t.inGameName} <span className="text-slate-500 text-[11px]">({t.gameUid})</span></span>
                  </div>
                ))}
              </div>
              {error && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</div>
              )}
              <div className="flex gap-3">
                <button onClick={() => setStep(need > 0 ? 2 : 1)} className="flex-1 rounded-xl border border-slate-700 py-3 text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors">← Back</button>
                <button
                  onClick={submit}
                  disabled={submitting}
                  className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? 'Submitting…' : 'Submit Registration'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Page Component ─────────────────────────────────────────────────────
export default function TournamentDetails() {
  const { gameId, id } = useParams()
  const navigate = useNavigate()
  const { user, profile, loading: authLoading } = usePlayer()

  const [tournament, setTournament] = React.useState(null)
  const [loading, setLoading] = React.useState(true)
  const [myReg, setMyReg] = React.useState(null)
  const [myRegLoading, setMyRegLoading] = React.useState(true)
  const [regCheckKey, setRegCheckKey] = React.useState(0)
  const [showRegSheet, setShowRegSheet] = React.useState(false)
  const [hostGameProfile, setHostGameProfile] = React.useState(null)
  const [success, setSuccess] = React.useState('')
  const [regError, setRegError] = React.useState('')

  React.useEffect(() => {
    let mounted = true
    async function loadTournament() {
      setLoading(true)
      const { data } = await supabasePlayer
        .from('tournaments')
        .select('*')
        .eq('id', id)
        .maybeSingle()
      if (mounted) { setTournament(data || null); setLoading(false) }
    }
    if (id) loadTournament()
    return () => { mounted = false }
  }, [id])

  React.useEffect(() => {
    let mounted = true
    async function checkMyReg() {
      setMyRegLoading(true)
      if (authLoading) return
      if (!user || !profile?.id || !id) {
        setMyReg(null)
        setMyRegLoading(false)
        return
      }
      if (!tournament) return

      const tournamentGameId = tournament.game_id

      const { data: asHost } = await supabasePlayer
        .from('tournament_registrations')
        .select('id, team_name, status, host_uid, tournament_id')
        .eq('tournament_id', id)
        .eq('player_id', profile.id)
        .not('status', 'in', '(rejected,cancelled)')
        .maybeSingle()

      if (!mounted) return
      if (asHost) { setMyReg(asHost); setMyRegLoading(false); return }

      const { data: asMember } = await supabasePlayer
        .from('registration_members')
        .select('registration_id, game_uid, tournament_registrations!inner(id, team_name, status, host_uid, tournament_id)')
        .eq('player_id', profile.id)
        .eq('game_uid', (await supabasePlayer
          .from('game_profiles')
          .select('game_uid')
          .eq('player_id', profile.id)
          .eq('game_id', tournamentGameId)
          .eq('status', 'verified')
          .maybeSingle()
        ).data?.game_uid || '')
        .not('tournament_registrations.status', 'in', '(rejected,cancelled)')
        .eq('tournament_registrations.tournament_id', id)
        .maybeSingle()

      if (!mounted) return
      setMyReg(asMember?.tournament_registrations ?? null)
      setMyRegLoading(false)
    }
    checkMyReg()
    return () => { mounted = false }
  }, [authLoading, user, profile?.id, id, tournament?.id, tournament?.game_id, regCheckKey])

  async function openRegSheet() {
    if (!profile?.id || !tournament?.game_id) return
    const { data } = await supabasePlayer
      .from('game_profiles')
      .select('game_uid, in_game_name')
      .eq('player_id', profile.id)
      .eq('game_id', tournament.game_id)
      .eq('status', 'verified')
      .maybeSingle()
    if (!data) {
      setSuccess('')
      setRegError('You need a verified in-game profile for ' + (tournament.game_name || 'this game') + ' before registering. Go to your Profile and add one.')
      return
    }
    setRegError('')
    setHostGameProfile(data)
    setShowRegSheet(true)
  }

  const hasJoined = !!myReg
  const canRegister =
    !myRegLoading &&
    !hasJoined &&
    tournament?.registration_status === 'open' &&
    user != null

  const isLong = tournament?.type === 'long'

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <LoadingDots />
          <span className="text-sm">Loading tournament…</span>
        </div>
      </div>
    )
  }

  if (!tournament) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-slate-400">
        <p className="text-sm">Tournament not found.</p>
        <button
          onClick={() => navigate(`/${gameId}/tournaments`)}
          className="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/[0.04] transition-colors"
        >
          ← Back to Tournaments
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {showRegSheet && hostGameProfile && (
        <RegisterSheet
          tournament={tournament}
          playerProfile={profile}
          hostGameProfile={hostGameProfile}
          onClose={() => setShowRegSheet(false)}
          onSuccess={() => {
            setShowRegSheet(false)
            setSuccess('Registration submitted! Awaiting confirmation.')
            setRegCheckKey(k => k + 1)
          }}
        />
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate(`/${gameId}/tournaments`)}
            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:bg-white/[0.06] hover:text-slate-200 transition-colors"
          >
            ←
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-100 leading-tight">{tournament.name}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <StatusBadge status={tournament.status} />
              {tournament.game_name ? (
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium text-slate-400">{tournament.game_name}</span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          {myRegLoading ? (
            <div className="flex items-center gap-2 text-sm text-slate-400"><LoadingDots /><span>Checking…</span></div>
          ) : hasJoined ? (
            <div className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300">
              ✓ Registered — {myReg?.team_name}
            </div>
          ) : canRegister ? (
            <button
              onClick={openRegSheet}
              className="rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-500 transition-colors shadow-lg shadow-sky-900/30"
            >
              Register Now
            </button>
          ) : tournament?.registration_status === 'closed' ? (
            <div className="rounded-full border border-slate-600 bg-slate-800/60 px-4 py-2 text-sm font-medium text-slate-400">
              Registrations closed
            </div>
          ) : !user ? (
            <div className="rounded-full border border-slate-600 bg-slate-800/60 px-4 py-2 text-sm font-medium text-slate-400">
              Log in to register
            </div>
          ) : null}
          {success && <p className="text-xs text-emerald-400">{success}</p>}
          {regError && (
            <p className="text-xs text-rose-400 max-w-[260px] text-right mt-1">{regError}</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <StatPill label="Mode" value={getModeLabel(tournament.mode)} />
        <StatPill label="Type" value={tournament.type || '—'} />
        {tournament.prize_pool ? <StatPill label="Prize" value={`₹${tournament.prize_pool}`} tone="success" /> : null}
        {tournament.entry_fee ? <StatPill label="Entry" value={`₹${tournament.entry_fee}`} tone="warning" /> : null}
        {tournament.max_teams ? <StatPill label="Slots" value={String(tournament.max_teams)} /> : null}
      </div>

      <SectionCard title="Tournament details" subtitle="Key information about this event.">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <DetailRow label="Game" value={tournament.game_name} />
          <DetailRow label="Mode" value={getModeLabel(tournament.mode)} />
          <DetailRow label="Team size" value={tournament.team_size ? `${tournament.team_size}v${tournament.team_size}` : '—'} />
          <DetailRow label="Max teams" value={tournament.max_teams ? String(tournament.max_teams) : '—'} />
          <DetailRow label="Entry fee" value={tournament.entry_fee ? `₹${tournament.entry_fee}` : 'Free'} highlight={!!tournament.entry_fee} />
          <DetailRow label="Prize pool" value={tournament.prize_pool ? `₹${tournament.prize_pool}` : '—'} highlight={!!tournament.prize_pool} />
          {tournament.scheduled_at ? <DetailRow label="Scheduled" value={new Date(tournament.scheduled_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })} /> : null}
          {tournament.description ? <div className="sm:col-span-2 xl:col-span-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"><div className="text-[10px] uppercase tracking-[0.22em] text-slate-400">Description</div><div className="mt-1 text-sm text-slate-300 leading-relaxed">{tournament.description}</div></div> : null}
        </div>
      </SectionCard>

      {hasJoined && myReg && (
        <SectionCard title="Your registration" subtitle="Your team details for this tournament.">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <DetailRow label="Team name" value={myReg.team_name} highlight />
            <DetailRow label="Status" value={myReg.status} />
            <DetailRow label="Host UID" value={myReg.host_uid} />
          </div>
        </SectionCard>
      )}

      {isLong && hasJoined && (
        <LongTournamentPanel
          tournamentId={tournament.id}
          myReg={myReg}
          totalRounds={tournament.total_rounds}
        />
      )}

      {(tournament.status === 'ongoing' || tournament.status === 'ended') && (
        <RoomCodeCard
          tournamentId={tournament.id}
          hasJoined={hasJoined}
          myRegLoading={myRegLoading}
        />
      )}

      {/* Results: always show when ended */}
      <ResultsPanel tournament={tournament} />

      <RegisteredTeamsList tournamentId={tournament.id} teamSize={tournament.team_size} />

      {tournament.mode === 'br' && <BRRulesSection gameName={tournament.game_name} />}
    </div>
  )
}
