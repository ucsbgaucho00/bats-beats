// src/App.jsx

import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { Routes, Route } from 'react-router-dom' // Import routing components
import Auth from './Auth'
import Dashboard from './Dashboard'
import PlayerManager from './PlayerManager' // Import the new component
import PublicPlayer from './PublicPlayer'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      setLoading(false)
    }

    getSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return <div>Loading...</div> // Prevents flicker while session is loading
  }

  return (
  <div className="container" style={{ padding: '50px 0 100px 0' }}>
    <Routes>
      {/* Publicly accessible route */}
      <Route path="/public/:shareId" element={<PublicPlayer />} />

      {/* Routes that require authentication */}
      <Route path="/*" element={!session ? <Auth /> : (
        <Routes>
          <Route path="/dashboard" element={<Dashboard key={session.user.id} session={session} />} />
          <Route path="/team/:teamId" element={<PlayerManager />} />
          {/* Default authenticated route */}
          <Route path="*" element={<Dashboard key={session.user.id} session={session} />} />
        </Routes>
      )} />
    </Routes>
  </div>
)
}

export default App