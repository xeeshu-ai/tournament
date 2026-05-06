import React from 'react'
import { supabasePlayer } from './supabaseClient'

const PlayerContext = React.createContext(null)

// Module-level lock — prevents concurrent fetchOrCreate calls for the same auth_id
let _fetchLock = null

export function PlayerProvider({ children }) {
  const [user, setUser] = React.useState(undefined)
  const [profile, setProfile] = React.useState(undefined)
  const [setupModalOpen, setSetupModalOpen] = React.useState(false)

  async function fetchOrCreateProfile(u) {
    if (!u) { setProfile(null); return }

    // If a fetch is already in-flight for this user, wait for it instead of firing a second one
    if (_fetchLock) {
      const result = await _fetchLock
      if (result) {
        setProfile(result)
        if (!result.profile_setup) setSetupModalOpen(true)
      }
      return
    }

    _fetchLock = (async () => {
      const SELECT_COLS = 'id, auth_id, full_name, email, phone, ff_uid, status, is_verified, rejection_reason, created_at, profile_setup'

      const { data: existing } = await supabasePlayer
        .from('players')
        .select(SELECT_COLS)
        .eq('auth_id', u.id)
        .maybeSingle()

      if (existing) return existing

      // Use upsert with onConflict so concurrent calls never produce two rows.
      // The UNIQUE constraint on auth_id means the second call just returns the existing row.
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
          { onConflict: 'auth_id', ignoreDuplicates: false }
        )
        .select(SELECT_COLS)
        .maybeSingle()

      if (error) {
        // Fallback: row likely exists from a concurrent call — just fetch it
        const { data: fallback } = await supabasePlayer
          .from('players')
          .select(SELECT_COLS)
          .eq('auth_id', u.id)
          .maybeSingle()
        return fallback ?? null
      }

      return upserted ?? null
    })()

    try {
      const result = await _fetchLock
      if (result) {
        setProfile(result)
        const isNew = !result.profile_setup
        if (isNew) setSetupModalOpen(true)
      } else {
        setProfile(null)
      }
    } finally {
      _fetchLock = null
    }
  }

  React.useEffect(() => {
    // getUser() + onAuthStateChange both fire on mount — only process the first one.
    // We use the lock above to coalesce them safely.
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
