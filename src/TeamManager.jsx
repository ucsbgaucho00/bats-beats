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

  useEffect(() => {
    const getTeams = async () => {
      try {
        setLoading(true)
        // --- UPDATED QUERY: Fetch the public_share_id ---
        const { data, error } = await supabase
          .from('teams')
          .select('id, team_name, public_share_id') // Added public_share_id
        
        if (error) throw error
        setTeams(data)
      } catch (error) {
        alert(error.message)
      } finally {
        setLoading(false)
      }
    }
    getTeams()
  }, [session])

  const handleCreateTeam = async (e) => {
    e.preventDefault()
    try {
      const { data, error } = await supabase
        .from('teams')
        .insert({ team_name: newTeamName, user_id: session.user.id })
        .select('id, team_name, public_share_id') // Also select the new ID on create
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
        const { error } = await supabase
          .from('teams')
          .delete()
          .eq('id', teamId)
        
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
      const { error } = await supabase
        .from('teams')
        .update({ team_name: editTeamName })
        .eq('id', teamId)
      
      if (error) throw error
      
      const updatedTeams = teams.map(t => t.id === teamId ? { ...t, team_name: editTeamName } : t)
      setTeams(updatedTeams)
      setEditingTeamId(null)
    } catch (error) {
      alert('Error updating team: ' + error.message)
    }
  }

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
              // --- EDITING VIEW ---
              <>
                <input 
                  type="text" 
                  value={editTeamName} 
                  onChange={(e) => setEditTeamName(e.target.value)} 
                />
                <button onClick={() => handleUpdateTeam(team.id)} style={{ marginLeft: '10px' }}>Save</button>
                <button onClick={handleCancelClick} style={{ marginLeft: '5px' }}>Cancel</button>
              </>
            ) : (
              // --- NORMAL VIEW ---
              <div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <Link to={`/team/${team.id}`}>{team.team_name}</Link>
                  <button onClick={() => handleEditClick(team)} style={{ marginLeft: '10px' }}>Edit</button>
                  <button onClick={() => handleDeleteTeam(team.id)} style={{ marginLeft: '5px' }}>Delete</button>
                </div>
                {/* --- NEW: Display the unique, shareable link --- */}
                <div style={{ fontSize: '0.8em', marginTop: '8px' }}>
                  <strong>Share Link:</strong> <input 
                    type="text" 
                    readOnly 
                    value={`${window.location.origin}/public/${team.public_share_id}`}
                    onClick={(e) => e.target.select()} // Select text on click for easy copying
                    style={{ width: '300px', fontSize: '1em', border: '1px solid #ccc' }}
                  />
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
      
      {canCreateTeam ? (
        <form onSubmit={handleCreateTeam}>
          <h3>Create New Team</h3>
          <input
            type="text"
            placeholder="Enter new team name"
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            required
          />
          <button type="submit">Create Team</button>
        </form>
      ) : (
        <p>
          You have reached your team limit. Please upgrade to a Home Run license to create more teams.
        </p>
      )}
    </div>
  )
}