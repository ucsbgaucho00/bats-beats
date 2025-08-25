// src/AdminRoutes.jsx

import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { Navigate, Outlet } from 'react-router-dom'

export default function AdminRoutes() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAdminStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        if (profile?.role === 'admin') {
          setIsAdmin(true)
        }
      }
      setLoading(false)
    }
    checkAdminStatus()
  }, [])

  if (loading) {
    return <div>Checking admin privileges...</div>
  }

  // If the user is an admin, show the nested admin pages.
  // Otherwise, redirect them to their regular dashboard.
  return isAdmin ? <Outlet /> : <Navigate to="/dashboard" />
}