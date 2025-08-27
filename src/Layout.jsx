// src/Layout.jsx

import { Outlet } from 'react-router-dom'

export default function Layout() {
  return (
    <div>
      <header className="app-header">
        <img src="/logo.png" alt="Bats & Beats Logo" />
      </header>
      <main className="container">
        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  )
}