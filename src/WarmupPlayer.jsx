// src/WarmupPlayer.jsx

import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from './supabaseClient'

export default function WarmupPlayer() {
  const { teamId } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [team, setTeam] = useState(null)
  const [accessToken, setAccessToken] = useState(null)
  
  // We will wire these up later
  const [isPlaying, setIsPlaying] = useState(false)
  const [isShuffle, setIsShuffle] = useState(false)

  useEffect(() => {
    const getTeamDataAndToken = async () => {
      try {
        // We'll add the data fetching logic here in a moment
        const { data: teamData, error: teamError } = await supabase
          .from('teams')
          .select('team_name, warmup_playlist_id')
          .eq('id', teamId)
          .single()
        if (teamError) throw teamError
        if (!teamData.warmup_playlist_id) throw new Error("No warmup playlist selected for this team.")
        setTeam(teamData)

        // Fetch a fresh token for the player
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          const { data, error } = await supabase.functions.invoke('spotify-refresh', {
            body: { owner_user_id: session.user.id }
          })
          if (error) throw error
          setAccessToken(data.new_access_token)
        }

      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    getTeamDataAndToken()
  }, [teamId])

  const handlePlayPause = () => { console.log("Play/Pause clicked") }
  const handleShuffle = () => { console.log("Shuffle clicked") }
  const handleSkip = () => { console.log("Skip clicked") }

  if (loading) return <div>Loading Warmup Player...</div>
  if (error) return <div>Error: {error} <Link to="/dashboard">Go Back</Link></div>

  return (
    <div>
      <Link to="/dashboard">{'<'} Back to Dashboard</Link>
      <h1>{team.team_name}</h1>
      <h2>Warmup Mix</h2>
      <div className="player-controls" style={{ marginTop: '20px' }}>
        <button onClick={handleShuffle} style={{ backgroundColor: isShuffle ? 'lightgreen' : 'white' }}>
          Shuffle
        </button>
        <button onClick={handlePlayPause} style={{ margin: '0 15px', fontSize: '1.5em' }}>
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <button onClick={handleSkip}>
          Skip Track
        </button>
      </div>
    </div>
  )
}