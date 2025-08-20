// src/PlayButton.jsx

import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabaseClient'

let spotifyPlayer = null;
let device_id = null;

const initializePlayer = (accessToken) => {
  // Disconnect any existing player to prevent duplicates
  if (spotifyPlayer) {
    spotifyPlayer.disconnect();
  }
  
  if (window.Spotify && accessToken) {
    spotifyPlayer = new window.Spotify.Player({
      name: 'Bats & Beats Web Player',
      getOAuthToken: cb => { cb(accessToken); }
    });

    // ... (Error listeners are the same)
    spotifyPlayer.addListener('initialization_error', ({ message }) => { console.error(message); });
    spotifyPlayer.addListener('authentication_error', ({ message }) => { console.error(message); });
    spotifyPlayer.addListener('account_error', ({ message }) => { console.error(message); });
    spotifyPlayer.addListener('playback_error', ({ message }) => { console.error(message); });
    spotifyPlayer.addListener('player_state_changed', state => { /* console.log(state); */ });

    spotifyPlayer.addListener('ready', ({ device_id: ready_device_id }) => {
      console.log('Ready with Device ID', ready_device_id);
      device_id = ready_device_id;
    });

    spotifyPlayer.addListener('not_ready', ({ device_id }) => {
      console.log('Device ID has gone offline', device_id);
    });

    spotifyPlayer.connect();
  }
};

export default function PlayButton({ songUri, startTimeMs }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [accessToken, setAccessToken] = useState(null);

  const timeoutRef = useRef(null);
  const fadeIntervalRef = useRef(null);

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

  const startFadeOut = () => {
    clearInterval(fadeIntervalRef.current); // Ensure no multiple fades run
    let volume = 100;
    fadeIntervalRef.current = setInterval(() => {
      volume -= 10;
      if (volume >= 0 && spotifyPlayer) {
        spotifyPlayer.setVolume(volume / 100).catch(e => console.error(e));
      } else {
        clearInterval(fadeIntervalRef.current);
        if (spotifyPlayer) {
          spotifyPlayer.pause();
          spotifyPlayer.setVolume(1); // Reset volume for next play
        }
        setIsPlaying(false);
      }
    }, 100);
  };

  const handlePlay = async () => {
    if (!spotifyPlayer || !device_id) {
      alert('Spotify player is not ready. Please ensure you are active on this device.');
      return;
    }

    // --- THIS IS THE CORRECTED LOGIC ---
    if (isPlaying) {
      // If currently playing, ALWAYS trigger the fade-out to stop the music
      clearTimeout(timeoutRef.current); // Stop the 20-second timer
      startFadeOut(); // Initiate the 1-second fade-out
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
}```

### Deploy and Test

1.  **Commit and push** this one-file change to GitHub.
    ```bash
    git add .
    git commit -m "fix: Ensure manual pause also triggers fade-out"
    git push
    ```
2.  **Wait for Vercel** to deploy.
3.  **Test the new behavior:**
    *   Go to a team page and click "Play" on a song.
    *   Before the 20 seconds are up, click the "Pause" button.
    *   The song should now perform the same 1-second fade-out instead of stopping abruptly.

This will make the app's behavior consistent and feel much more polished. Let me know how it works