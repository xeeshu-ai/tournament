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

  const { user, profile, loading: authLoading } = usePlayer()
  const { game } = useGame()

  const [tournament, setTournament] = React.useState(null)
  const [loading, setLoading] = React.useState(true)
  const [showRegForm, setShowRegForm] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState('')
  const [success, setSuccess] = React.useState('')
  const [myReg, setMyReg] = React.useState(undefined)

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

  React.useEffect(() => {
    if (!id) return
    let mounted = true
    const channel = supabasePlayer
      .channel(`tournament:${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tournaments', filter: `id=eq.${id}` },
        (payload) => {
          if (!mounted) return
          if (payload.new?.status === 'ended') {
            refetchTournament()
          } else {
            setTournament(prev => prev ? { ...prev, ...payload.new } : prev)
          }
        }
      )
      .subscribe()
    return () => {
      mounted = false
      supabasePlayer.removeChannel(channel)
    }
  }, [id, refetchTournament])

  React.useEffect(() => {
    if (authLoading) return
    if (!user) { setMyReg(null); return }

    async function checkMyReg() {
      if (!profile?.id || !id) { setMyReg(null); return }

      const { data: gameProfile } = await supabasePlayer
        .from('player_profiles')
        .select('game_uid')
        .eq('id', profile.id)
        .maybeSingle()

      if (!gameProfile?.game_uid) { setMyReg(null); return }

      const { data: asHost } = await supabasePlayer
        .from('tournament_registrations')
        .select('*')
        .eq('tournament_id', id)
        .eq('host_uid', gameProfile.game_uid)
        .not('status', 'in', '("rejected","cancelled")')
        .limit(1)
        .maybeSingle()

      if (asHost) { setMyReg(asHost); return }

      const { data: asMember } = await supabasePlayer
        .from('registration_teammates')
        .select('registration_id, game_uid, tournament_registrations!inner(id, team_name, status, host_uid, tournament_id)')
        .eq('game_uid', gameProfile.game_uid)
        .eq('tournament_registrations.tournament_id', id)
        .not('tournament_registrations.status', 'in', '("rejected","cancelled")')
        .limit(1)
        .maybeSingle()

      if (asMember?.tournament_registrations) {
        setMyReg(asMember.tournament_registrations)
      } else {
        setMyReg(null)
      }
    }

    checkMyReg()
  }, [authLoading, user, profile?.id, id])

  const handleRegister = async (formData) => {
    if (!user || !profile?.id) { setError('You must be logged in to register.'); return }
    setSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const { data: gameProfile } = await supabasePlayer
        .from('player_profiles')
        .select('game_uid, display_name')
        .eq('id', profile.id)
        .maybeSingle()

      if (!gameProfile?.game_uid) { setError('Complete your game profile before registering.'); setSubmitting(false); return }

      const payload = {
        tournament_id: id,
        host_uid: gameProfile.game_uid,
        team_name: formData.team_name || gameProfile.display_name || 'My Team',
        status: 'pending',
        ...formData
      }

      const { error: regError } = await supabasePlayer
        .from('tournament_registrations')
        .insert(payload)

      if (regError) {
        setError(regError.message || 'Registration failed. Please try again.')
      } else {
        setSuccess('Registration submitted! Await organizer confirmation.')
        setShowRegForm(false)
        const { data: newReg } = await supabasePlayer
          .from('tournament_registrations')
          .select('*')
          .eq('tournament_id', id)
          .eq('host_uid', gameProfile.game_uid)
          .not('status', 'in', '("rejected","cancelled")')
          .limit(1)
          .maybeSingle()
        setMyReg(newReg || null)
      }
    } catch (err) {
      setError('Unexpected error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <LoadingDots />
          <p className="text-sm text-slate-400">Loading tournament…</p>
        </div>
      </div>
    )
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-slate-300 font-semibold">Tournament not found</p>
          <p className="text-sm text-slate-500">This tournament may have been removed or the link is invalid.</p>
        </div>
      </div>
    )
  }

  const isLong = tournament.format === 'long'
  const isBR = tournament.mode === 'br'
  const hasJoined = !!myReg && myReg.status !== 'rejected' && myReg.status !== 'cancelled'
  const myRegLoading = myReg === undefined

  const statusColors = {
    upcoming: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
    ongoing: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    ended: 'border-slate-500/30 bg-slate-500/10 text-slate-300',
    cancelled: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
  }
  const statusClass = statusColors[tournament.status] || statusColors.upcoming

  const canRegister =
    tournament.status === 'upcoming' &&
    !hasJoined &&
    !myRegLoading &&
    user

  return (
    <div className="min-h-screen bg-[#0d1117] text-slate-100">
      {/* Header */}
      <div className="border-b border-white/10 bg-[#0d1117]/95 backdrop-blur-md sticky top-0 z-20">
        <div className="mx-auto max-w-4xl px-4 py-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold text-slate-100">{tournament.name}</h1>
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusClass}`}>
                {tournament.status || 'upcoming'}
              </span>
              {game?.name && (
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[11px] text-slate-300">
                  {game.name}
                </span>
              )}
              {tournament.mode && (
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[11px] text-slate-300">
                  {getModeLabel(tournament.mode)}
                </span>
              )}
            </div>
          </div>

          {canRegister && (
            <button
              onClick={() => setShowRegForm(s => !s)}
              className="shrink-0 rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-400 active:bg-sky-600"
            >
              {showRegForm ? 'Cancel' : 'Register'}
            </button>
          )}

          {hasJoined && (
            <span className="shrink-0 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300">
              Joined ✓
            </span>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-6 space-y-5">
        {/* Feedback banners */}
        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {success}
          </div>
        )}

        {/* Registration form */}
        {showRegForm && canRegister && (
          <RegistrationForm
            tournament={tournament}
            onSubmit={handleRegister}
            submitting={submitting}
            onCancel={() => setShowRegForm(false)}
          />
        )}

        {/* Core info */}
        <SectionCard title="Tournament info" subtitle="Key details and configuration for this event.">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <DetailRow label="Format" value={isLong ? 'Long (multi-round)' : 'Short (single BR)'} />
            <DetailRow label="Mode" value={getModeLabel(tournament.mode)} />
            <DetailRow label="Team size" value={String(tournament.team_size || '—')} />
            {tournament.max_teams && <DetailRow label="Max teams" value={String(tournament.max_teams)} />}
            {tournament.prize_pool && <DetailRow label="Prize pool" value={String(tournament.prize_pool)} highlight />}
            {tournament.entry_fee != null && <DetailRow label="Entry fee" value={tournament.entry_fee === 0 ? 'Free' : String(tournament.entry_fee)} />}
            {tournament.scheduled_at && <DetailRow label="Scheduled" value={new Date(tournament.scheduled_at).toLocaleString()} />}
          </div>
          {tournament.description && (
            <p className="mt-4 text-sm text-slate-300 leading-relaxed">{tournament.description}</p>
          )}
        </SectionCard>

        {/* Stats pills */}
        <div className="flex flex-wrap gap-2">
          <StatPill label="Status" value={tournament.status || 'upcoming'} tone={tournament.status === 'ongoing' ? 'success' : tournament.status === 'ended' ? 'default' : tournament.status === 'cancelled' ? 'danger' : 'default'} />
          {tournament.team_size && <StatPill label="Team size" value={`${tournament.team_size}v${tournament.team_size}`} />}
          {tournament.max_teams && <StatPill label="Max teams" value={String(tournament.max_teams)} />}
        </div>

        {/* BR Rules */}
        {isBR && <BRRulesSection gameName={game?.name} />}

        {/* Room code — only for non-long, non-cancelled tournaments */}
        {!isLong && tournament.status !== 'cancelled' && (
          <RoomCodeCard
            tournamentId={id}
            hasJoined={hasJoined}
            myRegLoading={myRegLoading}
          />
        )}

        {/* Long tournament bracket panel */}
        {isLong && (
          <LongTournamentPanel
            tournamentId={id}
            myReg={myReg || null}
            totalRounds={tournament.total_rounds}
          />
        )}

        {/* Results panel — shows when ended or results exist */}
        <ResultsPanel tournament={tournament} />

        {/* Results snapshot summary card */}
        <ResultsSummaryCard tournament={tournament} />

        {/* Registered teams list */}
        <RegisteredTeamsList tournamentId={id} teamSize={tournament.team_size} />
      </div>
    </div>
  )
}

// ── Registration form ────────────────────────────────────────────────────────
function RegistrationForm({ tournament, onSubmit, submitting, onCancel }) {
  const teamSize = tournament?.team_size || 1
  const isSolo = teamSize === 1

  const [teamName, setTeamName] = React.useState('')
  const [teammates, setTeammates] = React.useState(
    Array.from({ length: Math.max(0, teamSize - 1) }, () => ({ name: '', uid: '' }))
  )

  const updateTeammate = (idx, field, value) => {
    setTeammates(prev => prev.map((t, i) => i === idx ? { ...t, [field]: value } : t))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const teammateUids = teammates.map(t => t.uid).filter(Boolean)
    onSubmit({
      team_name: teamName.trim() || undefined,
      teammate_uids: teammateUids,
      teammates: teammates.filter(t => t.uid || t.name)
    })
  }

  return (
    <SectionCard title="Register for this tournament" subtitle="Fill in your team details to submit a registration.">
      <form onSubmit={handleSubmit} className="space-y-4">
        {!isSolo && (
          <div>
            <label className="block text-xs text-slate-400 mb-1">Team name</label>
            <input
              type="text"
              value={teamName}
              onChange={e => setTeamName(e.target.value)}
              placeholder="Enter your team name"
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-sky-500/50 focus:outline-none focus:ring-1 focus:ring-sky-500/30"
            />
          </div>
        )}

        {teammates.map((tm, idx) => (
          <div key={idx} className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Teammate {idx + 1} — In-game name</label>
              <input
                type="text"
                value={tm.name}
                onChange={e => updateTeammate(idx, 'name', e.target.value)}
                placeholder="In-game name"
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-sky-500/50 focus:outline-none focus:ring-1 focus:ring-sky-500/30"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Teammate {idx + 1} — Game UID</label>
              <input
                type="text"
                value={tm.uid}
                onChange={e => updateTeammate(idx, 'uid', e.target.value)}
                placeholder="Game UID"
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-sky-500/50 focus:outline-none focus:ring-1 focus:ring-sky-500/30"
              />
            </div>
          </div>
        ))}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Submitting…' : 'Submit registration'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-white/10 px-5 py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/[0.04]"
          >
            Cancel
          </button>
        </div>
      </form>
    </SectionCard>
  )
}
