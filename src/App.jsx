// src/App.jsx

import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'
import LandingPage from './LandingPage'
import Dashboard from './Dashboard'
import PlayerManager from './PlayerManager'
import WarmupPlayer from './WarmupPlayer'
import PublicPlayer from './PublicPlayer'
import PublicWarmupPlayer from './PublicWarmupPlayer'
import AdminRoutes from './AdminRoutes'
import AdminDashboard from './AdminDashboard'
import AdminLayout from './AdminLayout'
import CouponManager from './CouponManager'
import UserManager from './UserManager'
import SetPasswordPage from './SetPasswordPage'


const ProtectedRoutes = () => {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const location = useLocation();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      if (session) {
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return <div>Loading session...</div>
  if (!session) return <Navigate to="/" state={{ from: location }} replace />
  if (!profile?.license) return <Navigate to="/" state={{ from: location }} replace />
  
  return <Outlet context={{ session }} />
};

// --- THIS IS THE CORRECTED APP COMPONENT ---
function App() {
  return (
    <div className="container" style={{ padding: '50px 0 100px 0' }}>
      <Routes>
        {/* --- Public Routes --- */}
        <Route path="/" element={<LandingPage />} />
<Route path="/set-password" element={<SetPasswordPage />} />
        <Route path="/public/:shareId" element={<PublicPlayer />} />
        <Route path="/public/:shareId/warmup" element={<PublicWarmupPlayer />} />

        {/* --- Authenticated-only Routes --- */}
                <Route element={<ProtectedRoutes />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/team/:teamId" element={<PlayerManager />} />
          <Route path="/team/:teamId/warmup" element={<WarmupPlayer />} />
        </Route>

        {/* --- THIS IS THE FINAL, CORRECTED ADMIN ROUTE STRUCTURE --- */}
        <Route path="/admin" element={<AdminRoutes />}>
          <Route element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
<Route path="users" element={<UserManager />} />

            <Route path="coupons" element={<CouponManager />} />
          </Route>
        </Route>
      </Routes>
    </div>
  )
}

export default App