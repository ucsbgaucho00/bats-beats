// src/Layout.jsx

import { Outlet } from 'react-router-dom'

export default function Layout() {
  return (
    <div>
      <header className="app-header">
  {/* Use the light wordmark logo for the dark header */}
  <img src="/bats-beats-logo-wordmark-light.svg" alt="Bats & Beats Logo" />
</header>
      <main className="container">
        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  )
}