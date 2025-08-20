// src/PublicPlayer.jsx

import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from './supabaseClient'
import PlayButton from './PlayButton'

export default function PublicPlayer() {
  const { shareId } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [teamData, setTeamData] = useState(null)
  const [freshToken, setFreshToken] = useState(null)

  useEffect(() => {
    const fetchAndRefreshToken = async () => {
      if (!shareId) { /* ... */ return }
      try {
        // 1. Get the initial data, including the owner's user ID
        const { data: initialData, error: functionError } = await supabase.functions.invoke('get-public-team-data', {
          body: { shareId }
        })
        if (functionError) throw functionError
        
        // 2. Call the new refresh function to get a fresh token
        const { data: tokenData, error: refreshError } = await supabase.functions.invoke('spotify-refresh', {
          body: { owner_user_id: initialData.ownerUserId } // We need to add ownerUserId to the get-public-team-data response
        })
        if (refreshError) throw refreshError
        
        setTeamData(initialData)
        setFreshToken(tokenData.new_access_token)

      } catch (err) {
        setError(err.message || 'Could not load team data.')
      } finally {
        setLoading(false)
      }
    }
    fetchAndRefreshToken()
  }, [shareId])

  if (loading) return <div>Loading player...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <div>
      <h1>{teamData.teamName}</h1>
      {/* ... table ... */}
      <tbody>
        {teamData.players.map(player => (
          <tr key={player.id}>
            {/* ... tds ... */}
            <td>
              <PlayButton 
                songUri={player.song_uri} 
                startTimeMs={player.song_start_time}
                accessTokenOverride={freshToken} // Pass the newly refreshed token
              />
            </td>
          </tr>
        ))}
      </tbody>
    </div>
  )
}