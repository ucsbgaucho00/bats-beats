// src/PlayerManager.jsx

import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from './supabaseClient'
import SongSearch from './SongSearch'
import PlayButton from './PlayButton'

// --- HELPER FUNCTIONS FOR TIME CONVERSION ---
const formatTime = (ms) => {
  if (ms === null || isNaN(ms) || ms === 0) return '00:00';
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
  const { teamId } = useParams()
  const [loading, setLoading] = useState(true)
  const [players, setPlayers] = useState([])
  const [teamName, setTeamName] = useState('')
  
  const [newPlayer, setNewPlayer] = useState({
    player_number: '',
    first_name: '',
    last_name: '',
    song_uri: '',
    song_title: '',
    song_artist: '',
    song_thumbnail_url: '',
    song_start_time: 0,
    song_search_text: '',
  })

  const [editingPlayerId, setEditingPlayerId] = useState(null) 
  const [editFormData, setEditFormData] = useState({})

  useEffect(() => {
    const fetchTeamAndPlayers = async () => {
      try {
        setLoading(true)
        const { data: teamData } = await supabase.from('teams').select('team_name').eq('id', teamId).single()
        setTeamName(teamData.team_name)
        
        // --- FIX: Ensure all song details are fetched ---
        const { data: playersData, error: playersError } = await supabase
          .from('players')
          .select('*') // Select all columns to get song_title, etc.
          .eq('team_id', teamId)
          .order('batting_order', { ascending: true })

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

  const handleSongSelection = (song) => {
    setNewPlayer({
      ...newPlayer,
      song_uri: song.uri,
      song_title: song.title,
      song_artist: song.artist,
      song_thumbnail_url: song.thumbnail,
      song_search_text: `${song.title} - ${song.artist}`,
    })
  }

  const handleAddPlayer = async (e) => {
    e.preventDefault()
    try {
      const { song_search_text, ...playerToInsert } = { ...newPlayer, team_id: teamId }
      
      const { data, error } = await supabase.from('players').insert(playerToInsert).select().single()
      if (error) throw error
      
      setPlayers([...players, data])
      
      setNewPlayer({
        player_number: '',
        first_name: '',
        last_name: '',
        song_uri: '',
        song_title: '',
        song_artist: '',
        song_thumbnail_url: '',
        song_start_time: 0,
        song_search_text: '',
      })
    } catch (error) {
      alert('Error adding player: ' + error.message)
    }
  }
  
  const handleDeletePlayer = async (playerId) => { /* ... (unchanged) ... */ }
  const handleEditClick = (player) => { /* ... (unchanged) ... */ }
  const handleCancelClick = () => { /* ... (unchanged) ... */ }
  const handleEditFormChange = (e) => { /* ... (unchanged) ... */ }
  const handleEditSongSelection = (song) => { /* ... (unchanged) ... */ }
  const handleUpdatePlayer = async () => { /* ... (unchanged) ... */ }

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
            {/* --- FIX: Corrected table header --- */}
            <th>Start Time</th>
            <th>Actions</th>
            <th>Play</th>
          </tr>
        </thead>
        <tbody>
          {players.map(player => (
            <tr key={player.id}>
              {editingPlayerId === player.id ? (
                // --- EDITING VIEW (with time format fix) ---
                <>
                  <td><input type="number" name="player_number" value={editFormData.player_number} onChange={handleEditFormChange} /></td>
                  <td><input type="text" name="first_name" value={editFormData.first_name} onChange={handleEditFormChange} /></td>
                  <td><input type="text" name="last_name" value={editFormData.last_name} onChange={handleEditFormChange} /></td>
                  <td><SongSearch onSongSelect={handleEditSongSelection} initialValue={`${editFormData.song_title} - ${editFormData.song_artist}`} /></td>
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
                // --- NORMAL VIEW (with display fixes) ---
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
                  <td>{formatTime(player.song_start_time)}</td>
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
        <SongSearch 
          onSongSelect={handleSongSelection} 
          initialValue={newPlayer.song_search_text} 
        />
        {/* --- FIX: Time input now uses defaultValue and MM:SS format --- */}
        <input 
          type="text" 
          placeholder="Start Time (MM:SS)" 
          defaultValue="00:00"
          onBlur={(e) => handleInputChange({ target: { name: 'song_start_time', value: parseTime(e.target.value) }})}
        />
        <button type="submit">Add Player</button>
      </form>
    </div>
  )
}