import React from 'react'
import { supabasePlayer } from '../../lib/supabaseClient'

/**
 * RoomCodeCard
 * Shows the room ID and password for a tournament to the host of the registered team.
 *
 * Props:
 *   tournamentId  — the tournament's ID (number or string)
 *   registration  — the tournament_registrations row for the current player's team
 *                   (must have: id, status, is_host)
 */
export function RoomCodeCard({ tournamentId, registration }) {
  const [roomCode, setRoomCode] = React.useState(null)
  const [loading, setLoading] = React.useState(true)
  const [copied, setCopied] = React.useState(null) // 'id' | 'pass' | null
  const [showPass, setShowPass] = React.useState(false)

  const isHost = registration?.is_host === true
  const isApproved = registration?.status === 'approved'

  React.useEffect(() => {
    if (!isApproved || !isHost || !tournamentId) {
      setLoading(false)
      return
    }
    async function load() {
      setLoading(true)
      const { data, error } = await supabasePlayer
        .from('room_codes')
        .select('room_id, room_password, is_revealed')
        .eq('tournament_id', tournamentId)
        .maybeSingle()
      if (!error) setRoomCode(data || null)
      setLoading(false)
    }
    load()
  }, [tournamentId, isApproved, isHost])

  const handleCopy = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      // clipboard not available
    }
  }

  // ── Not a host ──
  if (!isHost) return null

  // ── Not approved yet ──
  if (!isApproved) return null

  // ── Loading ──
  if (loading) {
    return (
      <div className="card animate-pulse space-y-3">
        <div className="h-3 w-24 rounded bg-slate-700/60" />
        <div className="h-8 w-full rounded bg-slate-700/50" />
        <div className="h-8 w-full rounded bg-slate-700/50" />
      </div>
    )
  }

  // ── Room code not set yet ──
  if (!roomCode) {
    return (
      <div className="card border-slate-700/40 space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          Room Code
        </p>
        <p className="text-xs text-slate-400">
          Room details haven't been set by the admin yet. Check back closer to match time.
        </p>
      </div>
    )
  }

  // ── Room code exists but not revealed ──
  if (!roomCode.is_revealed) {
    return (
      <div className="card border-amber-500/20 bg-amber-500/5 space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-500/80">
          Room Code
        </p>
        <div className="flex items-center gap-2">
          <span className="text-base">🔒</span>
          <p className="text-xs text-amber-300/80">
            Room details are locked. Admin will reveal them when it's time to join.
          </p>
        </div>
      </div>
    )
  }

  // ── Room code revealed ──
  return (
    <div className="card border-emerald-500/20 bg-emerald-500/5 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-400/80">
          Room Code
        </p>
        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
          🟢 Live
        </span>
      </div>

      <p className="text-[11px] text-slate-400">
        You are the host of your team. Share these details with your teammates to join the room.
      </p>

      {/* Room ID */}
      <div className="rounded-lg border border-slate-700/50 bg-slate-900/60 px-4 py-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Room ID</p>
          <p className="text-sm font-bold text-slate-100 tracking-widest truncate">
            {roomCode.room_id}
          </p>
        </div>
        <button
          onClick={() => handleCopy(roomCode.room_id, 'id')}
          className="shrink-0 rounded-md border border-slate-600/50 bg-slate-700/40 px-3 py-1.5 text-[11px] font-medium text-slate-300 hover:bg-slate-700/70 hover:text-slate-100 transition-colors"
        >
          {copied === 'id' ? '✓ Copied' : 'Copy'}
        </button>
      </div>

      {/* Room Password */}
      <div className="rounded-lg border border-slate-700/50 bg-slate-900/60 px-4 py-3 flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Password</p>
          <p className="text-sm font-bold text-slate-100 tracking-widest truncate">
            {showPass ? roomCode.room_password : '••••••••'}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            onClick={() => setShowPass((v) => !v)}
            className="rounded-md border border-slate-600/50 bg-slate-700/40 px-3 py-1.5 text-[11px] font-medium text-slate-300 hover:bg-slate-700/70 hover:text-slate-100 transition-colors"
          >
            {showPass ? 'Hide' : 'Show'}
          </button>
          <button
            onClick={() => handleCopy(roomCode.room_password, 'pass')}
            className="rounded-md border border-slate-600/50 bg-slate-700/40 px-3 py-1.5 text-[11px] font-medium text-slate-300 hover:bg-slate-700/70 hover:text-slate-100 transition-colors"
          >
            {copied === 'pass' ? '✓ Copied' : 'Copy'}
          </button>
        </div>
      </div>

      <p className="text-[10px] text-slate-500">
        ⚠️ Do not share the room password publicly. Only share with your confirmed teammates.
      </p>
    </div>
  )
}
