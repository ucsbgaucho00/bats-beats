// src/Dashboard.jsx

import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import TeamManager from './TeamManager'

// Your Stripe Price IDs
const SINGLE_PRICE_ID = 'price_1RlcrbIjwUvbU06TzNxDJYkJ'
const HOME_RUN_PRICE_ID = 'price_1RlcroIjwUvbU06TJIpGIBlT'
const UPGRADE_PRICE_ID = 'price_1RlcrbIjwUvbU06TUPGRADEPRICEID' // Make sure this is your actual upgrade price ID

export default function Dashboard({ session }) {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    const getProfile = async () => {
      try {
        setLoading(true)
        const { user } = session

        // Updated query to also fetch the spotify token status
        const { data, error, status } = await supabase
          .from('profiles')
          .select(`license, stripe_customer_id, spotify_access_token`) // Added spotify_access_token
          .eq('id', user.id)
          .single()

        if (error && status !== 406) {
          throw error
        }
        if (data) {
          setProfile(data)
        }
      } catch (error) {
        alert(error.message)
      } finally {
        setLoading(false)
      }
    }
    getProfile()
  }, [session])

  const createCheckoutSession = async (priceId) => {
    // ... (This function remains unchanged)
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

  // --- NEW FUNCTION TO HANDLE SPOTIFY CONNECTION ---
  const handleSpotifyConnect = async () => {
    try {
      // Call the Edge Function that generates the Spotify auth URL
      const { data, error } = await supabase.functions.invoke('spotify-auth', {
  method: 'GET' // Change the method to GET
})
      if (error) throw new Error('Failed to get Spotify auth URL: ' + error.message)
      
      // Redirect the user to the Spotify login/permission screen
      window.location.href = data.url
    } catch (error) {
      alert(error.message)
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

          {/* --- NEW SPOTIFY CONNECTION UI --- */}
          <div style={{ border: '1px solid #ccc', padding: '10px', margin: '20px 0' }}>
            <h3>Spotify Connection</h3>
            {profile?.spotify_access_token ? (
              <p style={{ color: 'green' }}>✔ Connected to Spotify</p>
            ) : (
              <>
                <p>Connect your Spotify Premium account to enable music playback.</p>
                <button onClick={handleSpotifyConnect}>Connect to Spotify</button>
              </>
            )}
          </div>
          
          {/* --- EXISTING LICENSE AND TEAM MANAGER UI --- */}
          {!profile?.license && (
            <div>
              <h3>Purchase a License</h3>
              <button onClick={() => createCheckoutSession(SINGLE_PRICE_ID)} disabled={loading}>
                Buy Single License ($5.99)
              </button>
              <button onClick={() => createCheckoutSession(HOME_RUN_PRICE_ID)} disabled={loading}>
                Buy Home Run License ($9.99)
              </button>
            </div>
          )}

          {profile?.license === 'Single' && (
            <div>
              <h3>Upgrade Your License</h3>
              <button onClick={() => createCheckoutSession(UPGRADE_PRICE_ID)} disabled={loading}>
                Upgrade to Home Run ($5.00)
              </button>
              <TeamManager session={session} profile={profile} />
            </div>
          )}

          {profile?.license === 'Home Run' && (
            <div>
              <h3>You have the Home Run License!</h3>
              <p>You have unlimited access.</p>
              <TeamManager session={session} profile={profile} />
            </div>
          )}
        </div>
      )}

      <br />
      <button className="button block" onClick={() => supabase.auth.signOut()}>
        Sign Out
      </button>
    </div>
  )
}