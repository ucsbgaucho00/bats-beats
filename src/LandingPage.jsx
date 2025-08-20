// src/LandingPage.jsx

import { useState } from 'react'
import { supabase } from './supabaseClient'
import { useNavigate } from 'react-router-dom'

// --- NEW: Password validation function ---
const validatePassword = (password) => {
  // Min 12 characters
  if (password.length < 12) {
    return "Password must be at least 12 characters long.";
  }
  // Require lowercase
  if (!/[a-z]/.test(password)) {
    return "Password must contain at least one lowercase letter.";
  }
  // Require uppercase
  if (!/[A-Z]/.test(password)) {
    return "Password must contain at least one uppercase letter.";
  }
  // Require number
  if (!/[0-9]/.test(password)) {
    return "Password must contain at least one number.";
  }
  // No special characters (only letters and numbers)
  if (/[^a-zA-Z0-9]/.test(password)) {
    return "Password must not contain any special characters.";
  }
  // If all checks pass, return null (no error)
  return null;
};


export default function LandingPage() {
  const [loading, setLoading] = useState(false)
  const [isSigningIn, setIsSigningIn] = useState(false)
  const navigate = useNavigate()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSignUp = async (event) => {
    event.preventDefault()

    // --- NEW: Run validation before submitting ---
    const passwordError = validatePassword(password);
    if (passwordError) {
      alert(passwordError);
      return; // Stop the sign-up process
    }

    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          },
        },
      })
      if (error) throw error
      alert('Success! Please check your email to confirm your account. You will then be taken to the pricing page.')
      navigate('/pricing')
    } catch (error) {
      alert(error.error_description || error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSignIn = async (event) => {
    event.preventDefault()
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      })
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
      <p>The ultimate walk-up song manager for your baseball or softball team.</p>
      <hr />

      {isSigningIn ? (
        <form onSubmit={handleSignUp}>
          <h2>Create Your Account</h2>
          <input type="text" placeholder="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required autoComplete="given-name" />
          <input type="text" placeholder="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} required autoComplete="family-name" />
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          <input 
            type="password" 
            placeholder="Password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
            autoComplete="new-password" // --- THIS IS THE KEY FOR SUGGESTIONS ---
            title="Password must be at least 12 characters and include an uppercase letter, a lowercase letter, and a number. No special characters."
          />
          {/* --- NEW: Confirmation Field --- */}
          <input 
            type="password" 
            placeholder="Confirm Password" 
            value={confirmPassword} 
            onChange={(e) => setConfirmPassword(e.target.value)} 
            required 
            autoComplete="new-password"
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
          <button type="button" onClick={() => setIsSigningIn(true)} style={{ marginLeft: '10px' }}>
            Already a member? Sign In
          </button>
        </form>
      )}
    </div>
  )
}