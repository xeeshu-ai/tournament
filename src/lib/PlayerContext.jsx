import React from 'react'
import { supabasePlayer } from './supabaseClient'

const PlayerContext = React.createContext(null)

const SELECT_COLS = 'id, auth_id, full_name, email, phone, status, rejection_reason, created_at, profile_setup'

export function PlayerProvider({ children }) {
  const [user, setUser] = React.useState(undefined)   // undefined = loading, null = logged out
  const [profile, setProfile] = React.useState(undefined)

  async function fetchOrCreateProfile(u) {
    if (!u) { setProfile(null); return }

    // 1. Try fetch existing row
    const { data: existing } = await supabasePlayer
      .from('players')
      .select(SELECT_COLS)
      .eq('auth_id', u.id)
      .maybeSingle()

    if (existing) { setProfile(existing); return }

    // 2. Insert new row — status must be 'active' to satisfy the DB check constraint
    const { data: inserted, error } = await supabasePlayer
      .from('players')
      .insert({ auth_id: u.id, email: u.email, full_name: '', status: 'active', profile_setup: false })
      .select(SELECT_COLS)
      .maybeSingle()

    if (error) {
      // Race condition — fetch again
      const { data: fallback } = await supabasePlayer
        .from('players')
        .select(SELECT_COLS)
        .eq('auth_id', u.id)
        .maybeSingle()
      setProfile(fallback ?? null)
      return
    }
    setProfile(inserted ?? null)
  }

  async function fetchGameProfile(playerId, gameId) {
    if (!playerId || !gameId) return null
    const { data } = await supabasePlayer
      .from('game_profiles')
      .select('id, game_id, game_uid, in_game_name, status, rejection_reason')
      .eq('player_id', playerId)
      .eq('game_id', gameId)
      .maybeSingle()
    return data ?? null
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

  async function refreshProfile() {
    if (user) await fetchOrCreateProfile(user)
  }

  return (
    <PlayerContext.Provider value={{ user, profile, refreshProfile, fetchGameProfile }}>
      {children}
    </PlayerContext.Provider>
  )
}

export function usePlayer() {
  return React.useContext(PlayerContext)
}
