import React from 'react'
import { supabasePlayer } from './supabaseClient'

const PlayerContext = React.createContext(null)

export function PlayerProvider({ children }) {
  const [user, setUser] = React.useState(undefined)       // undefined = loading
  const [profile, setProfile] = React.useState(undefined) // undefined = loading

  async function fetchOrCreateProfile(u) {
    if (!u) { setProfile(null); return }

    // Try to fetch existing players row
    const { data: existing } = await supabasePlayer
      .from('players')
      .select('id, auth_id, full_name, email, phone, status, rejection_reason, created_at, profile_setup')
      .eq('auth_id', u.id)
      .maybeSingle()

    if (existing) {
      setProfile(existing)
      return
    }

    // First ever login — create a bare-minimum row
    // full_name left empty so the setup modal forces the player to enter it themselves
    const { data: created, error } = await supabasePlayer
      .from('players')
      .insert({
        auth_id: u.id,
        email: u.email,
        full_name: '',        // intentionally blank — setup modal fills this
        status: 'active',
        profile_setup: false, // triggers the setup modal
      })
      .select('id, auth_id, full_name, email, phone, status, rejection_reason, created_at, profile_setup')
      .single()

    if (error) {
      // Race condition guard — row may have just been created by a parallel request
      const { data: retry } = await supabasePlayer
        .from('players')
        .select('id, auth_id, full_name, email, phone, status, rejection_reason, created_at, profile_setup')
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

  // needsSetup = logged in, row exists, but setup modal not yet completed
  const needsSetup = !!user && !!profile && profile.profile_setup === false

  return (
    <PlayerContext.Provider value={{ user, profile, refreshProfile, needsSetup }}>
      {children}
    </PlayerContext.Provider>
  )
}

export function usePlayer() {
  return React.useContext(PlayerContext)
}
