// src/LandingPage.jsx

import { useState } from 'react'
import { supabase } from './supabaseClient'
import { useNavigate } from 'react-router-dom'

export default function LandingPage() {
  const [loading, setLoading] = useState(false)
  const [isSigningIn, setIsSigningIn] = useState(false) // To toggle between Sign Up and Sign In
  const navigate = useNavigate()

  // State for form fields
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSignUp = async (event) => {
    event.preventDefault()
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
      // After successful sign-up, Supabase sends a confirmation email.
      // We then redirect them to the pricing page.
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
      // On successful sign-in, the ProtectedRoutes component in App.jsx
      // will automatically handle redirecting them to the dashboard or pricing page.
      navigate('/dashboard') // Navigate to a protected route to trigger the check
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
        // --- SIGN IN FORM ---
        <form onSubmit={handleSignIn}>
          <h2>Sign In</h2>
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button type="submit" disabled={loading}>
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
          <button type="button" onClick={() => setIsSigningIn(false)} style={{ marginLeft: '10px' }}>
            Need an account? Sign Up
          </button>
        </form>
      ) : (
        // --- SIGN UP FORM ---
        <form onSubmit={handleSignUp}>
          <h2>Create Your Account</h2>
          <input type="text" placeholder="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
          <input type="text" placeholder="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input type="password" placeholder="Password (min. 6 characters)" value={password} onChange={(e) => setPassword(e.target.value)} required />
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