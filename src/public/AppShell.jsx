import React from 'react'
import { Link, useLocation, useParams, useNavigate, Outlet } from 'react-router-dom'
import { supabasePlayer } from '../lib/supabaseClient'
import { usePlayer } from '../lib/PlayerContext'
import { getGame } from '../lib/constants'

function MenuIcon({ open }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" style={{ transition: 'transform 0.25s' }}>
      {open
        ? <><line x1="4" y1="4" x2="18" y2="18" /><line x1="18" y1="4" x2="4" y2="18" /></>
        : <><line x1="3" y1="6" x2="19" y2="6" /><line x1="3" y1="11" x2="19" y2="11" /><line x1="3" y1="16" x2="19" y2="16" /></>}
    </svg>
  )
}

export function AppShell() {
  const location = useLocation()
  const { gameId } = useParams()
  const navigate = useNavigate()
  const { user, profile } = usePlayer()
  const [sidebarOpen, setSidebarOpen] = React.useState(false)

  const game = gameId ? getGame(gameId) : null

  React.useEffect(() => { setSidebarOpen(false) }, [location.pathname])
  React.useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [sidebarOpen])

  const handleLogout = async () => {
    await supabasePlayer.auth.signOut()
    navigate('/login')
  }

  const navItems = game
    ? [
        { to: `/${game.id}/tournaments`, label: 'Tournaments', icon: <TrophyIcon /> },
        { to: `/${game.id}/profile`,     label: 'Profile',     icon: <UserIcon /> },
        { to: `/${game.id}/rules`,       label: 'Rules',       icon: <ShieldIcon /> },
        { to: `/${game.id}/contact`,     label: 'Contact',     icon: <MailIcon /> },
      ]
    : [
        { to: '/select-game', label: 'Games',   icon: <GamepadIcon /> },
        { to: '/league',      label: 'League',  icon: <LeagueIcon /> },
        { to: '/rules',       label: 'Rules',   icon: <ShieldIcon /> },
        { to: '/contact',     label: 'Contact', icon: <MailIcon /> },
      ]

  const PlayerChip = () => {
    if (!profile?.profile_setup) return null
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
        <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        <span className="max-w-[100px] truncate">{profile.full_name}</span>
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900">

      {/* Sidebar backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm md:hidden" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
      )}

      {/* Mobile sidebar */}
      <aside
        className="fixed top-0 left-0 z-50 h-full w-72 flex flex-col bg-slate-900 border-r border-slate-800 md:hidden"
        style={{ transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)', transition: 'transform 0.28s cubic-bezier(0.16,1,0.3,1)' }}
        aria-label="Mobile navigation"
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <Link to={game ? `/${game.id}/tournaments` : '/select-game'} className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500 text-slate-950 shadow-lg shadow-sky-500/40">
              <span className="text-base font-black tracking-tight">T</span>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold tracking-wide text-slate-50">Tournvia</span>
              <span className="text-[10px] uppercase tracking-[0.16em] text-slate-400">{game ? game.name : 'Esports Tournaments'}</span>
            </div>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors" aria-label="Close menu">
            <MenuIcon open={true} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {game && (
            <button
              onClick={() => { navigate('/select-game'); setSidebarOpen(false) }}
              className="flex w-full items-center gap-3 rounded-xl border border-slate-700/60 bg-slate-800/40 px-3 py-2.5 text-xs font-medium text-slate-400 hover:border-slate-500 hover:text-slate-200 transition-colors mb-3"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
              Back to games
            </button>
          )}
          {navItems.map((item) => {
            const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + '/')
            return (
              <Link key={item.to} to={item.to}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors border ${
                  isActive ? 'bg-sky-500/15 text-sky-400 border-sky-500/30' : 'text-slate-300 hover:bg-slate-800 hover:text-slate-100 border-transparent'
                }`}
              >
                <span className={isActive ? 'text-sky-400' : 'text-slate-500'}>{item.icon}</span>
                {item.label}
                {item.to === '/league' && <span className="ml-auto rounded-full bg-purple-500/20 border border-purple-500/30 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-purple-300">New</span>}
                {isActive && item.to !== '/league' && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-sky-400" />}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-slate-800 px-4 py-4 space-y-3">
          <PlayerChip />
          <button onClick={handleLogout} className="w-full btn-secondary text-xs">Logout</button>
        </div>
      </aside>

      {/* Top header */}
      <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur sticky top-0 z-30">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-800 hover:text-slate-100 transition-colors md:hidden" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
              <MenuIcon open={false} />
            </button>
            <Link to={game ? `/${game.id}/tournaments` : '/select-game'} className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500 text-slate-950 shadow-lg shadow-sky-500/40">
                <span className="text-lg font-black tracking-tight">T</span>
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-semibold tracking-wide">Tournvia</span>
                <span className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{game ? game.name : 'Esports Tournaments'}</span>
              </div>
            </Link>
          </div>

          <div className="hidden items-center gap-1 md:flex">
            {game && (
              <button onClick={() => navigate('/select-game')}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors mr-2"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
                Games
              </button>
            )}
            {navItems.map((item) => (
              <Link key={item.to} to={item.to}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  location.pathname === item.to || location.pathname.startsWith(item.to + '/') ? 'bg-sky-500/10 text-sky-400' : 'text-slate-300 hover:text-sky-300 hover:bg-slate-800/60'
                }`}
              >
                {item.label}
                {item.to === '/league' && (
                  <span className="rounded-full bg-purple-500/20 border border-purple-500/30 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-purple-300">New</span>
                )}
              </Link>
            ))}
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <PlayerChip />
            <button onClick={handleLogout} className="btn-secondary text-xs">Logout</button>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>

      <footer className="border-t border-slate-800/80 bg-slate-950/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 text-xs text-slate-500">
          <span>&#169; {new Date().getFullYear()} Tournvia. All rights reserved.</span>
          <span className="hidden md:inline">Competitive mobile gaming &#8212; fair play only.</span>
        </div>
      </footer>
    </div>
  )
}

function GamepadIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="6" width="20" height="12" rx="2" /><path d="M6 12h4M8 10v4" /><circle cx="16" cy="12" r="1" fill="currentColor" /><circle cx="18" cy="10" r="1" fill="currentColor" /></svg> }
function TrophyIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 21h8M12 17v4" /><path d="M7 4H4a1 1 0 0 0-1 1v3a4 4 0 0 0 4 4h1" /><path d="M17 4h3a1 1 0 0 1 1 1v3a4 4 0 0 1-4 4h-1" /><path d="M7 4h10v7a5 5 0 0 1-10 0V4z" /></svg> }
function UserIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg> }
function ShieldIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg> }
function MailIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2" /><polyline points="2 4 12 13 22 4" /></svg> }
function LeagueIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg> }
