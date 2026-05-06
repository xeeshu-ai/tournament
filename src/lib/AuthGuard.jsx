import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { usePlayer } from './PlayerContext'

/**
 * Wraps any route that requires:
 *  - a logged-in user
 *  - a completed Tournvia profile (profile_setup = true)
 *
 * While auth state is loading (user === undefined) we show nothing.
 */
export function AuthGuard({ children }) {
  const { user, profile } = usePlayer()
  const location = useLocation()

  // Still resolving auth state — render nothing (avoids flash)
  if (user === undefined || profile === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <span className="h-8 w-8 rounded-full border-2 border-sky-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  // Not logged in → /login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Logged in but profile not set up → /profile-setup
  if (profile && !profile.profile_setup) {
    if (location.pathname !== '/profile-setup') {
      return <Navigate to="/profile-setup" replace />
    }
  }

  return children
}
