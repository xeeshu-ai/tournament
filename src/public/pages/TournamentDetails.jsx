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
      <div className={`mt-1 text-sm font-semibold ${highlight ? 'text-sky-300' : 'text-slate-100'}`}>{value || '\u2014'}</div>
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

// ─── STATUS badge helper ────────────────────────────────────────────
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

function ResultsPanel({ tournament }) {
  const isBR = tournament?.mode === 'br'
  const hasResults =
    (isBR && Array.isArray(tournament.single_br_results) && tournament.single_br_results.length > 0) ||
    (!isBR && Array.isArray(tournament.cs_lw_results) && tournament.cs_lw_results.length > 0) ||
    (Array.isArray(tournament.tdm_results) && tournament.tdm_results.length > 0)

  if (!hasResults && tournament.status !== 'ended') return null

  return (
    <SectionCard title="Results" subtitle="Published standings for this tournament.">
      {tournament.status === 'ended' && (
        <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          This tournament has ended. Final results are shown below.
        </div>
      )}

      {isBR && Array.isArray(tournament.single_br_results) && tournament.single_br_results.length > 0 ? (
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
                  <td className="px-4 py-3">{row.position ?? '\u2014'}</td>
                  <td className="px-4 py-3 font-semibold text-sky-300">{row.points ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {!isBR && Array.isArray(tournament.cs_lw_results) && tournament.cs_lw_results.length > 0 ? (
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
      ) : null}

      {Array.isArray(tournament.tdm_results) && tournament.tdm_results.length > 0 ? (
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
      ) : null}

      {!hasResults && tournament.status === 'ended' ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
          Results are not available yet.
        </div>
      ) : null}
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
            <div className="text-lg font-semibold text-slate-100 break-all">{roomCode.room_id || '\u2014'}</div>
            <button onClick={() => copy(roomCode.room_id)} className="rounded-lg border border-sky-500/20 bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-300 hover:bg-sky-500/20">Copy</button>
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
          <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Password</div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <div className="text-lg font-semibold text-slate-100 break-all">{roomCode.room_password || '\u2014'}</div>
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
                  <td className="px-4 py-3">{teamSize || row.team_size || '\u2014'}</td>
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
      <SectionCard title="Bracket progress" subtitle={`Tournament bracket \u2014 ${totalRounds || bracket?.total_rounds || 'multiple'} rounds.`}>
        {bracket ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <DetailRow label="Current round" value={`Round ${bracket.current_round || 1}`} highlight />
            <DetailRow label="Total rounds" value={String(bracket.total_rounds || totalRounds || '\u2014')} />
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
            <DetailRow label="Round" value={`Round ${myMatchData.round_no || '\u2014'}`} />
            <DetailRow label="Match" value={`Match ${myMatchData.match_no || '\u2014'}`} />
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
                        <td className="px-4 py-3">{row?.kills ?? '\u2014'}</td>
                        <td className="px-4 py-3">{row?.position ?? '\u2014'}</td>
                        <td className="px-4 py-3 font-semibold text-sky-300">{row?.points ?? '\u2014'}</td>
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
                    <td className="px-4 py-3">{row.position ?? '\u2014'}</td>
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

// ─── UID Lookup Field (league-style) ────────────────────────────────────────
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
          {found?.error ?? `No verified player found with this UID.`}
        </p>
      )}
    </div>
  )
}

// ─── Register Sheet (league-style bottom modal) ──────────────────────────────
function RegisterSheet({ tournament, playerProfile, hostGameProfile, onClose, onSuccess }) {
  const [step, setStep] = React.useState(1)
  const [teamName, setTeamName] = React.useState('')
  const [teammates, setTeammates] = React.useState([])
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState('')

  const teamSize = tournament.team_size || 1
  const need = teamSize - 1
  const excludeUids = [hostGameProfile?.game_uid, ...teammates.map(t => t.gameUid)].filter(Boolean)

  function setTeammate(idx, data) {
    setTeammates(prev => { const next = [...prev]; next[idx] = data; return next })
  }
  function clearTeammate(idx) {
    setTeammates(prev => { const next = [...prev]; next[idx] = undefined; return next.filter(Boolean) })
  }

  // Total steps: step 1 = team name, step 2 = teammates (if needed), step 3 (or 2 if solo) = review
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
        {/* drag handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden"><div className="h-1 w-10 rounded-full bg-slate-700" /></div>

        {/* header */}
        <div className="sticky top-0 z-10 bg-slate-900 border-b border-slate-800 px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-slate-500 uppercase tracking-widest">Register Team</p>
            <p className="text-sm font-semibold text-slate-100 mt-0.5 truncate max-w-[240px]">{tournament.name}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors">✕</button>
        </div>

        {/* step progress bar */}
        <div className="flex gap-1.5 px-5 pt-4">
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map(s => (
            <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${s <= step ? 'bg-sky-500' : 'bg-slate-700'}`} />
          ))}
        </div>

        {/* step content */}
        <div className="px-5 py-5 space-y-5">
          {/* Step 1 — team name */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-slate-100">Choose your team name</h2>
                <p className="text-xs text-slate-500 mt-1">This is how your team will appear in standings.</p>
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
              {/* host card */}
              <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 px-4 py-3 flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-sky-500/20 flex items-center justify-center text-sky-400 text-sm font-bold flex-shrink-0">
                  {hostGameProfile?.in_game_name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-200">{hostGameProfile?.in_game_name}</p>
                  <p className="text-[11px] text-slate-500">You (Captain) · UID: {hostGameProfile?.game_uid}</p>
                </div>
                <span className="ml-auto inline-flex items-center rounded-full border border-purple-500/30 bg-purple-500/15 px-2 py-0.5 text-[11px] font-medium text-purple-300">Host</span>
              </div>
            </div>
          )}

          {/* Step 2 — teammates (only when team size > 1) */}
          {step === 2 && need > 0 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-slate-100">Add teammates <span className="text-slate-500 font-normal text-sm">(optional)</span></h2>
                <p className="text-xs text-slate-500 mt-1">Search by in-game UID. Only verified profiles can be added.</p>
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

          {/* Review step */}
          {step === reviewStep && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-slate-100">Review & Submit</h2>
                <p className="text-xs text-slate-500 mt-1">You can add remaining teammates after registration.</p>
              </div>
              <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 divide-y divide-slate-700/50">
                <div className="px-4 py-3">
                  <p className="text-[11px] text-slate-500 uppercase tracking-widest">Team</p>
                  <p className="text-sm font-semibold text-slate-100 mt-0.5">{teamName}</p>
                </div>
                {/* captain row */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="h-7 w-7 rounded-full bg-sky-500/20 flex items-center justify-center text-sky-400 text-xs font-bold flex-shrink-0">
                    {hostGameProfile?.in_game_name?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-200">{hostGameProfile?.in_game_name}</p>
                    <p className="text-[10px] text-slate-600">UID: {hostGameProfile?.game_uid}</p>
                  </div>
                  <span className="inline-flex items-center rounded-full border border-purple-500/30 bg-purple-500/15 px-2 py-0.5 text-[11px] font-medium text-purple-300">Captain</span>
                </div>
                {/* teammate rows */}
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
                    <p className="text-[11px] text-slate-500">{need - teammates.length} slot{need - teammates.length > 1 ? 's' : ''} empty — fill after registration.</p>
                  </div>
                )}
              </div>
              {/* entry fee */}
              <div className="rounded-xl border border-slate-700/40 bg-slate-800/20 px-4 py-3 flex items-center justify-between">
                <span className="text-xs text-slate-400">Entry Fee</span>
                <span className="text-sm font-semibold text-slate-100">{tournament.entry_fee > 0 ? `₹${tournament.entry_fee}` : 'Free'}</span>
              </div>
              {error && <p className="text-xs text-red-400 bg-red-500/10 rounded-xl px-4 py-3">{error}</p>}
            </div>
          )}
        </div>

        {/* footer nav */}
        <div className="sticky bottom-0 bg-slate-900 border-t border-slate-800 px-5 py-4 flex gap-3">
          {step > 1 && (
            <button onClick={() => setStep(s => s - 1)} className="flex-1 rounded-xl border border-slate-700 py-3 text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors">
              ← Back
            </button>
          )}
          {step === 1 && (
            <button
              onClick={() => setStep(need > 0 ? 2 : reviewStep)}
              disabled={teamName.trim().length < 3}
              className="flex-1 rounded-xl bg-sky-600 py-3 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-40 transition-colors"
            >
              Continue →
            </button>
          )}
          {step === 2 && need > 0 && (
            <button onClick={() => setStep(reviewStep)} className="flex-1 rounded-xl bg-sky-600 py-3 text-sm font-semibold text-white hover:bg-sky-500 transition-colors">
              Review →
            </button>
          )}
          {step === reviewStep && (
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

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────
export default function TournamentDetails() {
  const { id, gameId } = useParams()
  const navigate = useNavigate()

  const { user, profile, loading: authLoading } = usePlayer()

  const [tournament, setTournament] = React.useState(null)
  const [loading, setLoading] = React.useState(true)
  const [showRegSheet, setShowRegSheet] = React.useState(false)
  const [hostGameProfile, setHostGameProfile] = React.useState(null)
  const [myReg, setMyReg] = React.useState(undefined)
  const [myRegLoading, setMyRegLoading] = React.useState(true)
  const [error, setError] = React.useState('')
  const [success, setSuccess] = React.useState('')
  const [regCheckKey, setRegCheckKey] = React.useState(0)

  // ── Load tournament ──────────────────────────────────────────────────────
  const refetchTournament = React.useCallback(async () => {
    if (!id) return
    const { data } = await supabasePlayer.from('tournaments').select('*').eq('id', id).single()
    if (data) setTournament(data)
  }, [id])

  React.useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      const { data } = await supabasePlayer.from('tournaments').select('*').eq('id', id).single()
      if (mounted) { setTournament(data || null); setLoading(false) }
    }
    if (id) load()
    return () => { mounted = false }
  }, [id])

  // Realtime tournament updates
  React.useEffect(() => {
    if (!id) return
    let mounted = true
    const channel = supabasePlayer
      .channel(`tournament:${id}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tournaments', filter: `id=eq.${id}` },
        (payload) => {
          if (!mounted) return
          if (payload.new?.status === 'ended') refetchTournament()
          else setTournament(prev => prev ? { ...prev, ...payload.new } : prev)
        }
      )
      .subscribe()
    return () => { mounted = false; supabasePlayer.removeChannel(channel) }
  }, [id, refetchTournament])

  // ── Reset registration state on tournament change ────────────────────────
  React.useEffect(() => {
    setMyReg(undefined)
    setMyRegLoading(true)
  }, [id])

  // ── Check my registration ────────────────────────────────────────────────
  const tournamentId = tournament?.id
  const tournamentGameId = tournament?.game_id

  React.useEffect(() => {
    if (authLoading) return
    if (!user || !profile?.id || !id) {
      setMyReg(null)
      setMyRegLoading(false)
      return
    }
    if (!tournamentId) return

    let cancelled = false

    async function checkMyReg() {
      setMyRegLoading(true)

      if (tournamentGameId) {
        const { data: gameProfile } = await supabasePlayer
          .from('game_profiles')
          .select('game_uid, in_game_name')
          .eq('player_id', profile.id)
          .eq('game_id', tournamentGameId)
          .eq('status', 'verified')
          .maybeSingle()

        if (cancelled) return

        if (!gameProfile?.game_uid) {
          setMyReg(null)
          setMyRegLoading(false)
          return
        }

        // Store host game profile so RegisterSheet can use it
        setHostGameProfile(gameProfile)

        const { data: asHost } = await supabasePlayer
          .from('tournament_registrations')
          .select('*')
          .eq('tournament_id', id)
          .eq('host_uid', gameProfile.game_uid)
          .not('status', 'in', '(rejected,cancelled)')
          .limit(1)
          .maybeSingle()

        if (cancelled) return
        if (asHost) { setMyReg(asHost); setMyRegLoading(false); return }

        const { data: asMember } = await supabasePlayer
          .from('registration_members')
          .select('registration_id, game_uid, tournament_registrations!inner(id, team_name, status, host_uid, tournament_id)')
          .eq('tournament_id', id)
          .eq('game_uid', gameProfile.game_uid)
          .not('tournament_registrations.status', 'in', '(rejected,cancelled)')
          .maybeSingle()

        if (cancelled) return
        setMyReg(asMember?.tournament_registrations ?? null)
        setMyRegLoading(false)
        return
      }

      // No game_id — fall back to player_id lookup
      const { data: asHost } = await supabasePlayer
        .from('tournament_registrations')
        .select('*')
        .eq('tournament_id', id)
        .eq('player_id', profile.id)
        .not('status', 'in', '(rejected,cancelled)')
        .limit(1)
        .maybeSingle()

      if (cancelled) return
      setMyReg(asHost ?? null)
      setMyRegLoading(false)
    }

    checkMyReg()
    return () => { cancelled = true }
  }, [authLoading, user, profile?.id, id, tournamentId, tournamentGameId, regCheckKey])

  // ── Open register sheet — fetch host profile if not yet loaded ───────────
  async function handleOpenRegSheet() {
    if (!hostGameProfile && tournamentGameId && profile?.id) {
      const { data } = await supabasePlayer
        .from('game_profiles')
        .select('game_uid, in_game_name')
        .eq('player_id', profile.id)
        .eq('game_id', tournamentGameId)
        .eq('status', 'verified')
        .maybeSingle()
      setHostGameProfile(data || null)
    }
    setShowRegSheet(true)
  }

  // ── Derived state ────────────────────────────────────────────────────────
  const hasJoined = !!myReg
  const canRegister =
    !myRegLoading &&
    !hasJoined &&
    tournament?.registration_status === 'open' &&
    user != null

  const isLong = tournament?.type === 'long'

  // ── Loading / not found ──────────────────────────────────────────────────
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

  // ── Page ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Register Sheet modal ── */}
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

      {/* ── Page header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate(`/${gameId}/tournaments`)}
            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:bg-white/[0.06] hover:text-slate-200 transition-colors"
            aria-label="Back to tournaments"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-1.5 text-[11px] text-slate-500">
              <button onClick={() => navigate(`/${gameId}/tournaments`)} className="hover:text-slate-300 transition-colors">
                Tournaments
              </button>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>
              <span className="text-slate-400 truncate max-w-[180px] sm:max-w-xs">{tournament.name}</span>
            </div>
            <h1 className="text-xl font-bold leading-tight text-slate-50 sm:text-2xl">{tournament.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge status={tournament.status} />
              {tournament.mode && (
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold text-slate-300">
                  {getModeLabel(tournament.mode)}
                </span>
              )}
              {tournament.type === 'long' && (
                <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-[11px] font-semibold text-purple-300">
                  Multi-round
                </span>
              )}
              {tournament.prize_pool && (
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold text-amber-300">
                  🏆 ₹{tournament.prize_pool}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Register CTA (top-right desktop) */}
        {canRegister && (
          <button
            onClick={handleOpenRegSheet}
            className="shrink-0 rounded-xl bg-sky-500 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/20 hover:bg-sky-400 transition-colors"
          >
            Register Now
          </button>
        )}
        {hasJoined && (
          <span className="shrink-0 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-300">
            ✓ Registered
          </span>
        )}
      </div>

      {/* ── Banners ── */}
      {success && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{success}</div>
      )}
      {error && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</div>
      )}

      {/* ── Tournament info ── */}
      <SectionCard title="Tournament details" subtitle="Overview and configuration for this event.">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <DetailRow label="Entry fee" value={tournament.entry_fee ? `\u20b9${tournament.entry_fee}` : 'Free'} />
          <DetailRow label="Prize pool" value={tournament.prize_pool ? `\u20b9${tournament.prize_pool}` : '\u2014'} />
          <DetailRow label="Team size" value={tournament.team_size ? `${tournament.team_size}v${tournament.team_size}` : '\u2014'} />
          <DetailRow label="Max teams" value={tournament.max_teams ? String(tournament.max_teams) : '\u2014'} />
          <DetailRow label="Match date" value={tournament.match_date || '\u2014'} />
          <DetailRow label="Match time" value={tournament.match_time || '\u2014'} />
        </div>
        {tournament.description && (
          <p className="mt-4 text-sm text-slate-300 leading-relaxed">{tournament.description}</p>
        )}
      </SectionCard>

      {/* ── Room code ── */}
      {!isLong && (
        <RoomCodeCard
          tournamentId={id}
          hasJoined={hasJoined}
          myRegLoading={myRegLoading}
        />
      )}

      {/* ── Long tournament bracket ── */}
      {isLong && (
        <LongTournamentPanel
          tournamentId={id}
          myReg={myReg}
          totalRounds={tournament.total_rounds}
        />
      )}

      {/* ── Results ── */}
      <ResultsPanel tournament={tournament} />

      {/* ── Registered teams ── */}
      <RegisteredTeamsList tournamentId={id} teamSize={tournament.team_size} />

      {/* ── Rules ── */}
      {(tournament.mode === 'br' || tournament.mode === 'lw') && (
        <BRRulesSection gameName={tournament.game_name || ''} />
      )}

      {/* ── Register CTA (bottom, mobile) ── */}
      {canRegister && (
        <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 px-5 py-5 text-center">
          <p className="mb-3 text-sm text-slate-300">Spots are filling up. Register your team now.</p>
          <button
            onClick={handleOpenRegSheet}
            className="rounded-xl bg-sky-500 px-6 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/20 hover:bg-sky-400 transition-colors"
          >
            Register Now
          </button>
        </div>
      )}

    </div>
  )
}
