// src/Dashboard.jsx

import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import TeamManager from './TeamManager'

// Your Stripe Price IDs
const SINGLE_PRICE_ID = 'price_1RlcrbIjwUvbU06TzNxDJYkJ'
const HOME_RUN_PRICE_ID = 'price_1RlcroIjwUvbU06TJIpGIBlT'
const UPGRADE_PRICE_ID = 'price_1RlcrbIjwUvbU06TUPGRADEPRICEID'

export default function Dashboard({ session }) {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    const getProfile = async () => {
      try {
        setLoading(true)
        const { user } = session
        const { data, error, status } = await supabase
          .from('profiles')
          .select(`license, stripe_customer_id, spotify_access_token`)
          .eq('id', user.id)
          .single()

        if (error && status !== 406) throw error
        if (data) setProfile(data)
      } catch (error) {
        alert(error.message)
      } finally {
        setLoading(false)
      }
    }
    getProfile()
  }, [session])

  const createCheckoutSession = async (priceId) => {
    // ... (This function is unchanged)
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
    // ... (This function is unchanged)
    try {
      const { data, error } = await supabase.functions.invoke('spotify-auth', { method: 'GET' })
      if (error) throw new Error('Failed to get Spotify auth URL: ' + error.message)
      window.location.href = data.url
    } catch (error) {
      alert(error.message)
    }
  }

  // --- NEW FUNCTION TO HANDLE SPOTIFY DISCONNECT ---
  const handleSpotifyDisconnect = async () => {
    if (window.confirm('Are you sure you want to disconnect your Spotify account?')) {
      try {
        // Update the user's profile to remove the tokens
        const { error } = await supabase
          .from('profiles')
          .update({
            spotify_access_token: null,
            spotify_refresh_token: null,
          })
          .eq('id', session.user.id)

        if (error) throw error

        // Update the local state to instantly reflect the change in the UI
        setProfile({ ...profile, spotify_access_token: null })
        alert('Successfully disconnected from Spotify.')
      } catch (error) {
        alert('Error disconnecting from Spotify: ' + error.message)
      }
    }
  }

  return (
    <div className="form-widget">
      <h1>Welcome to Your Dashboard</h1>
      
      {loading ? (
        <p>Loading your profile...</p>
      ) : (
        <div>
          <h2>Your License: {profile?.license || 'None'}</h2>

          <div style={{ border: '1px solid #ccc', padding: '10px', margin: '20px 0' }}>
            <h3>Spotify Connection</h3>
            {profile?.spotify_access_token ? (
              // --- UPDATED VIEW FOR WHEN CONNECTED ---
              <>
                <p style={{ color: 'green' }}>✔ Connected to Spotify</p>
                <button onClick={handleSpotifyDisconnect}>Disconnect from Spotify</button>
              </>
            ) : (
              <>
                <p>Connect your Spotify Premium account to enable music playback.</p>
                <button onClick={handleSpotifyConnect}>Connect to Spotify</button>
              </>
            )}
          </div>
          
          {/* ... (Rest of the license and team manager UI is unchanged) ... */}
          {!profile?.license && ( /* ... */ )}
          {profile?.license === 'Single' && ( /* ... */ )}
          {profile?.license === 'Home Run' && ( /* ... */ )}
        </div>
      )}

      <br />
      <button className="button block" onClick={() => supabase.auth.signOut()}>
        Sign Out
      </button>
    </div>
  )
}