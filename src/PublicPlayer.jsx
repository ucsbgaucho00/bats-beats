// src/PublicPlayer.jsx

import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from './supabaseClient'
import PlayButton from './PlayButton' // We can reuse our PlayButton component!

export default function PublicPlayer() {
  const { shareId } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [teamData, setTeamData] = useState(null)

  useEffect(() => {
    const fetchPublicData = async () => {
      if (!shareId) {
        setError('No share ID provided.')
        setLoading(false)
        return
      }
      try {
        const { data, error: functionError } = await supabase.functions.invoke('get-public-team-data', {
          body: { shareId }
        })
        if (functionError) throw functionError
        setTeamData(data)
      } catch (err) {
        setError(err.message || 'Could not load team data.')
      } finally {
        setLoading(false)
      }
    }
    fetchPublicData()
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
            <th>Name</th>
            <th>Play</th>
          </tr>
        </thead>
        <tbody>
          {teamData.players.map(player => (
            <tr key={player.id}>
              <td>{player.player_number}</td>
              <td>{`${player.first_name} ${player.last_name}`}</td>
              <td>
                {/* We pass the owner's token to the PlayButton */}
                <PlayButton 
                  songUri={player.song_uri} 
                  startTimeMs={player.song_start_time}
                  accessTokenOverride={teamData.ownerSpotifyToken}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}