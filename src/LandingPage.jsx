// Re-deploying to apply new Vercel environment variables

// src/LandingPage.jsx

import { useState } from 'react'
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

export default function LandingPage() {
  const [loading, setLoading] = useState(false)
  const [isSigningIn, setIsSigningIn] = useState(false)
  const navigate = useNavigate()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const handleSignUp = async (event) => {
    event.preventDefault()
    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      alert(passwordError);
      return;
    }
    setLoading(true)
    try {
      // Pass the user's name in the options.data field
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
      
      alert('Success! You will now be taken to the pricing page.')
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
        <form onSubmit={handleSignIn}>
          <h2>Sign In</h2>
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
          <button type="submit" disabled={loading}>
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
          <button type="button" onClick={() => setIsSigningIn(false)} style={{ marginLeft: '10px' }}>
            Need an account? Sign Up
          </button>
        </form>
      ) : (
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
            autoComplete="new-password"
            title="Password must be at least 12 characters and include an uppercase letter, a lowercase letter, and a number. No special characters."
          />
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