// src/LandingPage.jsx

import { useState } from 'react'
import { supabase } from './supabaseClient'
import { useNavigate } from 'react-router-dom'

const validatePassword = (password) => { /* ... (unchanged) ... */ };

export default function LandingPage() {
  // ... (state variables are the same)
  const [loading, setLoading] = useState(false)
  const [isSigningIn, setIsSigningIn] = useState(false)
  const navigate = useNavigate()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // --- THIS IS THE NEW, 3-STEP SIGN-UP FUNCTION ---
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
      // Step 1: Sign up the user (no metadata)
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email,
        password: password,
      })
      if (signUpError) throw signUpError
      if (!data.user) throw new Error("Sign-up successful, but no user data returned.")

      // Step 2: MANUALLY create the profile row.
      // We must do this because we deleted the trigger.
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({ id: data.user.id, first_name: firstName, last_name: lastName })
      
      if (insertError) throw insertError

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