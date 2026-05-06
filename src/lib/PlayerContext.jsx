import React from 'react'
import { supabasePlayer } from './supabaseClient'

const PlayerContext = React.createContext(null)

export function PlayerProvider({ children }) {
  const [user, setUser] = React.useState(undefined)       // undefined = loading
  const [profile, setProfile] = React.useState(undefined) // undefined = loading

  async function fetchOrCreateProfile(u) {
    if (!u) { setProfile(null); return }

    const { data: existing } = await supabasePlayer
      .from('players')
      .select('id, auth_id, full_name, email, phone, ff_uid, status, is_verified, rejection_reason, created_at, profile_setup')
      .eq('auth_id', u.id)
      .maybeSingle()

    if (existing) { setProfile(existing); return }

    // First ever login — insert bare row
    // ff_uid is now nullable so this INSERT will succeed
    const { data: created, error } = await supabasePlayer
      .from('players')
      .insert({
        auth_id: u.id,
        email: u.email,
        full_name: '',
        status: 'pending',
        profile_setup: false,
      })
      .select('id, auth_id, full_name, email, phone, ff_uid, status, is_verified, rejection_reason, created_at, profile_setup')
      .single()

    if (error) {
      // Race condition — row may already exist
      const { data: retry } = await supabasePlayer
        .from('players')
        .select('id, auth_id, full_name, email, phone, ff_uid, status, is_verified, rejection_reason, created_at, profile_setup')
        .eq('auth_id', u.id)
        .maybeSingle()
      setProfile(retry ?? null)
    } else {
      setProfile(created)
    }
  }

  React.useEffect(() => {
    supabasePlayer.auth.getUser().then(({ data }) => {
      const u = data?.user ?? null
      setUser(u)
      fetchOrCreateProfile(u)
    })

    const { data: sub } = supabasePlayer.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null
      setUser(u)
      fetchOrCreateProfile(u)
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  function refreshProfile() {
    if (user) return fetchOrCreateProfile(user)
    return Promise.resolve()
  }

  return (
    <PlayerContext.Provider value={{ user, profile, refreshProfile }}>
      {children}
    </PlayerContext.Provider>
  )
}

export function usePlayer() {
  return React.useContext(PlayerContext)
}
