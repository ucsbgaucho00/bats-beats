// src/ForgotPasswordPage.jsx

import { useState } from 'react'
import { supabase } from './supabaseClient'
import { Link } from 'react-router-dom'

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

  const handlePasswordReset = async (event) => {
    event.preventDefault()
    setLoading(true)
    setMessage('') // Clear previous messages
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        // This tells Supabase where to send the user after they click the link in the email
        redirectTo: 'https://play.batsandbeats.com/set-password',
      })
      if (error) throw error
      
      setMessage('If an account with this email exists, a password reset link has been sent. Please check your inbox (and spam folder).')
    } catch (error) {
      setMessage(error.error_description || error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1>Forgot Your Password?</h1>
      <p>Enter your email address below, and we'll send you a link to reset your password.</p>
      
      <form onSubmit={handlePasswordReset}>
        <input 
          type="email" 
          placeholder="Your email address" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required 
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>
      </form>

      {message && <p style={{ marginTop: '20px' }}>{message}</p>}

      <div style={{ marginTop: '30px' }}>
        <Link to="/" state={{ showSignIn: true }}>Back to Sign In</Link>
      </div>
    </div>
  )
}