// src/Dashboard.jsx

import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import TeamManager from './TeamManager'
import { useOutletContext } from 'react-router-dom'

export default function Dashboard() {
  const { session } = useOutletContext()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  
  const UPGRADE_PRICE_ID = 'price_1RlcrbIjwUvbU06TUPGRADEPRICEID' // Ensure this is correct

  useEffect(() => {
    const getProfile = async () => {
      try {
        setLoading(true)
        const { user } = session
        const { data, error } = await supabase
          .from('profiles')
          .select(`license, spotify_access_token, role`)
          .eq('id', user.id)
          .single()
        if (error) throw error
        setProfile(data)
      } catch (error) {
        alert(error.message)
      } finally {
        setLoading(false)
      }
    }
    getProfile()
  }, [session]);

  const createCheckoutSession = async (priceId) => { /* ... (unchanged) ... */ }
  const handleSpotifyConnect = async () => { /* ... (unchanged) ... */ }
  const handleSpotifyDisconnect = async () => { /* ... (unchanged) ... */ }

  return (
    <div className="page-content">
      <h1>Dashboard</h1>
      
      {loading ? (
        <p>Loading your profile...</p>
      ) : profile ? (
        <div>
          <div className="team-card">
            <h3>Spotify Connection</h3>
            {profile.spotify_access_token ? (
              <>
                <p style={{ color: 'green', marginTop: 0 }}>✔ Connected to Spotify</p>
                <button onClick={handleSpotifyDisconnect} className="btn-secondary" style={{width: 'auto'}}>Disconnect</button>
              </>
            ) : (
              <>
                <p style={{ marginTop: 0 }}>Connect your Spotify Premium account to enable music playback.</p>
                <button onClick={handleSpotifyConnect} className="btn-primary" style={{width: 'auto'}}>Connect to Spotify</button>
              </>
            )}
          </div>
          
          {profile.license === 'Single' && (
            <div className="team-card">
              <h3>Upgrade Your License</h3>
              <button onClick={() => createCheckoutSession(UPGRADE_PRICE_ID)} disabled={loading} className="btn-primary" style={{width: 'auto'}}>
                Upgrade to Home Run ($5.00)
              </button>
            </div>
          )}

          <TeamManager session={session} profile={profile} />
        </div>
      ) : (
        <p>Could not load your profile.</p>
      )}
    </div>
  )
}