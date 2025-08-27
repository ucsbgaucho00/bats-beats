// src/TeamManager.jsx

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from './supabaseClient'
import QRCode from 'qrcode.react' // --- NEW: Import QR Code library ---

export default function TeamManager({ session, profile }) {
  // ... (all existing state is the same)
  const [showQrModal, setShowQrModal] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState('')

  // ... (all existing useEffect and handler functions are the same)

  // --- NEW: Handlers for Copy and QR Code ---
  const handleCopyUrl = (url) => {
    navigator.clipboard.writeText(url).then(() => {
      alert('Share link copied to clipboard!');
      // We can send a tracking event here later
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  };

  const handleShowQrCode = (url) => {
    setQrCodeUrl(url);
    setShowQrModal(true);
    // We can send a tracking event here later
  };

  return (
    <div>
      {/* --- NEW: QR Code Modal --- */}
      {showQrModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
          <QRCode value={qrCodeUrl} size={256} />
          <p style={{color: 'white', marginTop: '20px'}}>{qrCodeUrl}</p>
          <button onClick={() => setShowQrModal(false)} style={{marginTop: '20px'}}>Close</button>
        </div>
      )}

      <hr />
      <h2>Manage Your Teams</h2>
      {/* ... (rest of the component is the same, we just update the share link section) ... */}
      <ul>
        {teams.map(team => (
          <li key={team.id} style={{ /* ... */ }}>
            {editingTeamId === team.id ? (
              // ... (editing view is unchanged)
            ) : (
              <div>
                {/* ... (team name, edit/delete, playlist selector are unchanged) ... */}
                
                <div style={{ fontSize: '0.8em', marginTop: '8px' }}>
                  <strong>Share Link:</strong>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input 
                      type="text" 
                      readOnly 
                      value={`${window.location.origin}/public/${team.public_share_id}`}
                      style={{ flexGrow: 1 }}
                    />
                    <button onClick={() => handleCopyUrl(`${window.location.origin}/public/${team.public_share_id}`)}>Copy</button>
                    <button onClick={() => handleShowQrCode(`${window.location.origin}/public/${team.public_share_id}`)}>QR Code</button>
                  </div>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
      {/* ... (create team form is unchanged) ... */}
    </div>
  )
}