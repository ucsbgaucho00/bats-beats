// src/Dashboard.jsx

import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import TeamManager from './TeamManager'
import { useOutletContext } from 'react-router-dom'

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
        const { data, error, status } = await supabase
          .from('profiles')
          .select(`license, stripe_customer_id, spotify_access_token, role`)
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
    <div className="page-content">
      <h1>Dashboard</h1>
      {loading ? (
        <p>Loading your profile...</p>
      ) : profile ? (
        <div>
          <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '20px', margin: '20px 0' }}>
            <h3>Spotify Connection</h3>
            {profile.spotify_access_token ? (
              <>
                <p style={{ color: 'green', marginTop: 0 }}>✔ Connected to Spotify</p>
                <button onClick={handleSpotifyDisconnect} className="btn-secondary">Disconnect from Spotify</button>
              </>
            ) : (
              <>
                <p style={{ marginTop: 0 }}>Connect your Spotify Premium account to enable music playback.</p>
                <button onClick={handleSpotifyConnect} className="btn-primary">Connect to Spotify</button>
              </>
            )}
          </div>
          
          {profile.license === 'Single' && (
            <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '20px', margin: '20px 0' }}>
              <h3>Upgrade Your License</h3>
              <button onClick={() => createCheckoutSession(UPGRADE_PRICE_ID)} disabled={loading} className="btn-primary">
                Upgrade to Home Run ($5.00)
              </button>
            </div>
          )}

          <TeamManager session={session} profile={profile} />
        </div>
      ) : (
        <p>Could not load your profile. Please try signing out and signing back in.</p>
      )}
    </div>
  )
}