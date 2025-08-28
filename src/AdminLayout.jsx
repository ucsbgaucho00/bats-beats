// src/AdminLayout.jsx

import { NavLink, Outlet } from 'react-router-dom'

export default function AdminLayout() {
  return (
    // --- THIS IS THE CRITICAL FIX ---
    // Wrap the entire component in the 'page-content' class
    <div className="page-content">
      <h1>Bats and Beats Admin Dashboard</h1>
      <nav className="admin-tabs">
        <NavLink to="/admin" end>Return to Dashboard</NavLink>
        <NavLink to="/admin/users">User Administration</NavLink>
      </nav>
      <main>
        <Outlet />
      </main>
    </div>
  )
}