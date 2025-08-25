// src/PlayButton.jsx

import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabaseClient'

let spotifyPlayer = null;
let device_id = null;

const initializePlayer = (accessToken) => {
  if (spotifyPlayer) {
    spotifyPlayer.disconnect();
  }
  if (window.Spotify && accessToken) {
    spotifyPlayer = new window.Spotify.Player({
      name: 'Bats & Beats Web Player',
      getOAuthToken: cb => { cb(accessToken); }
    });
    // ... (error listeners)
    spotifyPlayer.addListener('initialization_error', ({ message }) => { console.error('Init Error:', message); });
    spotifyPlayer.addListener('authentication_error', ({ message }) => { console.error('Auth Error:', message); });
    spotifyPlayer.addListener('account_error', ({ message }) => { console.error('Account Error:', message); });
    spotifyPlayer.addListener('playback_error', ({ message }) => { console.error('Playback Error:', message); });
    
    spotifyPlayer.addListener('ready', ({ device_id: ready_device_id }) => {
      console.log('Ready with Device ID', ready_device_id);
      device_id = ready_device_id;
    });
    // ... (other listeners)
    spotifyPlayer.addListener('not_ready', ({ device_id }) => { console.log('Device ID has gone offline', device_id); });
    spotifyPlayer.connect();
  }
};

// --- THIS IS THE CORRECTED COMPONENT ---
export default function PlayButton({ songUri, startTimeMs, accessTokenOverride = null }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [accessToken, setAccessToken] = useState(accessTokenOverride);

  const timeoutRef = useRef(null);
  const fadeIntervalRef = useRef(null);

  useEffect(() => {
    // This effect now ONLY handles initializing the player when the token is ready.
    if (accessToken) {
      initializePlayer(accessToken);
    }
  }, [accessToken]);

  useEffect(() => {
    // This effect handles fetching the token IF no override is provided.
    const fetchTokenForLoggedInUser = async () => {
      if (!accessTokenOverride) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('spotify_access_token')
            .eq('id', session.user.id)
            .single();
          if (profile?.spotify_access_token) {
            setAccessToken(profile.spotify_access_token);
          }
        }
      }
    };
    fetchTokenForLoggedInUser();
  }, [accessTokenOverride]);


  const startFadeOut = () => {
    // ... (function is unchanged)
    clearInterval(fadeIntervalRef.current);
    let volume = 100;
    fadeIntervalRef.current = setInterval(() => {
      volume -= 10;
      if (volume >= 0 && spotifyPlayer) {
        spotifyPlayer.setVolume(volume / 100).catch(e => console.error(e));
      } else {
        clearInterval(fadeIntervalRef.current);
        if (spotifyPlayer) {
          spotifyPlayer.pause();
          spotifyPlayer.setVolume(1);
        }
        setIsPlaying(false);
      }
    }, 100);
  };

  const handlePlay = async () => {
    // ... (function is unchanged)
    if (!spotifyPlayer || !device_id) {
      alert('Spotify player is not ready. Please ensure you are active on this device and select the "Bats & Beats Web Player" in your Spotify app.');
      return;
    }
    if (isPlaying) {
      clearTimeout(timeoutRef.current);
      startFadeOut();
    } else {
      try {
        await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${device_id}`, {
          method: 'PUT',
          body: JSON.stringify({ uris: [songUri], position_ms: startTimeMs }),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
        });
        setIsPlaying(true);
        timeoutRef.current = setTimeout(startFadeOut, 20000);
      } catch (error) {
        console.error("Failed to start playback:", error);
      }
    }
  };

  return (
    <button onClick={handlePlay} disabled={!songUri} className="play-pause-btn">{isPlaying ? '❚❚' : '▶'}</button>
  );
}