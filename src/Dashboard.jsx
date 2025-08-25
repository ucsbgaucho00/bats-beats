// src/Dashboard.jsx

import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import TeamManager from './TeamManager'
import { useOutletContext, Link } from 'react-router-dom' // Added Link

// Your Stripe Price IDs
const SINGLE_PRICE_ID = 'price_1RlcrbIjwUvbU06TzNxDJYkJ'
const HOME_RUN_PRICE_ID = 'price_1RlcroIjwUvbU06TJIpGIBlT'
const UPGRADE_PRICE_ID = 'price_1RlcrbIjwUvbU06TUPGRADEPRICEID'

export default function Dashboard() {
  const { session } = useOutletContext()

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const stripeStatus = urlParams.get('status');

    const getProfile = async () => {
      try {
        setLoading(true)
        const { user } = session
        // --- UPDATED: Also fetch the user's role ---
        const { data, error, status } = await supabase
          .from('profiles')
          .select(`license, stripe_customer_id, spotify_access_token, role`) // Added role
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

    if (stripeStatus === 'success') {
      setTimeout(() => {
        getProfile();
        window.history.replaceState({}, document.title, "/dashboard");
      }, 2000);
    } else {
      getProfile();
    }
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

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div className="form-widget">
      {/* --- NEW: Admin Link --- */}
      {profile?.role === 'admin' && (
        <div style={{ border: '2px solid gold', padding: '10px', marginBottom: '20px', textAlign: 'center' }}>
          <Link to="/admin">Go to Admin Dashboard</Link>
        </div>
      )}

      <h1>Welcome to Your Dashboard</h1>
      
      {loading ? (
        <p>Loading your profile...</p>
      ) : profile ? (
        <div>
          <h2>Your License: {profile.license}</h2>

          <div style={{ border: '1px solid #ccc', padding: '10px', margin: '20px 0' }}>
            <h3>Spotify Connection</h3>
            {profile.spotify_access_token ? (
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
          
          {profile.license === 'Single' && (
            <div>
              <h3>Upgrade Your License</h3>
              <button onClick={() => createCheckoutSession(UPGRADE_PRICE_ID)} disabled={loading}>
                Upgrade to Home Run ($5.00)
              </button>
              <TeamManager session={session} profile={profile} />
            </div>
          )}

          {profile.license === 'Home Run' && (
            <div>
              <h3>You have the Home Run License!</h3>
              <p>You have unlimited access.</p>
              <TeamManager session={session} profile={profile} />
            </div>
          )}
        </div>
      ) : (
        <p>Could not load your profile. Please try signing out and signing back in.</p>
      )}

      <br />
      <button className="button block" onClick={handleSignOut}>
        Sign Out
      </button>
    </div>
  )
}