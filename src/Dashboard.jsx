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

        const { data, error, status } = await supabase
          .from('profiles')
          .select(`license, stripe_customer_id`)
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

  // This function calls our Edge Function to create a checkout session
  const createCheckoutSession = async (priceId) => {
    try {
      setLoading(true)
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { priceId },
      })

      if (error) throw error
      
      // Redirect the user to the Stripe-hosted checkout page
      window.location.href = data.url

    } catch (error) {
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="form-widget">
      <h1>Welcome to Your Dashboard</h1>
      <p>Your User ID: {session.user.id}</p>
      
      {loading ? (
        <p>Loading your profile...</p>
      ) : (
        <div>
          <h2>Your License: {profile?.license || 'None'}</h2>
          
          {!profile?.license && (
            <div>
              <h3>Purchase a License</h3>
              <button onClick={() => createCheckoutSession(SINGLE_PRICE_ID)} disabled={loading}>
                {loading ? 'Loading...' : 'Buy Single License ($5.99)'}
              </button>
              <button onClick={() => createCheckoutSession(HOME_RUN_PRICE_ID)} disabled={loading}>
                {loading ? 'Loading...' : 'Buy Home Run License ($9.99)'}
              </button>
            </div>
          )}

          {profile?.license === 'Single' && (
            <div>
              <h3>Upgrade Your License</h3>
              <p>You currently have the Single license.</p>
              <button onClick={() => createCheckoutSession(UPGRADE_PRICE_ID)} disabled={loading}>
                {loading ? 'Loading...' : 'Upgrade to Home Run ($5.00)'}
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
      <button
        className="button block"
        onClick={() => supabase.auth.signOut()}
      >
        Sign Out
      </button>
    </div>
  )
}