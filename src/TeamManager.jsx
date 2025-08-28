// src/TeamManager.jsx

import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import { QRCodeSVG } from 'qrcode.react'

export default function TeamManager({ session, profile }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true)
  const [teams, setTeams] = useState([])
  const [newTeamName, setNewTeamName] = useState('')
  const [playlists, setPlaylists] = useState([])
  const [loadingPlaylists, setLoadingPlaylists] = useState(false)
  const [showQrModal, setShowQrModal] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState('')

  useEffect(() => {
    const getTeamsAndPlaylists = async () => {
      try {
        setLoading(true)
        const { data: teamsData, error: teamsError } = await supabase
          .from('teams')
          .select('id, team_name, public_share_id, warmup_playlist_id, filter_explicit_walkup, filter_explicit_warmup')
        if (teamsError) throw teamsError
        setTeams(teamsData)

        if (profile.license === 'Home Run') {
          setLoadingPlaylists(true)
          const { data: playlistsData, error: playlistsError } = await supabase.functions.invoke('get-playlists-with-refresh', { method: 'GET' })
          if (playlistsError) throw playlistsError
          setPlaylists(playlistsData || [])
          setLoadingPlaylists(false)
        }
      } catch (error) {
        alert(error.message)
      } finally {
        setLoading(false)
      }
    }
    getTeamsAndPlaylists()
  }, [session, profile.license])

  const handlePlaylistChange = async (teamId, playlistId) => {
    try {
      const { error } = await supabase.from('teams').update({ warmup_playlist_id: playlistId || null }).eq('id', teamId)
      if (error) throw error
      setTeams(teams.map(t => t.id === teamId ? { ...t, warmup_playlist_id: playlistId } : t))
    } catch (error) {
      alert('Error saving playlist: ' + error.message)
    }
  }

  const handleCreateTeam = async (e) => {
    e.preventDefault()
    try {
      const { data, error } = await supabase
        .from('teams')
        .insert({ team_name: newTeamName, user_id: session.user.id })
        .select('id, team_name, public_share_id, warmup_playlist_id, filter_explicit_walkup, filter_explicit_warmup')
        .single()
      if (error) throw error
      setTeams([...teams, data])
      setNewTeamName('')
    } catch (error) {
      alert('Error creating team: ' + error.message)
    }
  }

  const handleDeleteTeam = async (teamId) => {
    if (window.confirm('Are you sure you want to delete this team? This will also delete all players on this team.')) {
      try {
        const { error } = await supabase.from('teams').delete().eq('id', teamId)
        if (error) throw error
        setTeams(teams.filter(team => team.id !== teamId))
      } catch (error) {
        alert('Error deleting team: ' + error.message)
      }
    }
  }

  const handleFilterToggle = async (teamId, filterType, currentValue) => {
    try {
      const update = { [filterType]: !currentValue };
      const { error } = await supabase.from('teams').update(update).eq('id', teamId);
      if (error) throw error;
      setTeams(teams.map(t => t.id === teamId ? { ...t, ...update } : t));
    } catch (error) {
      alert(`Error updating filter: ${error.message}`);
    }
  };

  const handleCopyUrl = (url, teamId) => { // <-- Add teamId
    navigator.clipboard.writeText(url).then(async () => {
      alert('Share link copied to clipboard!');
      // --- NEW: Track this event ---
      await supabase.from('events').insert({
        event_name: 'copy_share_url',
        user_id: session.user.id,
        team_id: teamId
      });
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  };

  const handleShowQrCode = async (url, teamId) => { // <-- Add teamId
    setQrCodeUrl(url);
    setShowQrModal(true);
    // --- NEW: Track this event ---
    await supabase.from('events').insert({
      event_name: 'generate_qr_code',
      user_id: session.user.id,
      team_id: teamId
    });
  };

  const canCreateTeam = profile.license === 'Home Run' || (profile.license === 'Single' && teams.length === 0)

  return (
    <div>
      {showQrModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
          <QRCodeSVG value={qrCodeUrl} size={256} bgColor="#ffffff" fgColor="#000000" />
          <p style={{color: 'white', marginTop: '20px'}}>{qrCodeUrl}</p>
          <button onClick={() => setShowQrModal(false)} style={{marginTop: '20px', width: 'auto'}} className="btn-secondary">Close</button>
        </div>
      )}

      <h2>Manage Your Teams</h2>
      
      {teams.map(team => (
        <div key={team.id} className="card team-card">
          <div className="card-header">
            <h3 className="card-title">{team.team_name}</h3>
            <div className="card-actions">
              <button onClick={() => navigate(`/team/${team.id}`)} className="btn-secondary btn-icon">
                <i className="fa-solid fa-pencil"></i>
                <span className="btn-text">Edit</span>
              </button>
              <Link to={`/public/${team.public_share_id}`} className="btn-primary btn-icon">
                 <i className="fa-solid fa-play"></i>
                 <span className="btn-text">Play</span>
              </Link>
            </div>
          </div>
          
          {profile.license === 'Home Run' && (
            <div className="card-section">
              <label htmlFor={`playlist-select-${team.id}`} className="card-section-title">Warmup Playlist</label>
              {loadingPlaylists ? (
                <p>Loading playlists...</p>
              ) : (
                <select id={`playlist-select-${team.id}`} value={team.warmup_playlist_id || ''} onChange={(e) => handlePlaylistChange(team.id, e.target.value)} style={{marginTop: '5px', maxWidth: '100%'}}>
                  {/* ... options ... */}
                </select>
              )}
            </div>
          )}
          
          <div className="card-section">
            <strong className="card-section-title">Filter explicit songs</strong>
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

          <div className="card-section">
            <strong className="card-section-title">Share Link</strong>
            <div className="share-actions">
              <button onClick={() => handleCopyUrl(`${window.location.origin}/public/${team.public_share_id}`, team.id)} className="btn-secondary">Copy URL</button>
  <button onClick={() => handleShowQrCode(`${window.location.origin}/public/${team.public_share_id}`, team.id)} className="btn-secondary">Show QR Code</button>
            </div>
          </div>
        </div>
      ))}
      
      {canCreateTeam && (
        <div className="card">
          <h3>Create New Team</h3>
          {/* --- THIS IS THE FIX for the form layout --- */}
          <form onSubmit={handleCreateTeam} className="responsive-form">
            <input type="text" placeholder="Enter new team name" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} required style={{marginBottom: 0, flexGrow: 1}} />
            <button type="submit" className="btn-primary" style={{width: 'auto', flexShrink: 0}}>Create Team</button>
          </form>
        </div>
      )}
    </div>
  )
}