// src/WarmupPlayer.jsx

import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from './supabaseClient'

let spotifyPlayer = null;
let device_id = null;
const initializePlayer = (accessToken) => { /* ... (as before) ... */ };

export default function WarmupPlayer() {
  const { teamId } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [team, setTeam] = useState(null)
  const [accessToken, setAccessToken] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isShuffle, setIsShuffle] = useState(true)
  const fadeIntervalRef = useRef(null);

  useEffect(() => {
    // ... (main useEffect is unchanged)
  }, [teamId])

  // --- NEW: useEffect for cleanup on exit ---
  useEffect(() => {
    return () => {
      // This function runs when the component is about to unmount (e.g., user navigates away)
      if (isPlaying && spotifyPlayer) {
        console.log("Navigating away, starting fade out...");
        startFadeOut();
      }
    };
  }, [isPlaying]); // We depend on `isPlaying` to have its current value in the cleanup function

  const startFadeOut = (andThen) => { /* ... (as before) ... */ };
  const handlePlayPause = async () => { /* ... (as before) ... */ }
  const handleShuffle = async (shuffleState) => { /* ... (as before) ... */ }
  const handleSkip = async () => { /* ... (as before) ... */ }

  if (loading) return <div>Loading Warmup Player...</div>
  if (error) return <div>Error: {error} <Link to="/dashboard">Go Back</Link></div>

  return (
    // ... (The JSX is unchanged)
  )
}