// src/Layout.jsx

import { Outlet, Link } from 'react-router-dom'

export default function Layout() {
  const handleMenuClick = () => {
    alert("Menu pop-over coming soon!");
  };

  return (
    <div>
      <header className="app-header">
        <Link to="/dashboard" className="logo-link">
          <img src="/bats-beats-logo-wordmark-light.svg" alt="Bats & Beats Logo" />
        </Link>
        <button onClick={handleMenuClick} className="hamburger-menu">
          ☰
        </button>
      </header>
      <main className="page-container">
        <Outlet />
      </main>
    </div>
  )
}