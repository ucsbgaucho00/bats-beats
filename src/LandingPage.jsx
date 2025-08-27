// src/LandingPage.jsx

import { useState } from 'react'
import { supabase } from './supabaseClient'
import { useNavigate, useLocation, Link } from 'react-router-dom'

const validatePassword = (password) => { /* ... (unchanged) ... */ };
const styles = { /* ... (pricing table styles are unchanged) ... */ };

export default function LandingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(location.state?.showSignIn || false);

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [selectedPlan, setSelectedPlan] = useState(null)
  
  const prices = { single: 5.99, home_run: 9.99 };
  const totalPrice = selectedPlan ? prices[selectedPlan] : 0;

  const handleSelectPlan = (plan) => { setSelectedPlan(plan); }
  const handleContinueToPayment = async () => { /* ... (unchanged) ... */ }
  
  const handleSignIn = async () => {
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
    <div className="auth-container">
      <img src="/bats-beats-logo-dark.svg" alt="Bats & Beats Icon" style={{ maxWidth: '80px', marginBottom: '20px' }} />
      
      {isSigningIn ? (
        <div className="form-container">
          <h2>Sign In</h2>
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          
          <div className="form-actions">
            <button onClick={handleSignIn} disabled={loading} className="btn-primary">
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
            <button onClick={() => setIsSigningIn(false)} className="btn-secondary">
              Need an account? Sign Up
            </button>
            <Link to="/forgot-password" className="forgot-password-link">Forgot Password?</Link>
          </div>
        </div>
      ) : (
        <div className="form-container">
          <h2>Create Your Account</h2>
          <input type="text" placeholder="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
          <input type="text" placeholder="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <input type="password" placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
          
          <div style={styles.pricingTable}>
            <div style={{...styles.plan, border: selectedPlan === 'single' ? '2px solid var(--mlb-blue)' : '1px solid var(--border-color)'}} onClick={() => handleSelectPlan('single')}>
              <h3 className="plan-title-caps">Single</h3>
              <p style={styles.planPrice}>${prices.single.toFixed(2)}</p>
              <ul style={styles.featuresList}>
                <li style={styles.featureItem}>✔ Manage <strong>1</strong> Team</li>
                <li style={styles.featureItem}>✔ Unlimited Players</li>
                <li style={styles.featureItem}>✔ Public Shareable Player</li>
              </ul>
            </div>
            <div style={{...styles.plan, border: selectedPlan === 'home_run' ? '2px solid var(--mlb-blue)' : '1px solid var(--border-color)'}} onClick={() => handleSelectPlan('home_run')}>
              <h3 className="plan-title-caps">Home Run</h3>
              <p style={styles.planPrice}>${prices.home_run.toFixed(2)}</p>
              <ul style={styles.featuresList}>
                <li style={styles.featureItem}>✔ Manage <strong>Unlimited</strong> Teams</li>
                <li style={styles.featureItem}>✔ Warmup Playlist Access</li>
                <li style={styles.featureItem}>✔ Public Shareable Player</li>
              </ul>
            </div>
          </div>

          <div className="form-actions">
            <button onClick={handleContinueToPayment} disabled={loading || !selectedPlan} className="btn-primary" style={{ padding: '15px', fontSize: '1.2em' }}>
              {loading ? 'Processing...' : `Continue to Payment ($${totalPrice.toFixed(2)})`}
            </button>
            <button onClick={() => setIsSigningIn(true)} className="btn-secondary">
              Already a member? Sign In
            </button>
          </div>
        </div>
      )}
    </div>
  )
}