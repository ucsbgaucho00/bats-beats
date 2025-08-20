// src/WarmupPlayer.jsx

import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from './supabaseClient'

// --- Global variables for the Spotify Player SDK ---
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
    // ... (error listeners)
    spotifyPlayer.addListener('ready', ({ device_id: ready_device_id }) => {
      console.log('Warmup Player Ready with Device ID', ready_device_id);
      device_id = ready_device_id;
    });
    spotifyPlayer.connect();
  }
};

export default function WarmupPlayer() {
  const { teamId } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [team, setTeam] = useState(null)
  const [accessToken, setAccessToken] = useState(null)
  
  const [isPlaying, setIsPlaying] = useState(false)
  const [isShuffle, setIsShuffle] = useState(true) // Shuffle is on by default

  const fadeIntervalRef = useRef(null);

  useEffect(() => {
    const getTeamDataAndToken = async () => {
      try {
        const { data: teamData, error: teamError } = await supabase
          .from('teams')
          .select('team_name, warmup_playlist_id')
          .eq('id', teamId)
          .single()
        if (teamError) throw teamError
        if (!teamData.warmup_playlist_id) throw new Error("No warmup playlist selected for this team.")
        setTeam(teamData)

        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          const { data, error } = await supabase.functions.invoke('spotify-refresh', {
            body: { owner_user_id: session.user.id }
          })
          if (error) throw error
          setAccessToken(data.new_access_token)
          // Initialize the player once we have a fresh token
          initializePlayer(data.new_access_token)
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    getTeamDataAndToken()
  }, [teamId])

  // --- NEW: 2-Second Fade Out Function ---
  const startFadeOut = (andThen) => {
    clearInterval(fadeIntervalRef.current);
    let volume = 100;
    fadeIntervalRef.current = setInterval(() => {
      volume -= 5; // 20 steps over 2 seconds
      if (volume >= 0 && spotifyPlayer) {
        spotifyPlayer.setVolume(volume / 100).catch(e => console.error(e));
      } else {
        clearInterval(fadeIntervalRef.current);
        if (spotifyPlayer) {
          spotifyPlayer.pause();
          spotifyPlayer.setVolume(1);
        }
        setIsPlaying(false);
        if (andThen) andThen(); // Execute next action (like skip) after fade
      }
    }, 100);
  };

  // --- UPDATED HANDLER FUNCTIONS ---
  const handlePlayPause = async () => {
    if (!spotifyPlayer || !device_id) {
      alert('Spotify player is not ready. Please make this your active device.');
      return;
    }
    if (isPlaying) {
      startFadeOut();
    // ...
} else {
  // Start playing the selected playlist
  await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${device_id}`, {
    method: 'PUT',
    body: JSON.stringify({ context_uri: `spotify:playlist:${team.warmup_playlist_id}` }),
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
  });

  // --- THIS IS THE FIX ---
  // Wait a brief moment for the device to become active before setting shuffle
  setTimeout(() => {
    handleShuffle(isShuffle);
  }, 500); // 500ms delay

  setIsPlaying(true);
}
  }

  const handleShuffle = async (shuffleState) => {
    if (!accessToken) return;
    await fetch(`https://api.spotify.com/v1/me/player/shuffle?state=${shuffleState}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    setIsShuffle(shuffleState);
  }

  const handleSkip = async () => {
    if (!accessToken) return;
    await fetch(`https://api.spotify.com/v1/me/player/next`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    setIsPlaying(true); // Assume playback continues
  }

  if (loading) return <div>Loading Warmup Player...</div>
  if (error) return <div>Error: {error} <Link to="/dashboard">Go Back</Link></div>

  return (
    <div>
      <Link to="/dashboard">{'<'} Back to Dashboard</Link>
      <h1>{team.team_name}</h1>
      <h2>Warmup Mix</h2>
      <div className="player-controls" style={{ marginTop: '20px' }}>
        <button onClick={() => handleShuffle(!isShuffle)} style={{ backgroundColor: isShuffle ? 'lightgreen' : 'white' }}>
          Shuffle {isShuffle ? 'On' : 'Off'}
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