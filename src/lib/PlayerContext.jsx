import React from 'react'
import { supabasePlayer } from './supabaseClient'

const PlayerContext = React.createContext(null)

export function PlayerProvider({ children }) {
  const [user, setUser] = React.useState(undefined)   // undefined = loading
  const [profile, setProfile] = React.useState(undefined) // undefined = loading

  // Fetch profile row for a given user
  async function fetchProfile(u) {
    if (!u) { setProfile(null); return }
    const { data } = await supabasePlayer
      .from('players')
      .select('full_name, ff_uid, phone, status, rejection_reason')
      .eq('auth_id', u.id)
      .maybeSingle()
    setProfile(data ?? null)
  }

  // Bootstrap: get current session then listen for changes
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

  // Called by Profile page after a successful insert/update so badge updates instantly
  function refreshProfile() {
    if (user) fetchProfile(user)
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
