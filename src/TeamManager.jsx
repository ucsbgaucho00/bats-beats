// src/TeamManager.jsx

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from './supabaseClient'
import { QRCodeSVG } from 'qrcode.react'

export default function TeamManager({ session, profile }) {
  const [loading, setLoading] = useState(true)
  const [teams, setTeams] = useState([])
  const [newTeamName, setNewTeamName] = useState('')
  const [editingTeamId, setEditingTeamId] = useState(null)
  const [editTeamName, setEditTeamName] = useState('')
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
          const { data: playlistsData, error: playlistsError } = await supabase.functions.invoke('get-spotify-playlists', { method: 'GET' })
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

  const handleEditClick = (team) => {
    setEditingTeamId(team.id)
    setEditTeamName(team.team_name)
  }

  const handleCancelClick = () => {
    setEditingTeamId(null)
  }

  const handleUpdateTeam = async (teamId) => {
    try {
      const { error } = await supabase.from('teams').update({ team_name: editTeamName }).eq('id', teamId)
      if (error) throw error
      setTeams(teams.map(t => t.id === teamId ? { ...t, team_name: editTeamName } : t))
      setEditingTeamId(null)
    } catch (error) {
      alert('Error updating team: ' + error.message)
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

  const handleCopyUrl = (url) => {
    navigator.clipboard.writeText(url).then(() => {
      alert('Share link copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  };

  const handleShowQrCode = (url) => {
    setQrCodeUrl(url);
    setShowQrModal(true);
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
      {loading && <p>Loading teams...</p>}
      
      {teams.map(team => (
        <div key={team.id} className="team-card">
          {editingTeamId === team.id ? (
            <div>
              <input type="text" value={editTeamName} onChange={(e) => setEditTeamName(e.target.value)} />
              <div style={{marginTop: '10px', display: 'flex', gap: '10px'}}>
                <button onClick={() => handleUpdateTeam(team.id)} className="btn-primary">Save</button>
                <button onClick={handleCancelClick} className="btn-secondary">Cancel</button>
              </div>
            </div>
          ) : (
            <div>
              <div className="team-card-header">
                <Link to={`/team/${team.id}`} className="team-card-title">{team.team_name}</Link>
                <div className="team-card-actions">
                  <button onClick={() => handleEditClick(team)} className="btn-secondary">Edit</button>
                  <button onClick={() => handleDeleteTeam(team.id)} className="btn-secondary" style={{borderColor: 'var(--mlb-red)', color: 'var(--mlb-red)'}}>Delete</button>
                </div>
              </div>
              {profile.license === 'Home Run' && (
                <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #f0f0f0' }}>
                  <label htmlFor={`playlist-select-${team.id}`} style={{fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.8em'}}>Warmup Playlist</label>
                  {loadingPlaylists ? (
                    <p>Loading playlists...</p>
                  ) : (
                    <select
                      id={`playlist-select-${team.id}`}
                      value={team.warmup_playlist_id || ''}
                      onChange={(e) => handlePlaylistChange(team.id, e.target.value)}
                      style={{marginTop: '5px'}}
                    >
                      <option value="">-- Select a Playlist --</option>
                      {playlists.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  )}
                  {team.warmup_playlist_id && (
                    <div style={{ marginTop: '10px' }}>
                      <Link to={`/team/${team.id}/warmup`}>
                        <button className="btn-primary">Play Warmup Mix</button>
                      </Link>
                    </div>
                  )}
                </div>
              )}
              <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #f0f0f0' }}>
                <strong style={{textTransform: 'uppercase', fontSize: '0.8em'}}>Filter explicit songs</strong>
                <div style={{ display: 'flex', gap: '20px', marginTop: '10px' }}>
                  <label style={{display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer'}}>
                    <span className="toggle-switch">
                      <input type="checkbox" checked={team.filter_explicit_walkup} onChange={() => handleFilterToggle(team.id, 'filter_explicit_walkup', team.filter_explicit_walkup)} />
                      <span className="toggle-slider"></span>
                    </span>
                    Walk-up songs
                  </label>
                  <label style={{display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer'}}>
                    <span className="toggle-switch">
                      <input type="checkbox" checked={team.filter_explicit_warmup} onChange={() => handleFilterToggle(team.id, 'filter_explicit_warmup', team.filter_explicit_warmup)} disabled={profile.license !== 'Home Run'} />
                      <span className="toggle-slider"></span>
                    </span>
                    Warmup Playlist
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
          )}
        </div>
      ))}
      
      {canCreateTeam && (
        <div className="team-card">
          <h3>Create New Team</h3>
          <form onSubmit={handleCreateTeam} style={{display: 'flex', gap: '10px'}}>
            <input type="text" placeholder="Enter new team name" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} required style={{marginBottom: 0}} />
            <button type="submit" className="btn-primary" style={{width: 'auto'}}>Create Team</button>
          </form>
        </div>
      )}
    </div>
  )
}