import React from 'react'
import { supabasePlayer } from './supabaseClient'

const PlayerContext = React.createContext(null)

export function PlayerProvider({ children }) {
  const [user, setUser] = React.useState(undefined)    // undefined = loading
  const [profile, setProfile] = React.useState(undefined) // undefined = loading

  async function fetchOrCreateProfile(u) {
    if (!u) { setProfile(null); return }

    // Try to fetch existing players row
    const { data: existing } = await supabasePlayer
      .from('players')
      .select('id, auth_id, full_name, email, phone, status, rejection_reason, created_at')
      .eq('auth_id', u.id)
      .maybeSingle()

    if (existing) {
      setProfile(existing)
      return
    }

    // First login — auto-create the players row
    const { data: created, error } = await supabasePlayer
      .from('players')
      .insert({
        auth_id: u.id,
        full_name: u.user_metadata?.full_name || u.email?.split('@')[0] || 'Player',
        email: u.email,
        status: 'active',
      })
      .select('id, auth_id, full_name, email, phone, status, rejection_reason, created_at')
      .single()

    if (error) {
      // Edge case: race condition — row may have just been created, try fetching again
      const { data: retry } = await supabasePlayer
        .from('players')
        .select('id, auth_id, full_name, email, phone, status, rejection_reason, created_at')
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
