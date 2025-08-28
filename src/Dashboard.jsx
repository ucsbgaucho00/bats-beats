// src/Dashboard.jsx

import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import TeamManager from './TeamManager'
import { useOutletContext } from 'react-router-dom'

export default function Dashboard() {
  const { session } = useOutletContext()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  
  const UPGRADE_PRICE_ID = 'price_1RlcrbIjwUvbU06TUPGRADEPRICEID';

  useEffect(() => {
    const getProfile = async () => {
      if (!session) return;
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

  const createCheckoutSession = async (priceId) => {
    try {
      setLoading(true)
      const { data, error } = await supabase.functions.invoke('create-checkout-session', { body: { priceId } })
      if (error) throw error
      window.location.href = data.url
    } catch (error) {
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSpotifyConnect = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('spotify-auth', { method: 'GET' })
      if (error) throw new Error('Failed to get Spotify auth URL: ' + error.message)
      window.location.href = data.url
    } catch (error) {
      alert(error.message)
    }
  }

  const handleSpotifyDisconnect = async () => {
    if (window.confirm('Are you sure you want to disconnect your Spotify account?')) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({
            spotify_access_token: null,
            spotify_refresh_token: null,
          })
          .eq('id', session.user.id)
        if (error) throw error
        setProfile({ ...profile, spotify_access_token: null })
        alert('Successfully disconnected from Spotify.')
      } catch (error) {
        alert('Error disconnecting from Spotify: ' + error.message)
      }
    }
  }

  return (
    <div className="page-content">
      <h1>Dashboard</h1>
      
      {loading ? (
        <p>Loading your profile...</p>
      ) : profile ? (
        <div>
          <div className="card">
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
            <div className="card">
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