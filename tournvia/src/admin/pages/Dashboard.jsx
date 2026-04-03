import React from 'react'
import { supabaseAdmin } from '../../lib/supabaseClient'

export function Dashboard() {
  const [stats, setStats] = React.useState(null)

  React.useEffect(() => {
    let ignore = false
    async function load() {
      const [players, pendingPlayers, tournaments, pendingPayments, complaints] = await Promise.all([
        supabaseAdmin.from('players').select('id', { count: 'exact', head: true }),
        supabaseAdmin.from('players').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabaseAdmin.from('tournaments').select('id', { count: 'exact', head: true }).eq('is_archived', false),
        supabaseAdmin.from('payment_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabaseAdmin.from('contact_messages').select('id', { count: 'exact', head: true }).eq('is_reviewed', false)
      ])
      if (!ignore) {
        setStats({
          totalPlayers: players.count || 0,
          pendingPlayers: pendingPlayers.count || 0,
          activeTournaments: tournaments.count || 0,
          pendingPayments: pendingPayments.count || 0,
          openComplaints: complaints.count || 0
        })
      }
    }
    load()
    return () => {
      ignore = true
    }
  }, [])

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-slate-50">Overview</h1>
        <p className="text-xs text-slate-400">
          Quick snapshot of the platform. All numbers update live from Supabase.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Registered players" value={stats?.totalPlayers} sub="All Google-verified accounts" />
        <StatCard label="Pending approvals" value={stats?.pendingPlayers} sub="Profiles waiting for manual check" />
        <StatCard label="Active tournaments" value={stats?.activeTournaments} sub="Not archived, upcoming or live" />
        <StatCard label="Pending payments" value={stats?.pendingPayments} sub="Slots requested, awaiting confirm" />
        <StatCard label="Open complaints" value={stats?.openComplaints} sub="Contact messages not reviewed" />
      </div>
    </div>
  )
}

function StatCard({ label, value, sub }) {
  return (
    <div className="card space-y-1">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-2xl font-semibold text-slate-50">{value ?? '…'}</p>
      <p className="text-[11px] text-slate-500">{sub}</p>
    </div>
  )
}
