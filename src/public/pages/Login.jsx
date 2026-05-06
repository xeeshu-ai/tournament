import React from 'react'
import { Navigate } from 'react-router-dom'
import { supabasePlayer } from '../../lib/supabaseClient'
import { usePlayer } from '../../lib/PlayerContext'

export function Login() {
  const { user, profile } = usePlayer()
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState(null)

  // Already logged in → redirect
  if (user && profile !== undefined) {
    if (profile && !profile.profile_setup) return <Navigate to="/profile-setup" replace />
    if (profile && profile.profile_setup) return <Navigate to="/select-game" replace />
  }

  const handleGoogle = async () => {
    setLoading(true)
    setError(null)
    const { error: err } = await supabasePlayer.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/select-game' },
    })
    if (err) { setError(err.message); setLoading(false) }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-500 shadow-xl shadow-sky-500/30">
          <span className="text-3xl font-black tracking-tight text-slate-950">T</span>
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-white">Tournvia</h1>
          <p className="mt-1 text-sm text-slate-400">Competitive mobile gaming</p>
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl backdrop-blur">
        <h2 className="mb-1 text-lg font-semibold text-white">Sign in to continue</h2>
        <p className="mb-6 text-sm text-slate-400">Use your Google account to join tournaments and track your stats.</p>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <button
          onClick={handleGoogle}
          disabled={loading}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-medium text-white transition hover:border-slate-500 hover:bg-slate-700 disabled:opacity-50"
        >
          {loading ? (
            <span className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
          ) : (
            <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.1 29.3 35 24 35c-6.1 0-11-4.9-11-11s4.9-11 11-11c2.8 0 5.3 1 7.2 2.7l5.7-5.7C33.5 7.1 29 5 24 5 12.9 5 4 13.9 4 25s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z" />
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 19 13 24 13c2.8 0 5.3 1 7.2 2.7l5.7-5.7C33.5 7.1 29 5 24 5 16.3 5 9.7 9 6.3 14.7z" />
              <path fill="#4CAF50" d="M24 45c4.9 0 9.4-1.9 12.8-4.9l-5.9-5c-1.9 1.4-4.2 2.2-6.9 2.2-5.2 0-9.6-2.9-11.3-7.1l-6.6 5.1C9.6 41 16.3 45 24 45z" />
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.9 2.4-2.5 4.5-4.6 5.9l5.9 5C36.2 39.7 44 34 44 25c0-1.2-.1-2.4-.4-3.5z" />
            </svg>
          )}
          {loading ? 'Signing in…' : 'Continue with Google'}
        </button>

        <p className="mt-5 text-center text-xs text-slate-500">
          By continuing you agree to fair play rules. No cheating, no smurfing.
        </p>
      </div>
    </div>
  )
}
