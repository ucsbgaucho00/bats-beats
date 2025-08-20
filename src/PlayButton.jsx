// src/PlayButton.jsx

import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabaseClient'

// A global variable to hold the Spotify Player instance
let spotifyPlayer = null;
let device_id = null;

// This function initializes the Spotify Player
const initializePlayer = (accessToken) => {
  if (window.Spotify && accessToken && !spotifyPlayer) {
    spotifyPlayer = new window.Spotify.Player({
      name: 'Bats & Beats Web Player',
      getOAuthToken: cb => { cb(accessToken); }
    });

    // Error handling
    spotifyPlayer.addListener('initialization_error', ({ message }) => { console.error(message); });
    spotifyPlayer.addListener('authentication_error', ({ message }) => { console.error(message); });
    spotifyPlayer.addListener('account_error', ({ message }) => { console.error(message); });
    spotifyPlayer.addListener('playback_error', ({ message }) => { console.error(message); });

    // Playback status updates
    spotifyPlayer.addListener('player_state_changed', state => { console.log(state); });

    // Ready
    spotifyPlayer.addListener('ready', ({ device_id: ready_device_id }) => {
      console.log('Ready with Device ID', ready_device_id);
      device_id = ready_device_id;
    });

    // Not Ready
    spotifyPlayer.addListener('not_ready', ({ device_id }) => {
      console.log('Device ID has gone offline', device_id);
    });

    // Connect to the player!
    spotifyPlayer.connect();
  }
};

export default function PlayButton({ songUri, startTimeMs }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [accessToken, setAccessToken] = useState(null);

  // Refs to store timer IDs so we can clear them
  const timeoutRef = useRef(null);
  const fadeIntervalRef = useRef(null);

  // 1. Get the user's access token on component mount
  useEffect(() => {
    const fetchToken = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('spotify_access_token')
          .eq('id', session.user.id)
          .single();
        if (profile?.spotify_access_token) {
          setAccessToken(profile.spotify_access_token);
          initializePlayer(profile.spotify_access_token);
        }
      }
    };
    fetchToken();
  }, []);

  // Function to start the fade out
  const startFadeOut = () => {
    let volume = 100;
    fadeIntervalRef.current = setInterval(() => {
      volume -= 10;
      if (volume >= 0 && spotifyPlayer) {
        spotifyPlayer.setVolume(volume / 100);
      } else {
        clearInterval(fadeIntervalRef.current);
        spotifyPlayer.pause();
        spotifyPlayer.setVolume(1); // Reset volume for next play
        setIsPlaying(false);
      }
    }, 100); // 10 steps over 1 second
  };

  // Function to handle the play/pause click
  const handlePlay = async () => {
    if (!spotifyPlayer || !device_id) {
      alert('Spotify player is not ready. Please ensure you are active on this device.');
      return;
    }

    if (isPlaying) {
      // If currently playing, stop everything
      clearTimeout(timeoutRef.current);
      clearInterval(fadeIntervalRef.current);
      spotifyPlayer.pause();
      setIsPlaying(false);
    } else {
      // If not playing, start playback
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
        // Set a timeout to start the fade-out after 20 seconds
        timeoutRef.current = setTimeout(startFadeOut, 20000);
      } catch (error) {
        console.error("Failed to start playback:", error);
      }
    }
  };

  return (
    <button onClick={handlePlay} disabled={!songUri}>
      {isPlaying ? 'Pause' : 'Play'}
    </button>
  );
}