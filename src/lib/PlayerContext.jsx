import React from 'react'
import { supabasePlayer } from './supabaseClient'

const PlayerContext = React.createContext(null)

export function PlayerProvider({ children }) {
  const [user, setUser] = React.useState(undefined)    // undefined = loading
  const [profile, setProfile] = React.useState(undefined) // undefined = loading

  async function fetchProfile(u) {
    if (!u) { setProfile(null); return }
    const { data } = await supabasePlayer
      .from('players')
      // NOTE: ff_uid removed — per-game UIDs now live in game_profiles table
      .select('id, auth_id, full_name, email, phone, status, rejection_reason, created_at')
      .eq('auth_id', u.id)
      .maybeSingle()
    setProfile(data ?? null)
  }

  React.useEffect(() => {
    supabasePlayer.auth.getUser().then(({ data }) => {
      const u = data?.user ?? null
      setUser(u)
      fetchProfile(u)
    })

    const { data: sub } = supabasePlayer.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null
      setUser(u)
      fetchProfile(u)
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  function refreshProfile() {
    if (user) return fetchProfile(user)
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
