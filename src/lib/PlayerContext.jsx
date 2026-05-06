import React from 'react'
import { supabasePlayer } from './supabaseClient'

const PlayerContext = React.createContext(null)

let _fetchLock = null

const SELECT_COLS = 'id, auth_id, full_name, email, phone, ff_uid, status, rejection_reason, created_at, profile_setup'

export function PlayerProvider({ children }) {
  const [user, setUser] = React.useState(undefined)
  const [profile, setProfile] = React.useState(undefined)
  const [setupModalOpen, setSetupModalOpen] = React.useState(false)

  async function fetchOrCreateProfile(u) {
    if (!u) { setProfile(null); return }

    if (_fetchLock) {
      const result = await _fetchLock
      if (result) {
        setProfile(result)
        if (!result.profile_setup) setSetupModalOpen(true)
      }
      return
    }

    _fetchLock = (async () => {
      // 1. Try to fetch the existing row first
      const { data: existing } = await supabasePlayer
        .from('players')
        .select(SELECT_COLS)
        .eq('auth_id', u.id)
        .maybeSingle()

      if (existing) return existing

      // 2. Row doesn't exist — INSERT a new one
      const { data: inserted, error: insertError } = await supabasePlayer
        .from('players')
        .insert({
          auth_id: u.id,
          email: u.email,
          full_name: '',
          status: 'pending',
          profile_setup: false,
        })
        .select(SELECT_COLS)
        .maybeSingle()

      if (insertError) {
        // Concurrent insert from another tab — just fetch the row
        const { data: fallback } = await supabasePlayer
          .from('players')
          .select(SELECT_COLS)
          .eq('auth_id', u.id)
          .maybeSingle()
        return fallback ?? null
      }

      return inserted ?? null
    })()

    try {
      const result = await _fetchLock
      if (result) {
        setProfile(result)
        if (!result.profile_setup) setSetupModalOpen(true)
      } else {
        setProfile(null)
      }
    } finally {
      _fetchLock = null
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

  function openSetupModal() { setSetupModalOpen(true) }
  function closeSetupModal() { setSetupModalOpen(false) }

  return (
    <PlayerContext.Provider value={{
      user,
      profile,
      refreshProfile,
      setupModalOpen,
      openSetupModal,
      closeSetupModal,
    }}>
      {children}
    </PlayerContext.Provider>
  )
}

export function usePlayer() {
  return React.useContext(PlayerContext)
}
