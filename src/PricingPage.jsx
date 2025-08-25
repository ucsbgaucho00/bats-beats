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
  // --- NEW: State for the coupon code ---
  const [couponCode, setCouponCode] = useState('')

  const createCheckoutSession = async (priceId) => {
    setLoading(true)
    try {
      // --- NEW: Pass the coupon code to the function ---
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { 
          priceId,
          couponCode: couponCode || null, // Pass the code, or null if empty
        },
      })
      if (error) throw error
      window.location.href = data.url
    } catch (error) {
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Choose Your Plan</h1>
      <p>You're almost there! Select a license to unlock the app.</p>

      {/* --- NEW: Coupon Code Input --- */}
      <div style={{ margin: '20px 0' }}>
        <input 
          type="text" 
          placeholder="Promo Code"
          value={couponCode}
          onChange={(e) => setCouponCode(e.target.value.toUpperCase())} // Standard practice to uppercase codes
        />
        {/* The "Apply" is implicit; the code is sent when they click a plan */}
      </div>

      <div style={styles.pricingTable}>
        {/* --- SINGLE PLAN --- */}
        <div style={styles.plan}>
          <h2 style={styles.planTitle}>Single</h2>
          {/* ... (rest of the plan is unchanged) ... */}
          <button style={styles.button} onClick={() => createCheckoutSession(SINGLE_PRICE_ID)} disabled={loading}>
            {loading ? 'Loading...' : 'Get Single'}
          </button>
        </div>

        {/* --- HOME RUN PLAN --- */}
        <div style={styles.plan}>
          <h2 style={styles.planTitle}>Home Run</h2>
          {/* ... (rest of the plan is unchanged) ... */}
          <button style={styles.button} onClick={() => createCheckoutSession(HOME_RUN_PRICE_ID)} disabled={loading}>
            {loading ? 'Loading...' : 'Get Home Run'}
          </button>
        </div>
      </div>
    </div>
  )
}