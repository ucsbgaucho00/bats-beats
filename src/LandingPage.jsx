// src/LandingPage.jsx

import { useState } from 'react'
import { supabase } from './supabaseClient'
import { useNavigate, useLocation, Link } from 'react-router-dom'

const validatePassword = (password) => {
  if (password.length < 12) return "Password must be at least 12 characters long.";
  if (!/[a-z]/.test(password)) return "Password must contain at least one lowercase letter.";
  if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter.";
  if (!/[0-9]/.test(password)) return "Password must contain at least one number.";
  if (/[^a-zA-Z0-9]/.test(password)) return "Password must not contain any special characters.";
  return null;
};

// Pricing table styles are kept here as they are specific to this component
const styles = {
  pricingTable: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    margin: '30px 0',
  },
  plan: {
    border: '2px solid var(--border-color)',
    borderRadius: '8px',
    padding: '30px',
    cursor: 'pointer',
    transition: 'all 0.2s ease-in-out',
    flex: '1',
  },
  planPrice: {
    fontSize: '2.2em',
    margin: '10px 0',
    fontWeight: 'bold',
  }
};

// Media query style for desktop pricing table
if (window.innerWidth >= 768) {
  styles.pricingTable.flexDirection = 'row';
}


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

  const handleContinueToPayment = async () => {
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      return alert('Please fill out all required fields.');
    }
    if (!selectedPlan) {
      return alert('Please select a license plan.');
    }
    if (password !== confirmPassword) {
      return alert("Passwords do not match.");
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      return alert(passwordError);
    }

    setLoading(true);
    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { first_name: firstName, last_name: lastName } }
      });
      if (signUpError) throw signUpError;
      if (!signUpData.user) throw new Error("Sign-up did not return a user.");

      await supabase.auth.signInWithPassword({ email, password });
      
      const priceId = selectedPlan === 'single' ? 'price_1RlcrbIjwUvbU06TzNxDJYkJ' : 'price_1RlcroIjwUvbU06TJIpGIBlT';
      const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke('create-checkout-session', {
        body: { priceId, couponCode: null }
      });
      if (checkoutError) throw checkoutError;
      
      window.location.href = checkoutData.url;

    } catch (error) {
      alert(error.error_description || error.message);
      setLoading(false);
    }
  }
  
  const handleSignIn = async () => {
    if (!email || !password) {
      return alert('Please enter your email and password.');
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate('/dashboard');
    } catch (error) {
      alert(error.error_description || error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-header">
        <img src="/bats-beats-logo-dark.svg" alt="Bats & Beats Icon" />
      </div>
      
      {isSigningIn ? (
        <div className="form-container">
          <h2>Sign In</h2>
          <div className="input-group">
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
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
          <div className="input-group">
            <input type="text" placeholder="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
            <input type="text" placeholder="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <input type="password" placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
          </div>
          
          <div className="pricing-table">
            <div className={`plan-card ${selectedPlan === 'single' ? 'selected' : ''}`} onClick={() => handleSelectPlan('single')}>
              <h3 className="plan-title-caps">Single</h3>
              <p className="plan-price">${prices.single.toFixed(2)}</p>
              <ul className="pricing-features">
                <li>Manage <strong>1</strong> Team</li>
                <li>Unlimited Players</li>
                <li>Public Shareable Player</li>
              </ul>
            </div>
            <div className={`plan-card ${selectedPlan === 'home_run' ? 'selected' : ''}`} onClick={() => handleSelectPlan('home_run')}>
              <h3 className="plan-title-caps">Home Run</h3>
              <p className="plan-price">${prices.home_run.toFixed(2)}</p>
              <ul className="pricing-features">
                <li>Manage <strong>Unlimited</strong> Teams</li>
                <li>Warmup Playlist Access</li>
                <li>Public Shareable Player</li>
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