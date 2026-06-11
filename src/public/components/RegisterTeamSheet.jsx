import React from 'react'
import { supabasePlayer } from '../../lib/supabaseClient'
import { usePlayer } from '../../lib/PlayerContext'
import { UidLookupField } from './UidLookupField'

/**
 * RegisterTeamSheet
 * Props:
 *   tournament     – full tournament row
 *   gameProfile    – caller's own verified game_profile row (or null)
 *   onClose()      – close without registering
 *   onRegistered() – called after successful registration
 */
export function RegisterTeamSheet({ tournament, gameProfile, onClose, onRegistered }) {
  const { user, profile } = usePlayer()
  const teamSize = tournament.team_size ?? 1
  const totalSlots = teamSize - 1 // teammates (excluding host)

  const [step, setStep]         = React.useState(1) // 1 | 2 | 3
  const [teamName, setTeamName] = React.useState('')
  const [teammates, setTeammates] = React.useState(
    Array.from({ length: totalSlots }, () => ({ confirmed: false, data: null }))
  )
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError]           = React.useState('')

  const allTeammatesConfirmed = totalSlots === 0 || teammates.every(t => t.confirmed)
  const confirmedUids = [gameProfile?.game_uid, ...teammates.filter(t => t.confirmed).map(t => t.data?.game_uid)].filter(Boolean)

  const handleTeammateConfirm = (idx, data) => {
    setTeammates(prev => prev.map((t, i) => i === idx ? { confirmed: true, data } : t))
  }
  const handleTeammateClear = (idx) => {
    setTeammates(prev => prev.map((t, i) => i === idx ? { confirmed: false, data: null } : t))
  }

  const handleSubmit = async () => {
  setSubmitting(true)
  setError('')
  try {
    const isFree = !tournament.entry_fee || Number(tournament.entry_fee) === 0

    // 1. Insert registration
    const { data: reg, error: regErr } = await supabasePlayer
      .from('tournament_registrations')
      .insert({
        tournament_id:  tournament.id,
        player_id:      user.id,          // ← ADD THIS (fixes checkMyReg)
        host_player_id: user.id,
        host_uid:       gameProfile?.game_uid ?? '',
        team_name:      teamName.trim(),
        status:         isFree ? 'pending' : 'pending_payment',
      })
      .select('id')
      .single()
    if (regErr) throw regErr

    // 2. Insert members
    const members = [
      {
        registration_id: reg.id,
        player_id:       user.id,
        slot:            1,
        game_uid:        gameProfile?.game_uid ?? '',
        in_game_name:    gameProfile?.in_game_name ?? profile?.full_name ?? '',
      },
      ...teammates.map((t, i) => ({
        registration_id: reg.id,
        player_id:       t.data.player_id,
        slot:            i + 2,
        game_uid:        t.data.game_uid,
        in_game_name:    t.data.in_game_name,
      }))
    ]
    const { error: memErr } = await supabasePlayer
      .from('registration_members').insert(members)
    if (memErr) throw memErr

    // 3. For paid tournaments — call quick-service to create Cashfree order
    if (!isFree) {
      const { data: { session } } = await supabasePlayer.auth.getSession()
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/quick-service`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            registration_id: tournament.id,
            amount: tournament.entry_fee,
            player_id: user.id,
          }),
        }
      )
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Payment initiation failed')
      // Redirect to Cashfree payment page
      if (result.payment_url) {
        window.location.href = result.payment_url
        return
      }
    }

    onRegistered()
  } catch (e) {
    setError(e.message ?? 'Registration failed. Please try again.')
    setSubmitting(false)
  }
}
  const isFree = !tournament.entry_fee || Number(tournament.entry_fee) === 0

  return (
    // Overlay
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Register team">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className="relative z-10 w-full sm:max-w-md mx-auto bg-slate-900 border border-slate-700/60 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90dvh] flex flex-col" style={{ animation: 'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)' }}>

        {/* Drag handle – mobile only */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-slate-600" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700/60 px-5 py-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-sky-400">League Registration</p>
            <h2 className="text-sm font-semibold text-slate-100">{tournament.title}</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-colors" aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 px-5 pt-4 pb-2">
          {[1, 2, 3].filter(s => s !== 2 || totalSlots > 0).map((s, idx, arr) => (
            <React.Fragment key={s}>
              <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold transition-colors ${
                step === s ? 'bg-sky-500 text-slate-950' :
                step > s  ? 'bg-emerald-500/30 text-emerald-300' :
                            'bg-slate-700/60 text-slate-500'
              }`}>{step > s ? '✓' : s}</div>
              {idx < arr.length - 1 && <div className={`flex-1 h-px transition-colors ${step > s ? 'bg-emerald-500/40' : 'bg-slate-700/40'}`} />}
            </React.Fragment>
          ))}
          <span className="ml-auto text-[10px] text-slate-500">
            {step === 1 ? 'Team name' : step === 2 ? 'Add teammates' : 'Confirm'}
          </span>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* ── Step 1: Team Name ── */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Team Name</label>
                <input
                  type="text"
                  maxLength={24}
                  value={teamName}
                  onChange={e => setTeamName(e.target.value)}
                  placeholder="e.g. Phantom Squad"
                  className="w-full rounded-xl border border-slate-600/60 bg-slate-800/60 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-sky-500/70 focus:ring-1 focus:ring-sky-500/30 transition-all"
                  autoFocus
                />
                <p className="mt-1 text-[10px] text-slate-500">{teamName.length}/24 characters</p>
              </div>

              {/* Host info card */}
              <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1">You (Captain)</p>
                <p className="text-sm font-semibold text-slate-100">{gameProfile?.in_game_name ?? profile?.full_name}</p>
                <p className="text-[10px] text-slate-400">UID: {gameProfile?.game_uid} · Verified ✓</p>
              </div>

              {/* Mode info */}
              <div className="flex flex-wrap gap-2">
                {tournament.mode_label && <span className="rounded-lg border border-slate-700/50 bg-slate-800/40 px-2.5 py-1 text-[10px] font-medium text-slate-300">{tournament.mode_label}</span>}
                <span className="rounded-lg border border-slate-700/50 bg-slate-800/40 px-2.5 py-1 text-[10px] font-medium text-slate-300">{teamSize === 1 ? 'Solo' : teamSize === 2 ? 'Duo' : `Squad (${teamSize})`}</span>
                <span className={`rounded-lg border px-2.5 py-1 text-[10px] font-medium ${isFree ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-amber-500/30 bg-amber-500/10 text-amber-300'}`}>
                  {isFree ? 'Free Entry' : `₹${tournament.entry_fee}`}
                </span>
              </div>
            </div>
          )}

          {/* ── Step 2: Teammates ── */}
          {step === 2 && totalSlots > 0 && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">Enter each teammate's in-game UID. They must be registered and verified on Tournvia.</p>
              {teammates.map((t, i) => (
                <UidLookupField
                  key={i}
                  gameId={tournament.game_id}
                  slot={i + 1}
                  excludeUids={confirmedUids}
                  confirmed={t.confirmed}
                  confirmedData={t.data}
                  onConfirm={(data) => handleTeammateConfirm(i, data)}
                  onClear={() => handleTeammateClear(i)}
                />
              ))}
            </div>
          )}

          {/* ── Step 3: Review ── */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 divide-y divide-slate-700/40">
                {/* Team header */}
                <div className="px-4 py-3">
                  <p className="text-[10px] uppercase tracking-widest text-slate-500">Team</p>
                  <p className="text-base font-bold text-slate-100">{teamName}</p>
                </div>
                {/* Members */}
                <div className="px-4 py-3 space-y-2.5">
                  {/* Host */}
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold flex-shrink-0">C</span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-100 truncate">{gameProfile?.in_game_name ?? profile?.full_name}</p>
                      <p className="text-[10px] text-slate-400">UID: {gameProfile?.game_uid} · Captain</p>
                    </div>
                  </div>
                  {/* Teammates */}
                  {teammates.map((t, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-700/60 text-slate-400 text-[10px] font-bold flex-shrink-0">{i + 2}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-100 truncate">{t.data?.in_game_name}</p>
                        <p className="text-[10px] text-slate-400">UID: {t.data?.game_uid}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Footer */}
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">{tournament.mode_label ?? ''} · {tournament.total_rounds ?? '?'} Rounds</span>
                  <span className={`text-xs font-semibold ${isFree ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {isFree ? 'Free Entry' : `₹${tournament.entry_fee}`}
                  </span>
                </div>
              </div>

              <p className="flex items-start gap-1.5 text-[11px] text-slate-400">
                <svg className="mt-0.5 flex-shrink-0" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                Team composition cannot be changed after submission.
              </p>

              {error && (
                <p className="rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-xs text-red-400">{error}</p>
              )}
            </div>
          )}
        </div>

        {/* Sticky footer buttons */}
        <div className="border-t border-slate-700/60 px-5 py-4 flex gap-3">
          {step > 1 && (
            <button onClick={() => setStep(s => s - 1)} className="btn-secondary flex-1">
              ← Back
            </button>
          )}

          {step === 1 && (
            <button
              onClick={() => { if (totalSlots === 0) setStep(3); else setStep(2) }}
              disabled={teamName.trim().length < 2}
              className="btn-primary flex-1 disabled:opacity-40"
            >
              Continue →
            </button>
          )}

          {step === 2 && (
            <button
              onClick={() => setStep(3)}
              disabled={!allTeammatesConfirmed}
              className="btn-primary flex-1 disabled:opacity-40"
            >
              Review →
            </button>
          )}

          {step === 3 && (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="btn-primary flex-1 disabled:opacity-40"
            >
              {submitting ? 'Submitting…' : '✅ Submit Team'}
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(40px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  )
}
