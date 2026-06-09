import React from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabasePlayer } from '../../lib/supabaseClient'

function LoadingDots() {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.3s]" />
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.15s]" />
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
    </span>
  )
}

export default function PaymentStatus() {
  const [params] = useSearchParams()
  const navigate = useNavigate()

  const orderId = params.get('order_id')
  const regId   = params.get('reg_id')

  const [status, setStatus]   = React.useState('loading') // loading | confirmed | payment_failed | pending_payment | unknown
  const [reg,    setReg]      = React.useState(null)
  const [attempts, setAttempts] = React.useState(0)

  // Poll Supabase for registration status (max 10 attempts, 2s apart)
  React.useEffect(() => {
    if (!regId) { setStatus('unknown'); return }

    let mounted = true
    let timer

    async function poll() {
      const { data, error } = await supabasePlayer
        .from('tournament_registrations')
        .select('id, status, team_name, tournament_id, cashfree_order_id, paid_at')
        .eq('id', regId)
        .maybeSingle()

      if (!mounted) return

      if (error || !data) {
        setStatus('unknown')
        return
      }

      setReg(data)

      if (data.status === 'confirmed' || data.status === 'payment_failed') {
        setStatus(data.status)
        return
      }

      // Still pending — retry up to 10 times
      setAttempts(prev => {
        const next = prev + 1
        if (next >= 10) {
          setStatus(data.status || 'pending_payment')
        } else {
          timer = setTimeout(poll, 2000)
        }
        return next
      })
    }

    poll()
    return () => { mounted = false; clearTimeout(timer) }
  }, [regId])

  const goHome = () => navigate('/')
  const goTournament = () => {
    if (reg?.tournament_id) navigate(`/tournaments/${reg.tournament_id}`)
    else navigate('/')
  }

  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111827]/90 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.85)] overflow-hidden backdrop-blur-sm">

        {/* Header */}
        <div className="border-b border-white/10 px-6 py-5">
          <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400">Payment</p>
          <h1 className="mt-1 text-lg font-semibold text-slate-100">Order status</h1>
        </div>

        <div className="px-6 py-6 space-y-5">

          {/* ── Loading ── */}
          {status === 'loading' && (
            <div className="flex flex-col items-center gap-4 py-8 text-slate-400">
              <LoadingDots />
              <p className="text-sm">
                {attempts > 0 ? `Checking status… (attempt ${attempts}/10)` : 'Verifying your payment…'}
              </p>
            </div>
          )}

          {/* ── Confirmed ── */}
          {status === 'confirmed' && (
            <>
              <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-4">
                <svg className="shrink-0 text-emerald-400" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-emerald-300">Payment successful</p>
                  <p className="text-xs text-emerald-400/70 mt-0.5">Your registration is confirmed.</p>
                </div>
              </div>

              {reg && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                    <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400">Team</div>
                    <div className="mt-1 text-sm font-semibold text-slate-100">{reg.team_name || '—'}</div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                    <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400">Order ID</div>
                    <div className="mt-1 text-xs font-mono text-slate-300 truncate">{orderId || reg.cashfree_order_id || '—'}</div>
                  </div>
                  {reg.paid_at && (
                    <div className="col-span-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                      <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400">Paid at</div>
                      <div className="mt-1 text-sm text-slate-300">{new Date(reg.paid_at).toLocaleString()}</div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={goTournament}
                  className="flex-1 rounded-xl bg-sky-600 hover:bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors"
                >
                  View tournament
                </button>
                <button
                  onClick={goHome}
                  className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] px-4 py-2.5 text-sm font-semibold text-slate-300 transition-colors"
                >
                  Go home
                </button>
              </div>
            </>
          )}

          {/* ── Payment failed ── */}
          {status === 'payment_failed' && (
            <>
              <div className="flex items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-4">
                <svg className="shrink-0 text-rose-400" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-rose-300">Payment failed</p>
                  <p className="text-xs text-rose-400/70 mt-0.5">Your payment was not completed. Please try again.</p>
                </div>
              </div>

              {reg?.team_name && (
                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400">Team</div>
                  <div className="mt-1 text-sm font-semibold text-slate-100">{reg.team_name}</div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={goTournament}
                  className="flex-1 rounded-xl bg-sky-600 hover:bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors"
                >
                  Try again
                </button>
                <button
                  onClick={goHome}
                  className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] px-4 py-2.5 text-sm font-semibold text-slate-300 transition-colors"
                >
                  Go home
                </button>
              </div>
            </>
          )}

          {/* ── Still pending after max retries ── */}
          {status === 'pending_payment' && (
            <>
              <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-4">
                <svg className="shrink-0 text-amber-400" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-amber-300">Payment pending</p>
                  <p className="text-xs text-amber-400/70 mt-0.5">Still processing. Check your tournament page in a few minutes.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={goTournament}
                  className="flex-1 rounded-xl bg-sky-600 hover:bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors"
                >
                  View tournament
                </button>
                <button
                  onClick={goHome}
                  className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] px-4 py-2.5 text-sm font-semibold text-slate-300 transition-colors"
                >
                  Go home
                </button>
              </div>
            </>
          )}

          {/* ── Unknown / no reg_id ── */}
          {status === 'unknown' && (
            <>
              <div className="flex items-center gap-3 rounded-xl border border-slate-500/30 bg-slate-500/10 px-4 py-4">
                <svg className="shrink-0 text-slate-400" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-slate-300">Unable to verify</p>
                  <p className="text-xs text-slate-400 mt-0.5">Could not find your registration. Please contact support.</p>
                </div>
              </div>
              <button
                onClick={goHome}
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] px-4 py-2.5 text-sm font-semibold text-slate-300 transition-colors"
              >
                Go home
              </button>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
