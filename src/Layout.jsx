// src/Layout.jsx

import { Outlet, Link } from 'react-router-dom'

export default function Layout() {
  const handleMenuClick = () => {
    alert("Menu pop-over coming soon!");
  };

  return (
    <div className="page-container">
      <header className="app-header">
        <Link to="/" className="logo-link">
          <img src="/bats-beats-logo-wordmark-light.svg" alt="Bats & Beats Logo" />
        </Link>
        <button onClick={handleMenuClick} className="hamburger-menu">
          ☰
        </button>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  )
}