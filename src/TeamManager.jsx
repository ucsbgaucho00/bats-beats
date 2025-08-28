// src/TeamManager.jsx

import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import { QRCodeSVG } from 'qrcode.react'

export default function TeamManager({ session, profile }) {
  const navigate = useNavigate();
  // ... (All state and handler functions are unchanged)

  return (
    <div>
      {/* ... (QR Code Modal is unchanged) ... */}
      <h2>Manage Your Teams</h2>
      
      {teams.map(team => (
        <div key={team.id} className="team-card">
          <div className="card-header">
            <span className="card-title">{team.team_name}</span>
            <div className="card-actions">
              <button onClick={() => navigate(`/team/${team.id}`)} className="btn-secondary btn-icon">
                <i className="fa-solid fa-pencil"></i><span className="btn-text">Edit</span>
              </button>
              <Link to={`/public/${team.public_share_id}`} className="btn-secondary btn-icon">
                <i className="fa-solid fa-play"></i><span className="btn-text">Play</span>
              </Link>
            </div>
          </div>
          
          {profile.license === 'Home Run' && (
            <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #f0f0f0' }}>
              <label htmlFor={`playlist-select-${team.id}`} style={{fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.8em'}}>Warmup Playlist</label>
              <select id={`playlist-select-${team.id}`} value={team.warmup_playlist_id || ''} onChange={(e) => handlePlaylistChange(team.id, e.target.value)} style={{marginTop: '5px', maxWidth: '100%'}}>
                {/* ... options ... */}
              </select>
            </div>
          )}
          
          <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #f0f0f0' }}>
            <strong style={{textTransform: 'uppercase', fontSize: '0.8em'}}>Filter explicit songs</strong>
            <div className="toggle-group" style={{marginTop: '10px'}}>
              <label className="toggle-label">
                <span>Walk-up songs</span>
                <span className="toggle-switch">
                  <input type="checkbox" checked={team.filter_explicit_walkup} onChange={() => handleFilterToggle(team.id, 'filter_explicit_walkup', team.filter_explicit_walkup)} />
                  <span className="toggle-slider"></span>
                </span>
              </label>
              <label className="toggle-label">
                <span>Warmup Playlist</span>
                <span className="toggle-switch">
                  <input type="checkbox" checked={team.filter_explicit_warmup} onChange={() => handleFilterToggle(team.id, 'filter_explicit_warmup', team.filter_explicit_warmup)} disabled={profile.license !== 'Home Run'} />
                  <span className="toggle-slider"></span>
                </span>
              </label>
            </div>
          </div>

          <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #f0f0f0' }}>
            <strong style={{textTransform: 'uppercase', fontSize: '0.8em'}}>Share Link</strong>
            <div className="share-actions">
              <button onClick={() => handleCopyUrl(`${window.location.origin}/public/${team.public_share_id}`)} className="btn-secondary">Copy</button>
              <button onClick={() => handleShowQrCode(`${window.location.origin}/public/${team.public_share_id}`)} className="btn-secondary">QR Code</button>
            </div>
          </div>
        </div>
      ))}
      
      {canCreateTeam && ( /* ... (Create team form is unchanged) ... */ )}
    </div>
  )
}