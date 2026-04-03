import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { supabasePlayer } from '../lib/supabaseClient'

export function AppShell({ children }) {
  const location = useLocation()
  const [user, setUser] = React.useState(null)

  React.useEffect(() => {
    supabasePlayer.auth.getUser().then(({ data }) => {
      setUser(data?.user ?? null)
    })
    const { data: sub } = supabasePlayer.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => {
      sub.subscription.unsubscribe()
    }
  }, [])

  const handleLogin = async () => {
  await supabasePlayer.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin
    }
  })
}

  const handleLogout = async () => {
    await supabasePlayer.auth.signOut()
  }

  const navItems = [
    { to: '/', label: 'Home' },
    { to: '/tournaments', label: 'Tournaments' },
    { to: '/rules', label: 'Rules' },
    { to: '/contact', label: 'Contact' }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900">
      <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500 text-slate-950 shadow-lg shadow-sky-500/40">
              <span className="text-lg font-black tracking-tight">T</span>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold tracking-wide">Tournvia</span>
              <span className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Free Fire Esports</span>
            </div>
          </Link>

          <div className="hidden items-center gap-6 text-sm font-medium text-slate-200 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={
                  location.pathname === item.to
                    ? 'text-sky-400'
                    : 'text-slate-300 hover:text-sky-300 transition-colors'
                }
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Link
                  to="/profile"
                  className="hidden items-center gap-2 rounded-full border border-slate-700/80 bg-slate-900/60 px-3 py-1 text-xs font-medium text-slate-200 hover:border-sky-500/70 md:inline-flex"
                >
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-500 text-[11px] font-semibold text-slate-950">
                    {user.email?.[0]?.toUpperCase()}
                  </span>
                  <span className="max-w-[120px] truncate">{user.email}</span>
                </Link>
                <button onClick={handleLogout} className="btn-secondary text-xs">
                  Logout
                </button>
              </>
            ) : (
              <button onClick={handleLogin} className="btn-primary text-xs">
                Login with Google
              </button>
            )}
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {children}
      </main>

      <footer className="border-t border-slate-800/80 bg-slate-950/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 text-xs text-slate-500">
          <span>© {new Date().getFullYear()} Tournvia. All rights reserved.</span>
          <span className="hidden md:inline">Built for Free Fire mobile players — no emulators, fair play only.</span>
        </div>
      </footer>
    </div>
  )
}
