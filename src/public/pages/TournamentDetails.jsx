import React from 'react'
import { useParams } from 'react-router-dom'
import { supabasePlayer } from '../../lib/supabaseClient'
import { usePlayer } from '../../lib/PlayerContext'
import { useGame } from '../../lib/GameContext'
import { getModeLabel } from '../../lib/constants'

// ─── Teammate UID resolver ───────────────────────────────────────────────────
function getTeammateUids(reg) {
  const src = Array.isArray(reg?.teammate_uids)
    ? reg.teammate_uids
    : Array.isArray(reg?.teammates)
      ? reg.teammates.map(t => t?.game_uid).filter(Boolean)
      : []
  return [...new Set(src.filter(Boolean).map(v => String(v).trim()).filter(Boolean))]
}

// Helper component: animated dots
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

function ResultsSummaryCard({ tournament }) {
  const isBR = tournament?.mode === 'br'
  const hasResults =
    (isBR && Array.isArray(tournament.single_br_results) && tournament.single_br_results.length > 0) ||
    (!isBR && Array.isArray(tournament.cs_lw_results) && tournament.cs_lw_results.length > 0)

  if (!hasResults) return null

  return (
    <SectionCard
      title="Results snapshot"
      subtitle="Latest published standings visible in the app."
      right={<span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">Published</span>}
    >
      {isBR && Array.isArray(tournament.single_br_results) && tournament.single_br_results.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-white/10">
          <table className="min-w-full divide-y divide-white/10 text-sm">
            <thead className="bg-white/[0.04] text-[11px] uppercase tracking-[0.18em] text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Team</th>
                <th className="px-4 py-3 text-left">Kills</th>
                <th className="px-4 py-3 text-left">Placement</th>
                <th className="px-4 py-3 text-left">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-200">
              {tournament.single_br_results.map((row, i) => (
                <tr key={`${row.team_name}-${i}`} className={i === 0 ? 'bg-amber-500/5' : ''}>
                  <td className="px-4 py-3 font-semibold text-slate-400">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-slate-100">{row.team_name}</td>
                  <td className="px-4 py-3">{row.kills ?? 0}</td>
                  <td className="px-4 py-3">#{row.position ?? '—'}</td>
                  <td className="px-4 py-3 font-semibold text-sky-300">{row.points ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isBR && Array.isArray(tournament.cs_lw_results) && tournament.cs_lw_results.length > 0 && (
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
                <tr key={`${row.team_name}-${i}`} className={i === 0 ? 'bg-emerald-500/5' : ''}>
                  <td className="px-4 py-3 font-semibold text-slate-400">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-slate-100">{row.team_name}</td>
                  <td className="px-4 py-3">{row.wins ?? 0}</td>
                  <td className="px-4 py-3">{row.losses ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
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

// Room code card for non-long tournaments.
// Shows loading while room code fetch is in progress.
// Also waits for myRegLoading to resolve before showing locked/unlocked state.
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
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_codes', filter: `tournament_id=eq.${tournamentId}` },
        (payload) => {
          if (!mounted) return
          if (payload.eventType === 'DELETE') {
            setRoomCode(null)
          } else if (payload.new) {
            setRoomCode(payload.new)
          }
        }
      )
      .subscribe()

    return () => {
      mounted = false
      supabasePlayer.removeChannel(channel)
    }
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
          <LoadingDots />
          <span>Loading room information…</span>
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

function ResultsPanel({ tournament }) {
  const isBR = tournament?.mode === 'br'
  const hasResults =
    (isBR && Array.isArray(tournament.single_br_results) && tournament.single_br_results.length > 0) ||
    (!isBR && Array.isArray(tournament.cs_lw_results) && tournament.cs_lw_results.length > 0) ||
    (Array.isArray(tournament.tdm_results) && tournament.tdm_results.length > 0)

  // Always render when status is 'ended' OR when results exist
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
                  <td className="px-4 py-3">{row.position ?? '—'}</td>
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
        .not('status', 'in', '("rejected","cancelled")')
        .order('created_at', { ascending: true })
      if (mounted) {
        setRows(data || [])
        setLoading(false)
      }
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
        supabasePlayer.from('single_elim_brackets').select('*').eq('tournament_id', tournamentId).maybeSingle(),
        supabasePlayer.from('single_elim_matches').select('*').eq('tournament_id', tournamentId).order('round_no', { ascending: true }).order('match_no', { ascending: true }),
        supabasePlayer.from('single_elim_score_rows').select('*').eq('tournament_id', tournamentId).order('round_no', { ascending: true }).order('match_no', { ascending: true })
      ])

      if (!mounted) return

      const bracketData = bkt || null
      const matchRows = matches || []
      const scoreRows = scores || []

      setBracket(bracketData)
      setAllMatches(matchRows)
      setAllScoreRows(scoreRows)

      if (matchRows?.length && myReg?.team_name) {
        const myMatch = matchRows.find(m => {
          const teams = Array.isArray(m?.teams) ? m.teams : []
          return teams.some(t => t?.team_name === myReg.team_name)
        }) || null

        if (myMatch) {
          const teamsInMyMatch = Array.isArray(myMatch.teams) ? myMatch.teams : []
          const myScoreRow = scoreRows.find(s => s.round_no === myMatch.round_no && s.match_no === myMatch.match_no && s.team_name === myReg.team_name)
          const slotIdx = teamsInMyMatch.findIndex(t => t?.team_name === myReg.team_name)
          setMyMatchData({
            ...myMatch,
            slot_index: slotIdx,
            my_score: myScoreRow || null
          })
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
      <SectionCard title="Bracket progress" subtitle={`Tournament bracket with ${totalRounds || bracket?.total_rounds || 'multiple'} rounds.`}>
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

      {myReg && myMatchData !== null && (
        <SectionCard title="Your current match" subtitle="Your match slot, round, and current scoring row.">
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
                    const row = allScoreRows.find(s => s.round_no === myMatchData.round_no && s.match_no === myMatchData.match_no && s.team_name === t.team_name)
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
                  <tr key={row.team_name + i} className={row.team_name === myReg?.team_name ? 'bg-sky-500/10' : i === 0 ? 'bg-amber-500/10' : ''}>
                    <td className="px-4 py-3">{row.round_no}</td>
                    <td className="px-4 py-3">{row.match_no}</td>
                    <td className={`px-4 py-3 font-medium ${row.team_name === myReg?.team_name ? 'text-sky-300' : i === 0 ? 'text-amber-300' : 'text-slate-100'}`}>{row.team_name}</td>
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

export default function TournamentDetails() {
  const { id } = useParams()

  // ── FIX: PlayerContext exposes { user, profile, loading } — NOT { player }.
  // Previously this was `const { player } = usePlayer()` which is always undefined,
  // so player?.id was always undefined, checkMyReg always bailed early with myReg=null,
  // hasJoined was always false, and the registration/room-code logic was broken.
  // We use `profile` as the player row (has .id) and `user` as the auth session user.
  const { user, profile, loading: authLoading } = usePlayer()
  const { game } = useGame()

  const [tournament, setTournament] = React.useState(null)
  const [loading, setLoading] = React.useState(true)
  const [showRegForm, setShowRegForm] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState('')
  const [success, setSuccess] = React.useState('')
  const [myReg, setMyReg] = React.useState(undefined) // undefined = loading, null = not registered

  const refetchTournament = React.useCallback(async () => {
    if (!id) return
    const { data } = await supabasePlayer
      .from('tournaments')
      .select('*')
      .eq('id', id)
      .single()
    if (data) setTournament(data)
  }, [id])

  React.useEffect(() => {
    let mounted = true
    async function loadTournament() {
      setLoading(true)
      const { data } = await supabasePlayer
        .from('tournaments')
        .select('*')
        .eq('id', id)
        .single()
      if (mounted) {
        setTournament(data || null)
        setLoading(false)
      }
    }
    if (id) loadTournament()
    return () => { mounted = false }
  }, [id])

  // ── Realtime tournament updates ──
  // BUGFIX: Postgres realtime payloads truncate/omit JSONB columns (single_br_results,
  // cs_lw_results, tdm_results etc.) — payload.new will have them as null even if the
  // DB row has real data. Merging payload.new directly would silently overwrite results.
  // Solution: always do a full SELECT * refetch on every UPDATE event so we always
  // get the complete, fresh row including all JSONB columns.
  React.useEffect(() => {
    if (!id) return
    const channel = supabasePlayer
      .channel(`tournament:${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tournaments', filter: `id=eq.${id}` },
        async (_payload) => {
          // Always full-refetch — never merge payload.new directly because Postgres
          // realtime truncates JSONB columns and they arrive as null in the payload.
          const { data } = await supabasePlayer
            .from('tournaments')
            .select('*')
            .eq('id', id)
            .single()
          if (data) setTournament(data)
        }
      )
      .subscribe()
    return () => { supabasePlayer.removeChannel(channel) }
  }, [id])

  // ── Check my registration ──
  // Uses profile.id (the players table row id) to look up game_uid, then checks
  // tournament_registrations as host or as a teammate.
  React.useEffect(() => {
    // If auth is still loading, wait — don't run yet
    if (authLoading) return

    // If no logged-in user at all, immediately mark as not registered
    if (!user) {
      setMyReg(null)
      return
    }

    // BUGFIX: if checkMyReg is slow or fails, myReg stays undefined forever which
    // keeps myRegLoading=true and freezes RoomCodeCard. Add a 5s timeout fallback.
    const timeoutId = setTimeout(() => {
      setMyReg(prev => prev === undefined ? null : prev)
    }, 5000)

    async function checkMyReg() {
      // Use profile.id (players table PK) to get game_uid
      if (!profile?.id || !id) { clearTimeout(timeoutId); setMyReg(null); return }

      const { data: gameProfile } = await supabasePlayer
        .from('player_profiles')
        .select('game_uid')
        .eq('id', profile.id)
        .maybeSingle()

      if (!gameProfile?.game_uid) { clearTimeout(timeoutId); setMyReg(null); return }

      const { data: asHost } = await supabasePlayer
        .from('tournament_registrations')
        .select('*')
        .eq('tournament_id', id)
        .eq('host_uid', gameProfile.game_uid)
        .not('status', 'in', '("rejected","cancelled")')
        .limit(1)
        .maybeSingle()

      if (asHost) { clearTimeout(timeoutId); setMyReg(asHost); return }

      const { data: asMember } = await supabasePlayer
        .from('registration_teammates')
        .select('registration_id, game_uid, tournament_registrations!inner(id, team_name, status, host_uid, tournament_id)')
        .eq('game_uid', gameProfile.game_uid)
        .eq('tournament_registrations.tournament_id', id)
        .not('tournament_registrations.status', 'in', '("rejected","cancelled")')
        .limit(1)
        .maybeSingle()

      if (asMember?.tournament_registrations) {
        clearTimeout(timeoutId)
        setMyReg(asMember.tournament_registrations)
        return
      }

      clearTimeout(timeoutId)
      setMyReg(null)
    }
    checkMyReg()
    return () => clearTimeout(timeoutId)
  }, [profile?.id, user, id, authLoading])

  if (loading) {
    return (
      <div className="space-y-5">
        <SectionCard title="Tournament details" subtitle="Loading tournament data.">
          <div className="flex items-center gap-2 text-sm text-slate-400"><LoadingDots /><span>Loading tournament…</span></div>
        </SectionCard>
      </div>
    )
  }

  if (!tournament) {
    return (
      <div className="space-y-5">
        <SectionCard title="Tournament details" subtitle="This tournament could not be loaded.">
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">Tournament not found.</div>
        </SectionCard>
      </div>
    )
  }

  const isLong = tournament.format === 'long'
  const isEnded = tournament.status === 'ended'
  const isLive = tournament.status === 'live'
  const isBR = tournament.mode === 'br'
  const hasJoined = !!myReg
  const myRegLoading = myReg === undefined || authLoading
  const canRegister = !!user && !isEnded && !hasJoined && !myRegLoading

  const handleQuickRegister = async () => {
    setSubmitting(true)
    setError('')
    setSuccess('')
    try {
      setShowRegForm(true)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-3xl border border-sky-500/20 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.16),transparent_32%),linear-gradient(180deg,#0f172a_0%,#0b1220_100%)] p-6 shadow-[0_30px_80px_-45px_rgba(14,165,233,0.45)]">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.03),transparent)]" />
        <div className="relative z-10 grid gap-5 lg:grid-cols-[1.45fr_0.9fr] lg:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-300">{getModeLabel(tournament.mode)}</span>
              <span className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${isEnded ? 'border border-rose-500/30 bg-rose-500/10 text-rose-300' : isLive ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border border-amber-500/30 bg-amber-500/10 text-amber-300'}`}>{tournament.status || 'upcoming'}</span>
              {isLong ? <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-300">Long format</span> : null}
            </div>

            <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">{tournament.title}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">{tournament.description || 'Join the tournament, track your registration status, and view room details and published results from one place.'}</p>

            <div className="mt-5 flex flex-wrap gap-2">
              <StatPill label="Entry" value={tournament.entry_fee ? `₹${tournament.entry_fee}` : 'Free'} />
              <StatPill label="Slots" value={`${tournament.filled_slots || 0}/${tournament.max_slots || 0}`} />
              <StatPill label="Team size" value={tournament.team_size || 1} />
              {tournament.prize_pool ? <StatPill label="Prize" value={`₹${tournament.prize_pool}`} tone="success" /> : null}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <DetailRow label="Game" value={game?.name || tournament.game_name || '—'} highlight />
            <DetailRow label="Start time" value={tournament.start_time ? new Date(tournament.start_time).toLocaleString() : '—'} />
            <DetailRow label="Registration" value={tournament.registration_status || '—'} />
            <DetailRow label="Format" value={isLong ? 'Long tournament' : 'Single match'} />
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-5">
          <SectionCard title="Tournament info" subtitle="Core event details and your registration access.">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <DetailRow label="Mode" value={getModeLabel(tournament.mode)} />
              <DetailRow label="Map / lobby" value={tournament.map_name || tournament.tdm_map || '—'} />
              <DetailRow label="Kill target" value={tournament.kill_target || '—'} />
              <DetailRow label="Per-kill points" value={tournament.per_kill_points || '—'} />
              <DetailRow label="Placement points" value={tournament.placement_points ? 'Enabled' : '—'} />
              <DetailRow label="Rounds" value={tournament.total_rounds || (isLong ? 'Multi-round' : 'Single')} />
            </div>
          </SectionCard>

          <ResultsPanel tournament={tournament} />
          <ResultsSummaryCard tournament={tournament} />
          {isBR && <BRRulesSection gameName={game?.name} />}

          {!isLong && (
            <RoomCodeCard
              tournamentId={tournament.id}
              hasJoined={hasJoined}
              myRegLoading={myRegLoading}
            />
          )}

          {isLong && (isLive || isEnded) && myReg !== undefined && (
            <LongTournamentPanel
              tournamentId={tournament.id}
              myReg={myReg}
              totalRounds={tournament.total_rounds}
            />
          )}
        </div>

        <div className="space-y-5">
          {!isLong && (
            <SectionCard title="Registration" subtitle="Join status for this tournament.">
              {myRegLoading ? (
                <div className="flex items-center gap-2 text-sm text-slate-400"><LoadingDots /><span>Checking your registration…</span></div>
              ) : !user ? (
                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
                  Sign in to register for this tournament.
                </div>
              ) : hasJoined ? (
                <div className="space-y-3">
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                    You have already joined this tournament.
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <DetailRow label="Team" value={myReg.team_name} highlight />
                    <DetailRow label="Status" value={myReg.status === 'confirmed' ? 'Confirmed' : 'Pending'} />
                  </div>
                </div>
              ) : canRegister ? (
                <div className="space-y-3">
                  <p className="text-sm text-slate-300">You are eligible to register for this tournament now.</p>
                  <button
                    type="button"
                    onClick={handleQuickRegister}
                    disabled={submitting}
                    className="inline-flex items-center justify-center rounded-xl border border-sky-500/20 bg-sky-500/15 px-4 py-2.5 text-sm font-semibold text-sky-300 transition hover:bg-sky-500/25 disabled:opacity-60"
                  >
                    {submitting ? 'Opening…' : 'Join tournament'}
                  </button>
                </div>
              ) : (
                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
                  Registration is not available right now.
                </div>
              )}

              {error ? <div className="mt-3 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}
              {success ? <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{success}</div> : null}
            </SectionCard>
          ) : null}

          <SectionCard title="Status summary" subtitle="Live state and quick checks.">
            <div className="flex flex-wrap gap-2">
              <StatPill label="Tournament" value={tournament.status || 'upcoming'} tone={isEnded ? 'danger' : isLive ? 'success' : 'warning'} />
              <StatPill label="Registration" value={tournament.registration_status || 'closed'} tone={tournament.registration_status === 'open' ? 'success' : 'warning'} />
              <StatPill label="Joined" value={myRegLoading ? 'Checking' : hasJoined ? 'Yes' : 'No'} tone={hasJoined ? 'success' : 'default'} />
            </div>
          </SectionCard>
        </div>
      </section>

      {/* ── REGISTERED TEAMS LIST ── */}
      <RegisteredTeamsList tournamentId={tournament.id} teamSize={tournament.team_size} />

    </div>
  )
}
