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
      if (!shareId) {
        setError('No share ID provided.')
        setLoading(false)
        return
      }
      try {
        setLoading(true)
        // 1. Get the initial data, including the owner's user ID
        const { data: initialData, error: functionError } = await supabase.functions.invoke('get-public-team-data', {
          body: { shareId }
        })
        if (functionError) throw functionError
        
        // 2. Call the new refresh function to get a fresh token
        const { data: tokenData, error: refreshError } = await supabase.functions.invoke('spotify-refresh', {
          body: { owner_user_id: initialData.ownerUserId }
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
      <p>Walk-up songs</p>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Player</th>
            <th>Song</th>
            <th>Play</th>
          </tr>
        </thead>
        <tbody>
          {teamData.players.map(player => (
            <tr key={player.id}>
              <td>{player.player_number}</td>
              <td>
                {/* --- NEW: Format player name --- */}
                {`${player.first_name} ${player.last_name ? player.last_name.charAt(0) + '.' : ''}`}
              </td>
              <td>
                {/* --- NEW: Display song title and artist --- */}
                {player.song_title ? (
                  <div>
                    <strong>{player.song_title}</strong>
                    <br />
                    <span style={{fontSize: '0.9em', color: '#555'}}>{player.song_artist}</span>
                  </div>
                ) : (
                  'N/A'
                )}
              </td>
              <td>
                <PlayButton 
                  songUri={player.song_uri} 
                  startTimeMs={player.song_start_time}
                  accessTokenOverride={freshToken}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}