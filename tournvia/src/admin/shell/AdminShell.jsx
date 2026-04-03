import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabaseAdmin } from '../../lib/supabaseClient'

export function AdminShell({ children }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [user, setUser] = React.useState(null)

  React.useEffect(() => {
    supabaseAdmin.auth.getUser().then(({ data }) => {
      if (!data?.user) {
        navigate('/login')
      } else {
        setUser(data.user)
      }
    })
    const { data: sub } = supabaseAdmin.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        navigate('/login')
      } else {
        setUser(session.user)
      }
    })
    return () => {
      sub.subscription.unsubscribe()
    }
  }, [navigate])

  const handleLogout = async () => {
    await supabaseAdmin.auth.signOut()
  }

  const nav = [
    { to: '/master', label: 'Overview' },
    { to: '/master/players', label: 'Players' },
    { to: '/master/tournaments', label: 'Tournaments' },
    { to: '/master/payments', label: 'Payments' },
    { to: '/master/complaints', label: 'Complaints' }
  ]

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="flex min-h-screen">
        <aside className="hidden w-60 border-r border-slate-800 bg-slate-950/90 px-4 py-4 md:block">
          <div className="flex items-center gap-2 pb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500 text-slate-950">
              <span className="text-sm font-black">T</span>
            </div>
            <div className="leading-tight">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Master panel</p>
              <p className="text-sm font-semibold">Tournvia</p>
            </div>
          </div>
          <nav className="space-y-1 text-sm">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={
                  location.pathname === item.to
                    ? 'block rounded-lg bg-sky-500/10 px-3 py-2 text-sky-300'
                    : 'block rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-900/70 hover:text-sky-200'
                }
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="flex-1">
          <header className="flex items-center justify-between border-b border-slate-800 bg-slate-950/80 px-4 py-3">
            <div className="md:hidden">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Tournvia master</p>
            </div>
            <div className="text-xs text-slate-400">
              {user ? <span>Signed in as {user.email}</span> : <span>Checking admin session…</span>}
            </div>
            <button className="btn-secondary text-xs" type="button" onClick={handleLogout}>
              Logout
            </button>
          </header>
          <div className="px-4 py-4">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
