// src/PricingPage.jsx

import { useState } from 'react'
import { supabase } from './supabaseClient'
import { useNavigate } from 'react-router-dom'

// --- Get your Price IDs from your Stripe Dashboard ---
const SINGLE_PRICE_ID = 'price_1RlcrbIjwUvbU06TzNxDJYkJ'
const HOME_RUN_PRICE_ID = 'price_1RlcroIjwUvbU06TJIpGIBlT'

// Basic styling for the pricing table
const styles = {
  container: {
    textAlign: 'center',
    padding: '20px',
  },
  title: {
    marginBottom: '40px',
  },
  pricingTable: {
    display: 'flex',
    justifyContent: 'center',
    gap: '30px',
    flexWrap: 'wrap', // Allows stacking on mobile
  },
  plan: {
    border: '1px solid #ccc',
    borderRadius: '8px',
    padding: '20px',
    width: '300px',
    display: 'flex',
    flexDirection: 'column',
  },
  planTitle: {
    fontSize: '1.5em',
    fontWeight: 'bold',
  },
  planPrice: {
    fontSize: '2em',
    margin: '10px 0',
  },
  featuresList: {
    listStyle: 'none',
    padding: 0,
    textAlign: 'left',
    flexGrow: 1, // Pushes the button to the bottom
  },
  featureItem: {
    marginBottom: '10px',
  },
  button: {
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '5px',
    cursor: 'pointer',
    marginTop: '20px',
  }
};

export default function PricingPage() {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const createCheckoutSession = async (priceId) => {
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { priceId },
      })
      if (error) throw error
      // Redirect to Stripe's checkout page
      window.location.href = data.url
    } catch (error) {
      alert('Error: ' + error.message)
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Choose Your Plan</h1>
      <p>You're almost there! Select a license to unlock the app.</p>
      <div style={styles.pricingTable}>
        {/* --- SINGLE PLAN --- */}
        <div style={styles.plan}>
          <h2 style={styles.planTitle}>Single</h2>
          <p style={styles.planPrice}>$5.99 <span style={{fontSize: '0.5em'}}>/ one-time</span></p>
          <ul style={styles.featuresList}>
            <li style={styles.featureItem}>✔ Manage <strong>1</strong> Team</li>
            <li style={styles.featureItem}>✔ Unlimited Players</li>
            <li style={styles.featureItem}>✔ Public Shareable Player</li>
          </ul>
          <button 
            style={styles.button} 
            onClick={() => createCheckoutSession(SINGLE_PRICE_ID)}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Get Single'}
          </button>
        </div>

        {/* --- HOME RUN PLAN --- */}
        <div style={styles.plan}>
          <h2 style={styles.planTitle}>Home Run</h2>
          <p style={styles.planPrice}>$9.99 <span style={{fontSize: '0.5em'}}>/ one-time</span></p>
          <ul style={styles.featuresList}>
            <li style={styles.featureItem}>✔ Manage <strong>Unlimited</strong> Teams</li>
            <li style={styles.featureItem}>✔ Unlimited Players</li>
            <li style={styles.featureItem}>✔ Public Shareable Player</li>
            <li style={styles.featureItem}>✔ <strong>Warmup Playlist Access</strong></li>
          </ul>
          <button 
            style={styles.button} 
            onClick={() => createCheckoutSession(HOME_RUN_PRICE_ID)}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Get Home Run'}
          </button>
        </div>
      </div>
    </div>
  )
}