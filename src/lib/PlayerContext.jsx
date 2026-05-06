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
      // Always try SELECT first
      const { data: existing } = await supabasePlayer
        .from('players')
        .select(SELECT_COLS)
        .eq('auth_id', u.id)
        .maybeSingle()

      if (existing) return existing

      // Row doesn't exist yet — insert it.
      // ignoreDuplicates: true means if the row already exists (race condition),
      // it does nothing and we fall through to the fallback fetch below.
      const { data: upserted, error } = await supabasePlayer
        .from('players')
        .upsert(
          {
            auth_id: u.id,
            email: u.email,
            full_name: '',
            status: 'pending',
            profile_setup: false,
          },
          { onConflict: 'auth_id', ignoreDuplicates: true }
        )
        .select(SELECT_COLS)
        .maybeSingle()

      if (error || !upserted) {
        // Row exists from a concurrent call — just fetch it
        const { data: fallback } = await supabasePlayer
          .from('players')
          .select(SELECT_COLS)
          .eq('auth_id', u.id)
          .maybeSingle()
        return fallback ?? null
      }

      return upserted
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
