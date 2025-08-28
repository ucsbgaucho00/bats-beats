// src/PopoverMenu.jsx

import { useNavigate } from 'react-router-dom' // We use useNavigate instead of Link
import { supabase } from './supabaseClient'

const UPGRADE_PRICE_ID = 'price_1RlcrbIjwUvbU06TUPGRADEPRICEID'; // Ensure this is correct

export default function PopoverMenu({ profile, session, closeMenu }) {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    closeMenu();
    navigate('/');
  };

  const handleUpgrade = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { priceId: UPGRADE_PRICE_ID }
      });
      if (error) throw error;
      window.location.href = data.url;
    } catch (error) {
      alert('Error creating checkout session: ' + error.message);
    }
  };

  // --- THIS IS THE CRITICAL FIX ---
  // A helper function to close the menu first, then navigate
  const handleNav = (path) => {
    closeMenu();
    navigate(path);
  };

  const renderContent = () => {
    if (!profile) return null;

    if (profile.role === 'admin') {
      return (
        <>
          <button onClick={() => handleNav('/dashboard')} className="btn-primary">Manage Teams</button>
          <button onClick={() => handleNav('/admin')} className="btn-primary">Admin Dashboard</button>
        </>
      );
    }

    if (profile.license === 'Home Run') {
      return (
        <>
          <button onClick={() => handleNav('/dashboard')} className="btn-primary">Manage Teams</button>
          {/* We will add an Edit Profile page later */}
          {/* <button onClick={() => handleNav('/profile')} className="btn-secondary">Edit Profile</button> */}
        </>
      );
    }

    if (profile.license === 'Single') {
      return (
        <div className="plan-card" style={{border: 'none', padding: 0, boxShadow: 'none'}}>
          <h3 className="plan-title-caps" style={{textAlign: 'center'}}>Upgrade to Home Run</h3>
          <ul className="pricing-features" style={{marginTop: '15px'}}>
            <li>Manage <strong>Unlimited</strong> Teams</li>
            <li>Warmup Playlist Access</li>
          </ul>
          <button onClick={handleUpgrade} className="btn-primary" style={{marginTop: '15px'}}>Upgrade for only $5</button>
          <hr style={{margin: '20px 0', border: 'none', borderTop: '1px solid var(--border-color)'}} />
          {/* <button onClick={() => handleNav('/profile')} className="btn-secondary">Edit Profile</button> */}
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000 }} onClick={closeMenu}>
      <div style={{ position: 'absolute', top: '60px', right: '15px', backgroundColor: 'white', borderRadius: '8px', padding: '20px', width: '280px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }} onClick={(e) => e.stopPropagation()}>
        <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
          {renderContent()}
        </div>
        <button onClick={handleSignOut} style={{background: 'none', border: 'none', color: 'var(--text-color)', width: 'auto', marginTop: '20px', display: 'block', margin: '20px auto 0 auto', padding: 0, fontWeight: 'normal' }}>
          Log Out
        </button>
      </div>
    </div>
  );
}