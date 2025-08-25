// src/AdminDashboard.jsx

import { Link } from 'react-router-dom'

export default function AdminDashboard() {
  return (
    <div>
      <h1>Admin Dashboard</h1>
      <p>This is the main admin area. More features will be added here.</p>
      <nav>
        <Link to="/dashboard">Back to Main Dashboard</Link>
      </nav>
    </div>
  )
}