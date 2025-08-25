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
    spotifyPlayer.addListener('not_ready', () => { device_id = null; });
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
      if (!shareId) return;
      try {
        setLoading(true);

        // --- THIS IS THE CRITICAL FIX ---
        // Use a direct fetch call to make a GET request to our function
        const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-public-team-data?shareId=${shareId}`;
        const response = await fetch(functionUrl, {
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          }
        });
        if (!response.ok) {
          const errorBody = await response.json();
          throw new Error(errorBody.error || 'Failed to fetch team data');
        }
        const initialData = await response.json();
        // --- END OF CRITICAL FIX ---

        const { data: teamDetails, error: teamError } = await supabase
            .from('teams')
            .select('warmup_playlist_id')
            .eq('id', initialData.teamId)
            .single()
        if (teamError) throw teamError
        if (!teamDetails.warmup_playlist_id) throw new Error("No warmup playlist is set for this team.")

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

  const startFadeOut = (andThen) => {
    clearInterval(fadeIntervalRef.current);
    let volume = 100;
    fadeIntervalRef.current = setInterval(() => {
      volume -= 5;
      if (volume >= 0 && spotifyPlayer) {
        spotifyPlayer.setVolume(volume / 100).catch(e => console.error(e));
      } else {
        clearInterval(fadeIntervalRef.current);
        if (spotifyPlayer) {
          spotifyPlayer.pause();
          spotifyPlayer.setVolume(1);
        }
        setIsPlaying(false);
        if (andThen) andThen();
      }
    }, 100);
  };

  const handlePlayPause = async () => {
    if (!spotifyPlayer || !device_id) {
      alert('Spotify player is not ready. Please make this your active device.');
      return;
    }
    if (isPlaying) {
      startFadeOut();
    } else {
      await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${device_id}`, {
        method: 'PUT',
        body: JSON.stringify({ context_uri: `spotify:playlist:${teamData.warmup_playlist_id}` }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
      });
      setTimeout(() => handleShuffle(isShuffle), 500);
      setIsPlaying(true);
    }
  };

  const handleShuffle = async (shuffleState) => {
    if (!accessToken) return;
    await fetch(`https://api.spotify.com/v1/me/player/shuffle?state=${shuffleState}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    setIsShuffle(shuffleState);
  };

  const handleSkip = async () => {
    if (!accessToken) return;
    await fetch(`https://api.spotify.com/v1/me/player/next`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    setIsPlaying(true);
  };

  if (loading) return <div>Loading Warmup Player...</div>
  if (error) return <div>Error: {error} <Link to={`/public/${shareId}`}>Go Back</Link></div>

  return (
    <div>
      <Link to={`/public/${shareId}`}>{'<'} Back to Player</Link>
      <h1>{teamData?.teamName}</h1>
      <h2>Warmup Mix</h2>
      <div className="player-controls" style={{ marginTop: '20px' }}>
        <button onClick={() => handleShuffle(!isShuffle)} style={{ backgroundColor: isShuffle ? 'lightgreen' : 'white' }}>
          Shuffle {isShuffle ? 'On' : 'Off'}
        </button>
        <button onClick={handlePlayPause} className="play-pause-btn">
          {isPlaying ? '❚❚' : '▶'}
        </button>
        <button onClick={handleSkip}>
          Skip Track
        </button>
      </div>
    </div>
  )
}