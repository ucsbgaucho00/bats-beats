// src/PlayerManager.jsx

import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from './supabaseClient'
import SongSearch from './SongSearch'
import PlayButton from './PlayButton'

// --- NEW HELPER FUNCTIONS FOR TIME CONVERSION ---
const formatTime = (ms) => {
  if (ms === null || isNaN(ms)) return '00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
};

const parseTime = (timeStr) => {
  if (!timeStr || !timeStr.includes(':')) return 0;
  const parts = timeStr.split(':');
  const minutes = parseInt(parts[0], 10) || 0;
  const seconds = parseInt(parts[1], 10) || 0;
  return ((minutes * 60) + seconds) * 1000;
};


export default function PlayerManager() {
  // ... (state variables are the same)
  const { teamId } = useParams()
  const [loading, setLoading] = useState(true)
  const [players, setPlayers] = useState([])
  const [teamName, setTeamName] = useState('')
  const [newPlayer, setNewPlayer] = useState({ /* ... */ })
  const [editingPlayerId, setEditingPlayerId] = useState(null) 
  const [editFormData, setEditFormData] = useState({})

  useEffect(() => {
    // ... (useEffect is the same)
  }, [teamId])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setNewPlayer({ ...newPlayer, [name]: value })
  }

  // --- UPDATED to handle the full song object ---
  const handleSongSelection = (song) => {
    setNewPlayer({
      ...newPlayer,
      song_uri: song.uri,
      song_title: song.title,
      song_artist: song.artist,
      song_thumbnail_url: song.thumbnail,
    })
  }

  const handleAddPlayer = async (e) => {
    e.preventDefault()
    try {
      const playerToInsert = { ...newPlayer, team_id: teamId }
      const { data, error } = await supabase.from('players').insert(playerToInsert).select().single()
      if (error) throw error
      setPlayers([...players, data])
      setNewPlayer({ player_number: '', first_name: '', last_name: '', song_uri: '', song_title: '', song_artist: '', song_thumbnail_url: '', song_start_time: 0 })
    } catch (error) {
      alert('Error adding player: ' + error.message)
    }
  }
  
  const handleDeletePlayer = async (playerId) => { /* ... */ }
  const handleEditClick = (player) => { /* ... */ }
  const handleCancelClick = () => { /* ... */ }

  const handleEditFormChange = (e) => {
    const { name, value } = e.target
    setEditFormData({ ...editFormData, [name]: value })
  }

  // --- UPDATED to handle the full song object ---
  const handleEditSongSelection = (song) => {
    setEditFormData({
      ...editFormData,
      song_uri: song.uri,
      song_title: song.title,
      song_artist: song.artist,
      song_thumbnail_url: song.thumbnail,
    })
  }

  const handleUpdatePlayer = async () => { /* ... */ }

  if (loading) return <div>Loading team details...</div>

  return (
    <div>
      {/* ... (header is the same) ... */}
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>First Name</th>
            <th>Last Name</th>
            <th>Song</th>
            <th>Start</th> {/* <-- Updated Header */}
            <th>Actions</th>
            <th>Play</th>
          </tr>
        </thead>
        <tbody>
          {players.map(player => (
            <tr key={player.id}>
              {editingPlayerId === player.id ? (
                // --- EDITING VIEW ---
                <>
                  <td><input type="number" name="player_number" value={editFormData.player_number} onChange={handleEditFormChange} /></td>
                  <td><input type="text" name="first_name" value={editFormData.first_name} onChange={handleEditFormChange} /></td>
                  <td><input type="text" name="last_name" value={editFormData.last_name} onChange={handleEditFormChange} /></td>
                  <td><SongSearch onSongSelect={handleEditSongSelection} /></td>
                  <td>
                    <input 
                      type="text" 
                      name="song_start_time" 
                      defaultValue={formatTime(editFormData.song_start_time)}
                      onBlur={(e) => handleEditFormChange({ target: { name: 'song_start_time', value: parseTime(e.target.value) }})}
                      placeholder="MM:SS"
                    />
                  </td>
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
                  <td>
                    {player.song_title ? (
                      <div>
                        <strong>{player.song_title}</strong>
                        <br />
                        <span style={{fontSize: '0.9em', color: '#555'}}>{player.song_artist}</span>
                      </div>
                    ) : (
                      'No song selected'
                    )}
                  </td>
                  <td>{formatTime(player.song_start_time)}</td> {/* <-- Updated Display */}
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
        <input type="number" name="player_number" placeholder="Number" value={newPlayer.player_number} onChange={handleInputChange} />
        <input type="text" name="first_name" placeholder="First Name" value={newPlayer.first_name} onChange={handleInputChange} required />
        <input type="text" name="last_name" placeholder="Last Name" value={newPlayer.last_name} onChange={handleInputChange} />
        <SongSearch onSongSelect={handleSongSelection} />
        <input 
          type="text" 
          placeholder="Start Time (MM:SS)" 
          onBlur={(e) => handleInputChange({ target: { name: 'song_start_time', value: parseTime(e.target.value) }})}
        />
        <button type="submit">Add Player</button>
      </form>
    </div>
  )
}
```*(Note: I have omitted unchanged functions and state for brevity, but they should remain in your file).*

### Deployment Commands

1.  **Run the SQL command** in your Supabase dashboard.
2.  **Save the modified `SongSearch.jsx` and `PlayerManager.jsx` files.**
3.  **Commit and push the changes:**
    ```bash
    git add .
    git commit -m "feat: Display song details and use MM:SS time format"
    git push
    ```

After deploying, your player management page will now:
*   Display the song's title and artist instead of the URI.
*   Show the start time in `MM:SS` format.
*   Allow you to input the start time in `MM:SS` format.