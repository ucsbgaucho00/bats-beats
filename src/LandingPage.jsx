// src/LandingPage.jsx

import { useState } from 'react'
import { supabase } from './supabaseClient'
import { useNavigate } from 'react-router-dom'

const validatePassword = (password) => { /* ... (unchanged) ... */ };

export default function LandingPage() {
  const [loading, setLoading] = useState(false)
  const [isSigningIn, setIsSigningIn] = useState(false)
  const navigate = useNavigate()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // --- THIS IS THE CORRECTED SIGN-UP FUNCTION ---
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
      
      alert('Success! Please check your email to confirm your account. You will then be taken to the pricing page.')
      navigate('/pricing')
    } catch (error) {
      alert(error.error_description || error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSignIn = async (event) => { /* ... (unchanged) ... */ }

  return (
    // ... (The JSX for the form is the same)
  )
}