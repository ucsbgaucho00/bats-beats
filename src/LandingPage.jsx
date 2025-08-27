// src/LandingPage.jsx

import { useState } from 'react'
import { supabase } from './supabaseClient'
import { useNavigate, useLocation, Link } from 'react-router-dom' // Consolidated imports

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

  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan);
  }

  const handleContinueToPayment = async () => { /* ... (unchanged) ... */ }

  const handleSignIn = async () => { // No event parameter needed
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
    <div className="form-container">
      <img src="/bats-beats-logo-dark.svg" alt="Bats & Beats Icon" style={{ maxWidth: '80px', marginBottom: '15px', alignSelf: 'center' }} />
      
      {isSigningIn ? (
        // --- SIGN IN FORM ---
        <div>
          <h2>Sign In</h2>
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <div style={{ margin: '15px 0' }}>
            <Link to="/forgot-password">Forgot Password?</Link>
          </div>
          <div className="form-actions">
            <button onClick={handleSignIn} disabled={loading} className="btn-primary">
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
            <button onClick={() => setIsSigningIn(false)} className="btn-secondary">
              Need an account? Sign Up
            </button>
          </div>
        </div>
      ) : (
        // --- SIGN UP & PRICING FLOW ---
        <div>
          <h2>Create Your Account & Choose a Plan</h2>
          
          <input type="text" placeholder="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required autoComplete="given-name" />
          <input type="text" placeholder="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} required autoComplete="family-name" />
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" />
          <input type="password" placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required autoComplete="new-password" />
          
          {/* The coupon code input is now completely removed */}

          <div style={styles.pricingTable}>
            <div style={{...styles.plan, border: selectedPlan === 'single' ? '2px solid var(--mlb-blue)' : '1px solid var(--border-color)'}} onClick={() => handleSelectPlan('single')}>
              <h2 className="plan-title-caps">Single</h2>
              <p style={styles.planPrice}>${prices.single.toFixed(2)}</p>
              {/* ... features ... */}
            </div>
            <div style={{...styles.plan, border: selectedPlan === 'home_run' ? '2px solid var(--mlb-blue)' : '1px solid var(--border-color)'}} onClick={() => handleSelectPlan('home_run')}>
              <h2 className="plan-title-caps">Home Run</h2>
              <p style={styles.planPrice}>${prices.home_run.toFixed(2)}</p>
              {/* ... features ... */}
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