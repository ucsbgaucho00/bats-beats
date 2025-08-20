// src/TeamManager.jsx

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from './supabaseClient'

export default function TeamManager({ session, profile }) {
  const [loading, setLoading] = useState(true)
  const [teams, setTeams] = useState([])
  const [newTeamName, setNewTeamName] = useState('')
  const [editingTeamId, setEditingTeamId] = useState(null)
  const [editTeamName, setEditTeamName] = useState('')
  
  // --- NEW STATE FOR PLAYLISTS ---
  const [playlists, setPlaylists] = useState([])
  const [loadingPlaylists, setLoadingPlaylists] = useState(false)

  useEffect(() => {
    const getTeamsAndPlaylists = async () => {
      try {
        setLoading(true)
        // Fetch teams (now including warmup_playlist_id)
        const { data: teamsData, error: teamsError } = await supabase
          .from('teams')
          .select('id, team_name, public_share_id, warmup_playlist_id')
        if (teamsError) throw teamsError
        setTeams(teamsData)

        // If user is Home Run, fetch their playlists
        if (profile.license === 'Home Run') {
          setLoadingPlaylists(true)
          const { data: playlistsData, error: playlistsError } = await supabase.functions.invoke('get-spotify-playlists')
          if (playlistsError) throw playlistsError
          setPlaylists(playlistsData)
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

  // --- NEW FUNCTION TO SAVE PLAYLIST SELECTION ---
  const handlePlaylistChange = async (teamId, playlistId) => {
    try {
      const { error } = await supabase
        .from('teams')
        .update({ warmup_playlist_id: playlistId })
        .eq('id', teamId)
      if (error) throw error
      // Update local state to reflect the change
      const updatedTeams = teams.map(t => t.id === teamId ? { ...t, warmup_playlist_id: playlistId } : t)
      setTeams(updatedTeams)
    } catch (error) {
      alert('Error saving playlist: ' + error.message)
    }
  }

  // ... (other handlers like handleCreateTeam, handleDeleteTeam, etc. are unchanged)
  const handleCreateTeam = async (e) => { /* ... */ }
  const handleDeleteTeam = async (teamId) => { /* ... */ }
  const handleEditClick = (team) => { /* ... */ }
  const handleCancelClick = () => { /* ... */ }
  const handleUpdateTeam = async (teamId) => { /* ... */ }

  const canCreateTeam = profile.license === 'Home Run' || (profile.license === 'Single' && teams.length === 0)

  return (
    <div>
      <hr />
      <h2>Manage Your Teams</h2>
      {loading && <p>Loading teams...</p>}
      <ul>
        {teams.map(team => (
          <li key={team.id} style={{ marginBottom: '15px', border: '1px solid #eee', padding: '10px' }}>
            {editingTeamId === team.id ? (
              // ... (editing view is unchanged)
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <Link to={`/team/${team.id}`}>{team.team_name}</Link>
                  <button onClick={() => handleEditClick(team)}>Edit</button>
                  <button onClick={() => handleDeleteTeam(team.id)}>Delete</button>
                </div>
                {/* --- NEW: WARMUP PLAYLIST SELECTOR (Home Run only) --- */}
                {profile.license === 'Home Run' && (
                  <div style={{ marginTop: '8px' }}>
                    <label htmlFor={`playlist-select-${team.id}`}>Warmup Playlist: </label>
                    {loadingPlaylists ? (
                      <span>Loading playlists...</span>
                    ) : (
                      <select
                        id={`playlist-select-${team.id}`}
                        value={team.warmup_playlist_id || ''}
                        onChange={(e) => handlePlaylistChange(team.id, e.target.value)}
                      >
                        <option value="">-- Select a Playlist --</option>
                        {playlists.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
                <div style={{ fontSize: '0.8em', marginTop: '8px' }}>
                  <strong>Share Link:</strong> <input type="text" readOnly value={`${window.location.origin}/public/${team.public_share_id}`} />
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
      {canCreateTeam && (
        <form onSubmit={handleCreateTeam}>
          {/* ... (create team form is unchanged) */}
        </form>
      )}
    </div>
  )
}