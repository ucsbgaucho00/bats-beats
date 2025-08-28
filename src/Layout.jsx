// src/Layout.jsx

import { useState } from 'react'
import { Outlet, Link, useOutletContext } from 'react-router-dom'
import PopoverMenu from './PopoverMenu'

export default function Layout() {
  const [showMenu, setShowMenu] = useState(false);
  // useOutletContext can be null if we're on a public page, so we handle that
  const context = useOutletContext();
  const session = context?.session;
  const profile = context?.profile;

  const handleMenuClick = () => {
    setShowMenu(!showMenu);
  };

  return (
    <div className="page-container">
      <header className="app-header">
        <Link to={session ? "/dashboard" : "/"} className="logo-link">
          <img src="/bats-beats-logo-wordmark-light.svg" alt="Bats & Beats Logo" />
        </Link>
        {/* Only show the menu button if the user is logged in */}
        {session && (
          <button onClick={handleMenuClick} className="hamburger-menu">
            ☰
          </button>
        )}
      </header>
      <main>
        {/* The Outlet now correctly passes the context down to Dashboard, etc. */}
        <Outlet context={{ session, profile }} />
      </main>

      {/* The PopoverMenu is rendered here, outside the main content */}
      {showMenu && <PopoverMenu profile={profile} session={session} closeMenu={() => setShowMenu(false)} />}
    </div>
  )
}