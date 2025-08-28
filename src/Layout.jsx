// src/Layout.jsx

import { useState, useEffect } from 'react'
import { Outlet, Link } from 'react-router-dom'
import { supabase } from './supabaseClient' // Import supabase
import PopoverMenu from './PopoverMenu'

export default function Layout() {
  const [showMenu, setShowMenu] = useState(false);
  
  // --- THIS IS THE CRITICAL FIX ---
  // The layout now manages its own session and profile state
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const getSessionAndProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (session) {
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('*') // Fetch the full profile for the menu
          .eq('id', session.user.id)
          .single();
        setProfile(userProfile);
      }
    };
    getSessionAndProfile();

    // Also listen for changes to update in real-time (e.g., after logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        setProfile(null); // Clear profile on logout
      } else {
        getSessionAndProfile(); // Re-fetch profile on login
      }
    });

    return () => subscription.unsubscribe();
  }, []);
  // --- END OF FIX ---

  const handleMenuClick = () => {
    setShowMenu(!showMenu);
  };

  return (
    <div className="page-container">
      <header className="app-header">
        <Link to={session ? "/dashboard" : "/"} className="logo-link">
          <img src="/bats-beats-logo-wordmark-light.svg" alt="Bats & Beats Logo" />
        </Link>
        {session && (
          <button onClick={handleMenuClick} className="hamburger-menu">
            ☰
          </button>
        )}
      </header>
      <main>
        {/* We still use Outlet, but now the Layout is independent */}
        <Outlet context={{ session, profile }} />
      </main>

      {showMenu && <PopoverMenu profile={profile} session={session} closeMenu={() => setShowMenu(false)} />}
    </div>
  )
}