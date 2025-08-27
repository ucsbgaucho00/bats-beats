// src/SetPasswordPage.jsx

import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { useNavigate } from 'react-router-dom'

export default function SetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('Please create a password for your new account.')
  const navigate = useNavigate()

  useEffect(() => {
    // This effect listens for the special SIGNED_IN event that fires
    // when a user clicks an invite or magic link.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // The user is now logged in via the invite link.
        // They are ready to set their password.
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSetPassword = async (e) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      return alert("Passwords do not match.")
    }
    // We can add the strong password validation here later if needed.

    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: password })
      if (error) throw error
      
      setMessage('Password set successfully! You will be redirected to the dashboard shortly.')
      setTimeout(() => {
        navigate('/dashboard')
      }, 3000)

    } catch (error) {
      alert(error.message)
      setLoading(false)
    }
  }

  return (
    <div>
      <h1>Welcome to Bats & Beats!</h1>
      <p>{message}</p>
      <form onSubmit={handleSetPassword}>
        <input 
          type="password" 
          placeholder="Create a strong password" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <input 
          type="password" 
          placeholder="Confirm password" 
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Saving...' : 'Set Password and Continue'}
        </button>
      </form>
    </div>
  )
}