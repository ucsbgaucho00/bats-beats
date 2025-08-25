// src/PublicWarmupPlayer.jsx

import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from './supabaseClient'

let spotifyPlayer = null;
let device_id = null;

const initializePlayer = (accessToken) => {
  if (spotifyPlayer) {
    spotifyPlayer.disconnect();
  }
  if (window.Spotify && accessToken) {
    spotifyPlayer = new window.Spotify.Player({
      name: 'Bats & Beats Warmup Player',
      getOAuthToken: cb => { cb(accessToken); }
    });
    spotifyPlayer.addListener('ready', ({ device_id: ready_device_id }) => {
      console.log('Public Warmup Player Ready with Device ID', ready_device_id);
      device_id = ready_device_id;
    });
    spotifyPlayer.connect();
  }
};

export default function PublicWarmupPlayer() {
  const { shareId } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [teamData, setTeamData] = useState(null)
  const [accessToken, setAccessToken] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isShuffle, setIsShuffle] = useState(true)
  const fadeIntervalRef = useRef(null);

  useEffect(() => {
    const getPublicDataAndToken = async () => {
      try {
        const { data: initialData, error: functionError } = await supabase.functions.invoke('get-public-team-data', { body: { shareId } })
        if (functionError) throw functionError

        const { data: teamDetails, error: teamError } = await supabase
            .from('teams')
            .select('warmup_playlist_id')
            .eq('id', initialData.teamId)
            .single()
        if (teamError) throw teamError

        setTeamData({ ...initialData, warmup_playlist_id: teamDetails.warmup_playlist_id })

        const { data: tokenData, error: refreshError } = await supabase.functions.invoke('spotify-refresh', { body: { owner_user_id: initialData.ownerUserId } })
        if (refreshError) throw refreshError
        setAccessToken(tokenData.new_access_token)
        initializePlayer(tokenData.new_access_token)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    getPublicDataAndToken()
  }, [shareId])

  const startFadeOut = (andThen) => { /* ... (Same as WarmupPlayer) ... */ };
  const handlePlayPause = async () => { /* ... (Same as WarmupPlayer) ... */ };
  const handleShuffle = async (shuffleState) => { /* ... (Same as WarmupPlayer) ... */ };
  const handleSkip = async () => { /* ... (Same as WarmupPlayer) ... */ };

  if (loading) return <div>Loading Warmup Player...</div>
  if (error) return <div>Error: {error} <Link to={`/public/${shareId}`}>Go Back</Link></div>

  return (
    <div>
      <Link to={`/public/${shareId}`}>{'<'} Back to Player</Link>
      <h1>{teamData.teamName}</h1>
      <h2>Warmup Mix</h2>
      <div className="player-controls" style={{ marginTop: '20px' }}>
        <button onClick={() => handleShuffle(!isShuffle)} style={{ backgroundColor: isShuffle ? 'lightgreen' : 'white' }}>
          Shuffle {isShuffle ? 'On' : 'Off'}
        </button>
        <button onClick={handlePlayPause} style={{ margin: '0 15px', fontSize: '1.5em' }}>
          {isPlaying ? '❚❚' : '▶'}
        </button>
        <button onClick={handleSkip}>
          Skip Track
        </button>
      </div>
    </div>
  )
}