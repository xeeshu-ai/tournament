import React from 'react'
import { supabasePlayer } from '../../lib/supabaseClient'

export function Profile() {
  const [user, setUser] = React.useState(null)
  const [profile, setProfile] = React.useState(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    let ignore = false
    async function load() {
      const { data } = await supabasePlayer.auth.getUser()
      const u = data?.user
      setUser(u)
      if (!u) {
        setLoading(false)
        return
      }
      const { data: profileData } = await supabasePlayer
        .from('players')
        .select('*')
        .eq('auth_id', u.id)
        .maybeSingle()
      if (!ignore) {
        setProfile(profileData || null)
        setLoading(false)
      }
    }
    load()
    return () => {
      ignore = true
    }
  }, [])

  if (loading) return <p className="text-xs text-slate-400">Loading profile…</p>
  if (!user) return <p className="text-xs text-slate-300">Login with Google to view your Tournvia profile.</p>

  const statusLabel = profile?.status || 'pending'

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-500 text-lg font-semibold text-slate-950">
          {user.email?.[0]?.toUpperCase()}
        </div>
        <div>
          <h1 className="text-xl font-semibold text-slate-50">{profile?.full_name || user.email}</h1>
          <p className="text-xs text-slate-400">{user.email}</p>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="card space-y-2 text-xs text-slate-200">
          <h2 className="text-sm font-semibold text-slate-50">Account status</h2>
          <p>
            Status:{' '}
            <span
              className={
                statusLabel === 'approved'
                  ? 'font-semibold text-emerald-400'
                  : statusLabel === 'rejected'
                  ? 'font-semibold text-red-400'
                  : 'font-semibold text-amber-300'
              }
            >
              {statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)}  
            </span>
          </p>
          {!profile?.is_verified && (
            <p className="text-[11px] text-amber-300">
              Info submitted successfully. Verification in progress — usually takes 6 to 12 hours.
            </p>
          )}
          <p>Free Fire UID: {profile?.ff_uid || 'Not submitted yet'}</p>
          <p>Phone: {profile?.phone || 'Not added'}</p>
        </div>

        <div className="card space-y-3 text-xs text-slate-200">
          <h2 className="text-sm font-semibold text-slate-50">Name change</h2>
          <p>
            Once approved, your UID is locked forever. You can request a display name change that matches your in-game Free Fire name.
          </p>
          <button className="btn-secondary text-xs" type="button" disabled>
            Request name change (wired in Supabase)
          </button>
          <p className="text-[11px] text-slate-400">
            This button is a UI placeholder. After you create the
            <code className="mx-1 rounded bg-slate-900 px-1 py-0.5">name_change_requests</code> table and RLS policies, wire this to insert a new request row.
          </p>
        </div>
      </section>
    </div>
  )
}
