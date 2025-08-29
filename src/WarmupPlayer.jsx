// src/PublicWarmupPlayer.jsx

import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from './supabaseClient'
import AudioUnlocker from './AudioUnlocker'

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
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);

  useEffect(() => {
    const getPublicDataAndToken = async () => {
      if (!isAudioUnlocked || !shareId) return;
      
      try {
        setLoading(true);
        const { data: team, error: teamError } = await supabase
          .rpc('get_public_team_details', { share_id_in: shareId })
          .single();
        if (teamError) throw teamError;
        if (!team.warmup_playlist_id) throw new Error("No warmup playlist is set for this team.");

        const initialData = {
            teamName: team.team_name,
            teamId: team.team_id,
            ownerUserId: team.owner_user_id,
            warmup_playlist_id: team.warmup_playlist_id,
        }
        setTeamData(initialData);

        const { data: tokenData, error: refreshError } = await supabase.functions.invoke('spotify-refresh', { body: { owner_user_id: initialData.ownerUserId } });
        if (refreshError) throw refreshError;
        setAccessToken(tokenData.new_access_token);
        initializePlayer(tokenData.new_access_token);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    getPublicDataAndToken();
  }, [shareId, isAudioUnlocked]);

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

  if (!isAudioUnlocked) {
    return <AudioUnlocker onUnlock={() => setIsAudioUnlocked(true)} />;
  }
  if (loading) return <div className="page-content"><p>Loading Warmup Player...</p></div>
  if (error) return <div className="page-content"><p>Error: {error} <Link to={`/public/${shareId}`}>Go Back</Link></p></div>

  return (
    <div className="page-content">
      <div style={{marginBottom: '20px'}}>
        <Link to={`/public/${shareId}`}>
          <button className="btn-secondary" style={{width: 'auto'}}>{'<'} Back to Walk-up Player</button>
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
      {teamData?.teamName && <p className="playlist-name">{teamData.teamName} Warmup Mix</p>}
    </div>
  )
}