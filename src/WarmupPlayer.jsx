// src/WarmupPlayer.jsx

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
      console.log('Warmup Player Ready with Device ID', ready_device_id);
      device_id = ready_device_id;
    });
    // Add other listeners as needed
    spotifyPlayer.connect();
  }
};

export default function WarmupPlayer() {
  const { teamId } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [team, setTeam] = useState(null)
  const [playlistName, setPlaylistName] = useState('');
  const [accessToken, setAccessToken] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isShuffle, setIsShuffle] = useState(true)
  const fadeIntervalRef = useRef(null);

  useEffect(() => {
    const getTeamDataAndToken = async () => {
      try {
        setLoading(true);
        const { data: teamData, error: teamError } = await supabase
          .from('teams')
          .select('team_name, warmup_playlist_id, user_id')
          .eq('id', teamId)
          .single()
        if (teamError) throw teamError
        if (!teamData.warmup_playlist_id) throw new Error("No warmup playlist selected for this team.")
        setTeam(teamData)

        const { data, error } = await supabase.functions.invoke('spotify-refresh', {
          body: { owner_user_id: teamData.user_id }
        })
        if (error) throw error
        const token = data.new_access_token;
        setAccessToken(token)
        initializePlayer(token)

        const playlistResponse = await fetch(`https://api.spotify.com/v1/playlists/${teamData.warmup_playlist_id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!playlistResponse.ok) throw new Error("Could not fetch playlist details.");
        const playlistData = await playlistResponse.json();
        setPlaylistName(playlistData.name);

      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    getTeamDataAndToken()
  }, [teamId])

  useEffect(() => {
    return () => {
      if (isPlaying && spotifyPlayer) {
        startFadeOut();
      }
    };
  }, [isPlaying]);

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
        body: JSON.stringify({ context_uri: `spotify:playlist:${team.warmup_playlist_id}` }),
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

  if (loading) return <div className="page-content"><p>Loading Warmup Player...</p></div>
  if (error) return <div className="page-content"><p>Error: {error} <Link to="/dashboard">Go Back</Link></p></div>

  return (
    <div className="page-content">
      <div style={{marginBottom: '20px'}}>
        <Link to="/dashboard">
          <button className="btn-secondary" style={{width: 'auto'}}>{'<'} Back to Dashboard</button>
        </Link>
      </div>
      
      <div className="warmup-controls">
        <button onClick={() => handleShuffle(!isShuffle)} className={`skip-shuffle-btn ${isShuffle ? 'btn-primary' : 'btn-secondary'}`}>
          <i className="fa-solid fa-shuffle"></i>
        </button>
        <button onClick={handlePlayPause} className="play-pause-btn btn-primary">
          {isPlaying ? <i className="fa-solid fa-pause"></i> : <i className="fa-solid fa-play"></i>}
        </button>
        <button onClick={handleSkip} className="skip-shuffle-btn btn-secondary">
          <i className="fa-solid fa-forward-step"></i>
        </button>
      </div>
      {playlistName && <p className="playlist-name">{playlistName}</p>}
    </div>
  )
}