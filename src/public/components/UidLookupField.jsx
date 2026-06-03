import React from 'react'
import { supabasePlayer } from '../../lib/supabaseClient'

/**
 * UidLookupField
 * Props:
 *   gameId       – e.g. 'bgmi' or 'free-fire'
 *   slot         – 1-based slot number for label
 *   excludeUids  – array of uids already added (prevents duplicates)
 *   onConfirm(player) – called with { player_id, game_uid, in_game_name }
 *   onClear()    – called when slot is cleared
 *   confirmed    – boolean, whether this slot is locked in
 *   confirmedData – { game_uid, in_game_name } for confirmed display
 */
export function UidLookupField({ gameId, slot, excludeUids = [], onConfirm, onClear, confirmed, confirmedData }) {
  const [uid, setUid]         = React.useState('')
  const [status, setStatus]   = React.useState('idle') // idle | loading | found | notfound | error
  const [result, setResult]   = React.useState(null)
  const timerRef              = React.useRef(null)

  const search = React.useCallback(async (value) => {
    const trimmed = value.trim()
    if (!trimmed) { setStatus('idle'); setResult(null); return }
    setStatus('loading')
    try {
      const { data, error } = await supabasePlayer
        .from('game_profiles')
        .select('id, player_id, game_uid, in_game_name, status')
        .eq('game_id', gameId)
        .eq('game_uid', trimmed)
        .maybeSingle()

      if (error) throw error
      if (!data) { setStatus('notfound'); setResult(null); return }
      if (data.status !== 'approved') {
        setStatus('error')
        setResult({ msg: 'This player's profile is not yet verified on Tournvia.' })
        return
      }
      if (excludeUids.includes(data.game_uid)) {
        setStatus('error')
        setResult({ msg: 'This player is already in your team.' })
        return
      }
      setStatus('found')
      setResult(data)
    } catch {
      setStatus('error')
      setResult({ msg: 'Lookup failed. Please try again.' })
    }
  }, [gameId, excludeUids])

  const handleChange = (e) => {
    const v = e.target.value
    setUid(v)
    setStatus('idle')
    setResult(null)
    clearTimeout(timerRef.current)
    if (v.trim().length >= 4) {
      timerRef.current = setTimeout(() => search(v), 550)
    }
  }

  const handleConfirm = () => {
    if (result && status === 'found') {
      onConfirm({ player_id: result.player_id, game_uid: result.game_uid, in_game_name: result.in_game_name })
    }
  }

  const handleClear = () => {
    setUid('')
    setStatus('idle')
    setResult(null)
    onClear()
  }

  if (confirmed && confirmedData) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-100 truncate">{confirmedData.in_game_name}</p>
            <p className="text-[10px] text-slate-400">UID: {confirmedData.game_uid} · Teammate {slot}</p>
          </div>
        </div>
        <button onClick={handleClear} className="ml-2 flex-shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-colors" aria-label="Remove teammate">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-slate-300">Teammate {slot} — In-game UID</label>
      <div className="flex gap-2">
        <input
          type="text"
          inputMode="text"
          autoComplete="off"
          value={uid}
          onChange={handleChange}
          placeholder={`Enter ${gameId === 'bgmi' ? 'BGMI' : 'Free Fire'} UID...`}
          className="flex-1 rounded-xl border border-slate-600/60 bg-slate-800/60 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-sky-500/70 focus:ring-1 focus:ring-sky-500/30 transition-all"
        />
        <button
          onClick={() => search(uid)}
          disabled={status === 'loading' || !uid.trim()}
          className="flex-shrink-0 rounded-xl border border-slate-600/60 bg-slate-700/50 px-3 py-2 text-slate-300 hover:bg-slate-600/60 hover:text-slate-100 disabled:opacity-40 transition-all"
          aria-label="Search UID"
        >
          {status === 'loading'
            ? <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10" strokeOpacity="0.2" /><path d="M12 2a10 10 0 0 1 10 10" /></svg>
            : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
          }
        </button>
      </div>

      {status === 'found' && result && (
        <div className="flex items-center justify-between rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
          <div>
            <p className="text-xs font-semibold text-slate-100">{result.in_game_name}</p>
            <p className="text-[10px] text-slate-400">UID: {result.game_uid} · Verified ✓</p>
          </div>
          <button onClick={handleConfirm} className="rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-sky-400 transition-colors">
            Add
          </button>
        </div>
      )}

      {status === 'notfound' && (
        <p className="text-[11px] text-red-400 flex items-center gap-1">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
          No verified player found with that UID.
        </p>
      )}

      {status === 'error' && result?.msg && (
        <p className="text-[11px] text-red-400 flex items-center gap-1">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
          {result.msg}
        </p>
      )}
    </div>
  )
}
