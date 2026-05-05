import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabasePlayer } from './supabaseClient'
import { usePlayer } from './PlayerContext'
import { getGame } from './constants'

const GameContext = React.createContext(null)

/**
 * GameProvider — wraps game-specific routes.
 * Reads :gameId from the URL, validates it, and exposes:
 *   - game         : the GAMES config object for this game
 *   - gameProfile  : the player's game_profiles row (null if none)
 *   - gpLoading    : true while fetching gameProfile
 *   - refreshGameProfile : re-fetch game profile after insert/update
 */
export function GameProvider({ children }) {
  const { gameId } = useParams()
  const navigate = useNavigate()
  const { user, profile } = usePlayer()

  const game = getGame(gameId)

  const [gameProfile, setGameProfile] = React.useState(undefined) // undefined = loading
  const [gpLoading, setGpLoading] = React.useState(true)

  // Redirect to game selector if gameId is unknown or coming_soon
  React.useEffect(() => {
    if (!game || game.status !== 'active') {
      navigate('/select-game', { replace: true })
    }
  }, [game, navigate])

  // Fetch game_profile whenever player or game changes
  React.useEffect(() => {
    if (!profile?.id || !game || game.status !== 'active') {
      setGameProfile(null)
      setGpLoading(false)
      return
    }
    let ignore = false
    async function fetchGP() {
      setGpLoading(true)
      const { data } = await supabasePlayer
        .from('game_profiles')
        .select('*')
        .eq('player_id', profile.id)
        .eq('game_id', game.id)
        .maybeSingle()
      if (!ignore) {
        setGameProfile(data ?? null)
        setGpLoading(false)
      }
    }
    fetchGP()
    return () => { ignore = true }
  }, [profile?.id, game?.id])

  function refreshGameProfile() {
    if (!profile?.id || !game) return Promise.resolve()
    return supabasePlayer
      .from('game_profiles')
      .select('*')
      .eq('player_id', profile.id)
      .eq('game_id', game.id)
      .maybeSingle()
      .then(({ data }) => setGameProfile(data ?? null))
  }

  if (!game) return null

  return (
    <GameContext.Provider value={{ game, gameProfile, gpLoading, refreshGameProfile }}>
      {children}
    </GameContext.Provider>
  )
}

export function useGame() {
  return React.useContext(GameContext)
}
