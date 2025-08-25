// src/AdminLayout.jsx

import { Link, Outlet } from 'react-router-dom'

export default function AdminLayout() {
  const navStyle = {
    display: 'flex',
    gap: '20px',
    padding: '10px',
    borderBottom: '1px solid #ccc',
    marginBottom: '20px'
  };

  return (
    <div>
      <h1>Admin Area</h1>
      <nav style={navStyle}>
        <Link to="/admin">Dashboard</Link>
        <Link to="/admin/coupons">Coupons</Link>
        {/* We will add links to Users and Orders later */}
      </nav>
      <main>
        {/* Child routes will be rendered here */}
        <Outlet />
      </main>
    </div>
  )
}