// src/LandingPage.jsx

import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { useNavigate } from 'react-router-dom'

const validatePassword = (password) => {
  if (password.length < 12) return "Password must be at least 12 characters long.";
  if (!/[a-z]/.test(password)) return "Password must contain at least one lowercase letter.";
  if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter.";
  if (!/[0-9]/.test(password)) return "Password must contain at least one number.";
  if (/[^a-zA-Z0-9]/.test(password)) return "Password must not contain any special characters.";
  return null;
};

const styles = {
  pricingTable: {
    display: 'flex',
    justifyContent: 'center',
    gap: '20px',
    margin: '20px 0',
    flexWrap: 'wrap',
  },
  plan: {
    border: '1px solid #ccc',
    borderRadius: '8px',
    padding: '15px',
    width: '250px',
    display: 'flex',
    flexDirection: 'column',
    cursor: 'pointer',
    transition: 'border 0.2s ease-in-out',
  },
  planTitle: {
    fontSize: '1.5em',
    fontWeight: 'bold',
    marginTop: 0,
  },
  planPrice: {
    fontSize: '2em',
    margin: '10px 0',
  },
  featuresList: {
    listStyle: 'none',
    padding: 0,
    textAlign: 'left',
    flexGrow: 1,
  },
  featureItem: {
    marginBottom: '10px',
  },
};

export default function LandingPage() {
  const [loading, setLoading] = useState(false)
  const [isSigningIn, setIsSigningIn] = useState(false)
  const navigate = useNavigate()

  // Form state
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  
  // Plan and pricing state
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [couponCode, setCouponCode] = useState('')
  const [appliedDiscount, setAppliedDiscount] = useState(null)
  const [prices, setPrices] = useState({ single: 5.99, home_run: 9.99 })

  const totalPrice = selectedPlan ? prices[selectedPlan] : 0;

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    try {
      setLoading(true);
      const { data: discount, error } = await supabase.functions.invoke('check-coupon', {
  body: { code: couponCode }
});
      if (error) throw error;
      
      setAppliedDiscount(discount);
      alert(`Success! Coupon "${couponCode}" applied.`);
    } catch (error) {
      setAppliedDiscount(null);
      alert(error.message || 'Invalid coupon code.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const originalPrices = { single: 5.99, home_run: 9.99 };
    if (appliedDiscount) {
      const newPrices = { ...originalPrices };
      if (appliedDiscount.discount_type === 'percent') {
        newPrices.single = originalPrices.single * (1 - appliedDiscount.discount_value / 100);
        newPrices.home_run = originalPrices.home_run * (1 - appliedDiscount.discount_value / 100);
      } else if (appliedDiscount.discount_type === 'fixed_amount') {
        newPrices.single = Math.max(0, originalPrices.single - appliedDiscount.discount_value / 100);
        newPrices.home_run = Math.max(0, originalPrices.home_run - appliedDiscount.discount_value / 100);
      }
      setPrices(newPrices);
    } else {
      setPrices(originalPrices);
    }
  }, [appliedDiscount]);

  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan);
  }

  const handleContinueToPayment = async () => {
    if (!selectedPlan) return alert('Please select a license plan.');
    if (password !== confirmPassword) return alert("Passwords do not match.");
    const passwordError = validatePassword(password);
    if (passwordError) return alert(passwordError);

    setLoading(true);
    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email, password, options: { data: { first_name: firstName, last_name: lastName } }
      });
      if (signUpError) throw signUpError;
      if (!signUpData.user) throw new Error("Sign-up did not return a user.");

      await supabase.auth.signInWithPassword({ email, password });
      
      const priceId = selectedPlan === 'single' ? 'price_1RlcrbIjwUvbU06TzNxDJYkJ' : 'price_1RlcroIjwUvbU06TJIpGIBlT';
      const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke('create-checkout-session', {
        body: { priceId, couponCode: appliedDiscount ? couponCode : null } // Only send the code if it's been successfully applied
      });
      if (checkoutError) throw checkoutError;
      
      window.location.href = checkoutData.url;

    } catch (error) {
      alert(error.error_description || error.message);
      setLoading(false);
    }
  }

  const handleSignIn = async (event) => {
    event.preventDefault()
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      navigate('/dashboard')
    } catch (error) {
      alert(error.error_description || error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1>Welcome to Bats & Beats</h1>
      <p>The ultimate walk-up song manager for your team.</p>
      <hr />

      {isSigningIn ? (
        <form onSubmit={handleSignIn}>
          <h2>Sign In</h2>
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
          <button type="submit" disabled={loading}>{loading ? 'Signing In...' : 'Sign In'}</button>
          <button type="button" onClick={() => setIsSigningIn(false)} style={{ marginLeft: '10px' }}>Need an account? Sign Up</button>
        </form>
      ) : (
        <form onSubmit={(e) => e.preventDefault()} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h2>Create Your Account & Choose a Plan</h2>
          
          <input type="text" placeholder="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required autoComplete="given-name" />
          <input type="text" placeholder="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} required autoComplete="family-name" />
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" />
          <input type="password" placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required autoComplete="new-password" />
          
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input type="text" placeholder="Got a coupon code?" value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} style={{ flexGrow: 1 }} />
            <button type="button" onClick={handleApplyCoupon} disabled={loading} style={{ flexShrink: 0 }}>Apply</button>
          </div>

          <div style={styles.pricingTable}>
            <div style={{...styles.plan, border: selectedPlan === 'single' ? '2px solid #007bff' : '1px solid #ccc'}} onClick={() => handleSelectPlan('single')}>
              <h2 style={styles.planTitle}>Single</h2>
              <p style={styles.planPrice}>${prices.single.toFixed(2)}</p>
              <ul style={styles.featuresList}>
                <li style={styles.featureItem}>✔ Manage <strong>1</strong> Team</li>
                <li style={styles.featureItem}>✔ Unlimited Players</li>
                <li style={styles.featureItem}>✔ Public Shareable Player</li>
              </ul>
            </div>
            <div style={{...styles.plan, border: selectedPlan === 'home_run' ? '2px solid #007bff' : '1px solid #ccc'}} onClick={() => handleSelectPlan('home_run')}>
              <h2 style={styles.planTitle}>Home Run</h2>
              <p style={styles.planPrice}>${prices.home_run.toFixed(2)}</p>
              <ul style={styles.featuresList}>
                <li style={styles.featureItem}>✔ Manage <strong>Unlimited</strong> Teams</li>
                <li style={styles.featureItem}>✔ Warmup Playlist Access</li>
                <li style={styles.featureItem}>✔ Public Shareable Player</li>
              </ul>
            </div>
          </div>

          <button onClick={handleContinueToPayment} disabled={loading || !selectedPlan} style={{ padding: '15px', fontSize: '1.2em' }}>
            {loading ? 'Processing...' : `Continue to Payment ($${totalPrice.toFixed(2)})`}
          </button>
          <button type="button" onClick={() => setIsSigningIn(true)} style={{ marginTop: '20px' }}>Already a member? Sign In</button>
        </form>
      )}
    </div>
  )
}