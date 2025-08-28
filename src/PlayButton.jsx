// src/PlayButton.jsx

import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabaseClient'

let spotifyPlayer = null;
let device_id = null;

const initializePlayer = (accessToken, onSdkStatusChange) => {
  if (spotifyPlayer) {
    spotifyPlayer.disconnect();
  }
  if (window.Spotify && accessToken) {
    spotifyPlayer = new window.Spotify.Player({
      name: 'Bats & Beats Player',
      getOAuthToken: cb => { cb(accessToken); }
    });

    // --- NEW: Report status changes ---
    spotifyPlayer.addListener('initialization_error', ({ message }) => { onSdkStatusChange(`ERROR: ${message}`); });
    spotifyPlayer.addListener('authentication_error', ({ message }) => { onSdkStatusChange(`AUTH ERROR: ${message}`); });
    spotifyPlayer.addListener('account_error', ({ message }) => { onSdkStatusChange(`ACCOUNT ERROR: ${message}`); });
    spotifyPlayer.addListener('ready', ({ device_id: ready_device_id }) => {
      device_id = ready_device_id;
      onSdkStatusChange('READY');
    });
    spotifyPlayer.addListener('not_ready', () => {
      device_id = null;
      onSdkStatusChange('OFFLINE');
    });

    spotifyPlayer.connect().then(success => {
      if (success) {
        onSdkStatusChange('Connecting...');
      }
    });
  }
};

export default function PlayButton({ songUri, startTimeMs, accessTokenOverride = null, onPlayStateChange = () => {}, onSdkStatusChange = () => {} }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [accessToken, setAccessToken] = useState(accessTokenOverride);
  const timeoutRef = useRef(null);
  const fadeIntervalRef = useRef(null);

  useEffect(() => {
    if (accessToken) {
      initializePlayer(accessToken, onSdkStatusChange);
    }
  }, [accessToken, onSdkStatusChange]);

  useEffect(() => {
    const fetchTokenForLoggedInUser = async () => {
      if (!accessTokenOverride) {
        // This is for the logged-in user view, we should add refresh logic here too eventually
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: profile } = await supabase.from('profiles').select('spotify_access_token').eq('id', session.user.id).single();
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
    <button onClick={handlePlay} disabled={!songUri} className="play-pause-btn">
      {isPlaying ? <i className="fa-solid fa-pause"></i> : <i className="fa-solid fa-play"></i>}
    </button>
  );
}