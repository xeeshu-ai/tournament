import React from 'react'
import { Link } from 'react-router-dom'
import { supabasePlayer } from '../../lib/supabaseClient'
import { usePlayer } from '../../lib/PlayerContext'
import { TOURNAMENT_TYPES, FF_MODES } from '../../lib/constants'

/** Always derive mode label from t.mode — never trust the stored mode_label column */
function getModeLabel(t) {
  if (!t?.mode) return t?.mode_label || ''
  return FF_MODES.find((m) => m.id === t.mode)?.label || t.mode_label || t.mode
}

export function Tournaments() {
  const { profile } = usePlayer()
  const [loading, setLoading] = React.useState(true)
  const [tournaments, setTournaments] = React.useState([])
  const [myRegistrations, setMyRegistrations] = React.useState([])

  React.useEffect(() => {
    let ignore = false
    async function load() {
      setLoading(true)
      const { data, error } = await supabasePlayer
        .from('tournaments')
        .select('*')
        .eq('is_archived', false)
        .order('start_time', { ascending: true })
      if (!ignore) {
        if (error) {
          console.error(error)
          setTournaments([])
        } else {
          setTournaments(data || [])
        }
        setLoading(false)
      }
    }
    load()
    return () => { ignore = true }
  }, [])

  React.useEffect(() => {
    if (!profile?.ff_uid) { setMyRegistrations([]); return }
    let ignore = false
    async function loadMyRegs() {
      const uid = profile.ff_uid

      const { data: asHost } = await supabasePlayer
        .from('tournament_registrations')
        .select('tournament_id')
        .eq('host_uid', uid)

      const { data: asTeammate } = await supabasePlayer
        .from('tournament_registrations')
        .select('tournament_id')
        .or(`teammate_uid_1.eq.${uid},teammate_uid_2.eq.${uid},teammate_uid_3.eq.${uid}`)

      if (!ignore) {
        const hostIds = (asHost || []).map((r) => r.tournament_id)
        const teammateIds = (asTeammate || []).map((r) => r.tournament_id)
        setMyRegistrations([...new Set([...hostIds, ...teammateIds])])
      }
    }
    loadMyRegs()
    return () => { ignore = true }
  }, [profile?.ff_uid])

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-50">Tournaments</h1>
          <p className="mt-1 text-xs text-slate-400">
            Single match and long knockout tournaments. Slots are first come first served once
            payment is confirmed.
          </p>
        </div>
      </header>

      {loading ? (
        <p className="text-xs text-slate-400">Loading tournaments…</p>
      ) : tournaments.length === 0 ? (
        <div className="card text-xs text-slate-300">
          No tournaments are live right now. Check back later or watch previous finals on YouTube.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {tournaments.map((t) => {
            const isRegistered = myRegistrations.includes(t.id)
            const modeLabel = getModeLabel(t)
            const formatLabel = t.format_label
            const modeLine = [modeLabel, formatLabel].filter(Boolean).join(' • ')

            return (
              <Link key={t.id} to={`/tournaments/${t.id}`} className="card group">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="badge">
                      {TOURNAMENT_TYPES.find((x) => x.id === t.type)?.label || 'Tournament'}
                    </span>
                    {modeLine && (
                      <span className="rounded-full bg-slate-900/80 px-2 py-0.5 text-[11px] text-slate-300">
                        {modeLine}
                      </span>
                    )}
                    {t.map && (
                      <span className="rounded-full bg-slate-900/80 px-2 py-0.5 text-[11px] text-slate-300">
                        Map: {t.map}
                      </span>
                    )}
                  </div>
                  {isRegistered ? (
                    <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-400">
                      ✓ Registered
                    </span>
                  ) : t.registration_status === 'open' ? (
                    <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-400">
                      Entries open
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Entries closed
                    </span>
                  )}
                </div>
                <h2 className="mt-3 text-sm font-semibold text-slate-50">{t.title}</h2>
                <p className="mt-1 text-xs text-slate-300 line-clamp-2">{t.prize_text}</p>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-300">
                  <div className="flex flex-wrap items-center gap-3">
                    <span>Entry fee: {Number(t.entry_fee) === 0 ? 'FREE' : `₹${t.entry_fee}`}</span>
                    <span>Slots: {t.filled_slots}/{t.max_slots}</span>
                    <span>Req: Level 45+, Diamond 1+</span>
                  </div>
                  {t.youtube_live_url && (
                    <span className="text-sky-400 group-hover:text-sky-300">
                      Subscribe &amp; watch live →
                    </span>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
