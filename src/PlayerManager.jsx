// src/PlayerManager.jsx

import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from './supabaseClient'
import SongSearch from './SongSearch'
import PlayButton from './PlayButton'

export default function PlayerManager() {
  const { teamId } = useParams()
  const [loading, setLoading] = useState(true)
  const [players, setPlayers] = useState([])
  const [teamName, setTeamName] = useState('')
  
  // State for the "Add New Player" form
  const [newPlayer, setNewPlayer] = useState({
    player_number: '',
    first_name: '',
    last_name: '',
    song_uri: '',
    song_start_time: 0,
  })

  // --- NEW STATE FOR EDITING ---
  // Tracks which player's row is currently in edit mode
  const [editingPlayerId, setEditingPlayerId] = useState(null) 
  // Holds the form data for the row being edited
  const [editFormData, setEditFormData] = useState({})

  useEffect(() => {
    const fetchTeamAndPlayers = async () => {
      // ... (This function remains unchanged)
      try {
        setLoading(true)
        const { data: teamData, error: teamError } = await supabase.from('teams').select('team_name').eq('id', teamId).single()
        if (teamError) throw teamError
        setTeamName(teamData.team_name)

        const { data: playersData, error: playersError } = await supabase.from('players').select('*').eq('team_id', teamId).order('batting_order', { ascending: true })
        if (playersError) throw playersError
        setPlayers(playersData)
      } catch (error) {
        alert(error.message)
      } finally {
        setLoading(false)
      }
    }
    fetchTeamAndPlayers()
  }, [teamId])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setNewPlayer({ ...newPlayer, [name]: value })
  }

  const handleAddPlayer = async (e) => {
    // ... (This function remains unchanged)
    e.preventDefault()
    try {
      const playerToInsert = { ...newPlayer, team_id: teamId }
      const { data, error } = await supabase.from('players').insert(playerToInsert).select().single()
      if (error) throw error
      setPlayers([...players, data])
      setNewPlayer({ player_number: '', first_name: '', last_name: '', song_uri: '', song_start_time: 0 })
    } catch (error) {
      alert('Error adding player: ' + error.message)
    }
  }
  
  const handleDeletePlayer = async (playerId) => {
    // ... (This function remains unchanged)
    if (window.confirm('Are you sure you want to delete this player?')) {
      try {
        const { error } = await supabase.from('players').delete().eq('id', playerId)
        if (error) throw error
        setPlayers(players.filter(p => p.id !== playerId))
      } catch (error) {
        alert('Error deleting player: ' + error.message)
      }
    }
  }

  // --- NEW HANDLER FUNCTIONS FOR EDITING ---

  // Called when a user clicks the "Edit" button on a row
  const handleEditClick = (player) => {
    setEditingPlayerId(player.id)
    // Pre-fill the edit form with the player's current data
    setEditFormData({ ...player }) 
  }

  // Called when a user clicks the "Cancel" button
  const handleCancelClick = () => {
    setEditingPlayerId(null)
  }

  // Updates the edit form state as the user types
  const handleEditFormChange = (e) => {
    const { name, value } = e.target
    setEditFormData({ ...editFormData, [name]: value })
  }

  // Called when the user clicks "Save"
  const handleUpdatePlayer = async () => {
    try {
      const { id, ...updatedPlayerData } = editFormData // Separate the ID from the rest of the data
      const { error } = await supabase
        .from('players')
        .update(updatedPlayerData)
        .eq('id', id)
      
      if (error) throw error

      // Update the main players list with the new data
      const updatedPlayers = players.map(p => p.id === id ? editFormData : p)
      setPlayers(updatedPlayers)
      
      // Exit edit mode
      setEditingPlayerId(null)
    } catch (error) {
      alert('Error updating player: ' + error.message)
    }
  }

  if (loading) return <div>Loading team details...</div>

  return (
    <div>
      <Link to="/dashboard">{'<'} Back to Dashboard</Link>
      <h1>{teamName}</h1>
      <h2>Roster</h2>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>First Name</th>
            <th>Last Name</th>
            <th>Song</th>
            <th>Start (ms)</th>
            <th>Actions</th>
<th>Play</th>
          </tr>
        </thead>
        {/* --- UPDATED TABLE BODY WITH CONDITIONAL RENDERING --- */}
        <tbody>
          {players.map(player => (
            <tr key={player.id}>
              {editingPlayerId === player.id ? (
                // --- EDITING VIEW ---
                <>
                  <td><input type="number" name="player_number" value={editFormData.player_number} onChange={handleEditFormChange} /></td>
                  <td><input type="text" name="first_name" value={editFormData.first_name} onChange={handleEditFormChange} /></td>
                  <td><input type="text" name="last_name" value={editFormData.last_name} onChange={handleEditFormChange} /></td>
                  <td>
  <SongSearch onSongSelect={(song) => {
    // When a song is selected, update the form data with the URI and clear the song title for display
    handleEditFormChange({ target: { name: 'song_uri', value: song.uri } })
  }} />
</td>
                  <td><input type="number" name="song_start_time" value={editFormData.song_start_time} onChange={handleEditFormChange} /></td>
                  <td>
                    <button onClick={handleUpdatePlayer}>Save</button>
                    <button onClick={handleCancelClick}>Cancel</button>
                  </td>
<td><button disabled>Play</button></td>
                </>
              ) : (
                // --- NORMAL VIEW ---
                <>
                  <td>{player.player_number}</td>
                  <td>{player.first_name}</td>
                  <td>{player.last_name}</td>
                  <td>{player.song_uri}</td>
                  <td>{player.song_start_time / 1000}</td>
                  <td>
                    <button onClick={() => handleEditClick(player)}>Edit</button>
                    <button onClick={() => handleDeletePlayer(player.id)}>Delete</button>
                  </td>
<td>
  <PlayButton songUri={player.song_uri} startTimeMs={player.song_start_time} />
</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      <hr />
      <h3>Add New Player</h3>
      <form onSubmit={handleAddPlayer}>
        {/* ... (The "Add New Player" form remains unchanged) */}
        <input type="number" name="player_number" placeholder="Number" value={newPlayer.player_number} onChange={handleInputChange} />
        <input type="text" name="first_name" placeholder="First Name" value={newPlayer.first_name} onChange={handleInputChange} required />
        <input type="text" name="last_name" placeholder="Last Name" value={newPlayer.last_name} onChange={handleInputChange} />
        <input type="text" name="song_uri" placeholder="Song URI (from Spotify)" value={newPlayer.song_uri} onChange={handleInputChange} />
        <td><input type="number" name="song_start_time" value={editFormData.song_start_time / 1000} onChange={(e) => handleEditFormChange({ target: { name: 'song_start_time', value: e.target.value * 1000 } })} /></td>
        <button type="submit">Add Player</button>
      </form>
    </div>
  )
}