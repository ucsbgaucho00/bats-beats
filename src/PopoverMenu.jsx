// src/PopoverMenu.jsx

import { Link, useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'

const UPGRADE_PRICE_ID = 'price_1RlcrbIjwUvbU06TUPGRADEPRICEID'; // Ensure this is correct

export default function PopoverMenu({ profile, session, closeMenu }) {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    closeMenu();
    navigate('/'); // Redirect to landing page on logout
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

  const menuStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 1000,
  };

  const menuContentStyle = {
    position: 'absolute',
    top: '60px',
    right: '15px',
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '20px',
    width: '280px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  };

  const renderContent = () => {
    if (!profile) return null;

    if (profile.role === 'admin') {
      return (
        <>
          <Link to="/dashboard"><button className="btn-primary">Edit Teams</button></Link>
          <Link to="/admin" style={{marginTop: '10px'}}><button className="btn-primary">Admin Dashboard</button></Link>
        </>
      );
    }

    if (profile.license === 'Home Run') {
      return (
        <>
          <Link to="/dashboard"><button className="btn-primary">Edit Teams</button></Link>
          <Link to="/profile" style={{marginTop: '10px'}}><button className="btn-secondary">Edit Profile</button></Link>
        </>
      );
    }

    if (profile.license === 'Single') {
      return (
        <div className="plan-card" style={{borderWidth: '0px', padding: 0}}>
          <h3 className="plan-title-caps" style={{textAlign: 'center'}}>Upgrade to Home Run</h3>
          <ul className="pricing-features" style={{marginTop: '15px'}}>
            <li>Manage <strong>Unlimited</strong> Teams</li>
            <li>Warmup Playlist Access</li>
          </ul>
          <button onClick={handleUpgrade} className="btn-primary" style={{marginTop: '15px'}}>Upgrade for only $5</button>
          <hr style={{margin: '20px 0'}} />
          <Link to="/profile"><button className="btn-secondary">Edit Profile</button></Link>
        </div>
      );
    }
    return null; // No menu for users without a license
  };

  return (
    <div style={menuStyle} onClick={closeMenu}>
      <div style={menuContentStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
          {renderContent()}
        </div>
        <button onClick={handleSignOut} style={{background: 'none', border: 'none', color: 'var(--text-color)', width: 'auto', marginTop: '20px', display: 'block', margin: '20px auto 0 auto'}}>
          Log Out
        </button>
      </div>
    </div>
  );
}