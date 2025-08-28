// src/PlayerManager.jsx

import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import SongSearch from './SongSearch'

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
  const { teamId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState(null);
  const [teamName, setTeamName] = useState('');
  const [editingTeamName, setEditingTeamName] = useState(false);
  const [players, setPlayers] = useState([]);
  
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
  });

  const [editingPlayerId, setEditingPlayerId] = useState(null);
  const [editFormData, setEditFormData] = useState({});

  useEffect(() => {
    const fetchTeamAndPlayers = async () => {
      try {
        setLoading(true);
        const { data: teamData, error: teamError } = await supabase.from('teams').select('*').eq('id', teamId).single();
        if (teamError) throw teamError;
        setTeam(teamData);
        setTeamName(teamData.team_name);
        
        const { data: playersData, error: playersError } = await supabase
          .from('players')
          .select('*')
          .eq('team_id', teamId)
          .order('batting_order', { ascending: true });
        if (playersError) throw playersError;
        setPlayers(playersData);
      } catch (error) {
        alert(error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchTeamAndPlayers();
  }, [teamId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewPlayer({ ...newPlayer, [name]: value });
  };

  const handleSongSelection = (song) => {
    setNewPlayer({
      ...newPlayer,
      song_uri: song.uri,
      song_title: song.title,
      song_artist: song.artist,
      song_thumbnail_url: song.thumbnail,
      song_search_text: `${song.title} - ${song.artist}`,
    });
  };

  const handleAddPlayer = async (e) => {
    e.preventDefault();
    try {
      const { song_search_text, ...playerToInsert } = { ...newPlayer, team_id: teamId };
      const { data, error } = await supabase.from('players').insert(playerToInsert).select('*').single();
      if (error) throw error;
      setPlayers([...players, data]);
      setNewPlayer({
        player_number: '', first_name: '', last_name: '', song_uri: '',
        song_title: '', song_artist: '', song_thumbnail_url: '',
        song_start_time: 0, song_search_text: '',
      });
    } catch (error) {
      alert('Error adding player: ' + error.message);
    }
  };
  
  const handleDeletePlayer = async (playerId) => {
    if (window.confirm('Are you sure you want to delete this player?')) {
      try {
        const { error } = await supabase.from('players').delete().eq('id', playerId);
        if (error) throw error;
        setPlayers(players.filter(p => p.id !== playerId));
      } catch (error) {
        alert('Error deleting player: ' + error.message);
      }
    }
  };

  const handleEditClick = (player) => {
    setEditingPlayerId(player.id);
    setEditFormData({ ...player });
  };

  const handleCancelClick = () => {
    setEditingPlayerId(null);
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditFormData({ ...editFormData, [name]: value });
  };

  const handleEditSongSelection = (song) => {
    setEditFormData({
      ...editFormData,
      song_uri: song.uri,
      song_title: song.title,
      song_artist: song.artist,
      song_thumbnail_url: song.thumbnail,
    });
  };

  const handleUpdatePlayer = async () => {
    try {
      const { id, ...updatedPlayerData } = editFormData;
      const { error } = await supabase.from('players').update(updatedPlayerData).eq('id', id);
      if (error) throw error;
      const updatedPlayers = players.map(p => p.id === id ? editFormData : p);
      setPlayers(updatedPlayers);
      setEditingPlayerId(null);
    } catch (error) {
      alert('Error updating player: ' + error.message);
    }
  };

const handleTeamNameSave = async () => {
    try {
      const { error } = await supabase.from('teams').update({ team_name: teamName }).eq('id', teamId);
      if (error) throw error;
      setEditingTeamName(false);
    } catch (error) {
      alert('Error updating team name: ' + error.message);
    }
  };

  if (loading) return <div className="page-content"><p>Loading team details...</p></div>;

  return (
    <div className="page-content">
      <div style={{marginBottom: '20px'}}>
        <button onClick={() => navigate('/dashboard')} className="btn-secondary" style={{width: 'auto', borderColor: 'var(--mlb-red)', color: 'var(--mlb-red)'}}>
          {'<'} Back to Dashboard
        </button>
      </div>
      
      <div className="card-header">
        {editingTeamName ? (
          <input type="text" value={teamName} onChange={(e) => setTeamName(e.target.value)} style={{fontSize: '1.4em', fontWeight: 'bold'}} />
        ) : (
          <h1 className="card-title" style={{margin: 0}}>{teamName}</h1>
        )}
        <div className="card-actions">
          {editingTeamName ? (
            <button onClick={handleTeamNameSave} className="btn-primary btn-icon">
              <i className="fa-solid fa-save"></i><span className="btn-text">Save</span>
            </button>
          ) : (
            <button onClick={() => setEditingTeamName(true)} className="btn-secondary btn-icon">
              <i className="fa-solid fa-pencil"></i><span className="btn-text">Edit Name</span>
            </button>
          )}
          <Link to={`/public/${team?.public_share_id}`} className="btn-primary btn-icon">
            <i className="fa-solid fa-play"></i><span className="btn-text">Play</span>
          </Link>
        </div>
      </div>
      
      <div className="card">
        <h2>Roster</h2>
        <div style={{overflowX: 'auto'}}>
          <table style={{width: '100%'}}>
            {/* ... (table is unchanged, will adopt new global styles) ... */}
          </table>
        </div>
      </div>
      
      <div className="card">
        <h3>Add New Player</h3>
        <form onSubmit={handleAddPlayer} className="input-group">
          <input type="number" name="player_number" placeholder="Number" value={newPlayer.player_number} onChange={handleInputChange} />
          <input type="text" name="first_name" placeholder="First Name" value={newPlayer.first_name} onChange={handleInputChange} required />
          <input type="text" name="last_name" placeholder="Last Name" value={newPlayer.last_name} onChange={handleInputChange} />
          <SongSearch onSongSelect={handleSongSelection} initialValue={newPlayer.song_search_text} />
          <input type="text" placeholder="Start Time (MM:SS)" defaultValue="00:00" onBlur={(e) => handleInputChange({ target: { name: 'song_start_time', value: parseTime(e.target.value) }})} />
          <button type="submit" className="btn-primary">Add Player</button>
        </form>
      </div>
    </div>
  )
}