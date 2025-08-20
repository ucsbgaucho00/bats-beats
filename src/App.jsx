// src/App.jsx

import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import LandingPage from './LandingPage' // We will create this next
import PricingPage from './PricingPage' // We will create this next
import Dashboard from './Dashboard'
import PlayerManager from './PlayerManager'
import WarmupPlayer from './WarmupPlayer'
import PublicPlayer from './PublicPlayer'

// --- NEW: A component to protect our private routes ---
const ProtectedRoutes = () => {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      if (session) {
        // If there's a session, check if they have a license
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('license')
          .eq('id', session.user.id)
          .single()
        setProfile(userProfile)
      }
      setLoading(false)
    }
    checkUser()
  }, [])

  if (loading) {
    return <div>Loading session...</div>
  }

  if (!session) {
    // If no session, redirect to the landing page
    return <Navigate to="/" replace />
  }

  if (!profile?.license) {
    // If session exists but NO license, redirect to the pricing page
    return <Navigate to="/pricing" replace />
  }

  // If session and license exist, show the main app content
  return <Outlet />
};


function App() {
  return (
    <div className="container" style={{ padding: '50px 0 100px 0' }}>
      <Routes>
        {/* --- Public Routes --- */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/public/:shareId" element={<PublicPlayer />} />

        {/* --- Protected App Routes --- */}
        <Route element={<ProtectedRoutes />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/team/:teamId" element={<PlayerManager />} />
          <Route path="/team/:teamId/warmup" element={<WarmupPlayer />} />
        </Route>
      </Routes>
    </div>
  )
}

export default App