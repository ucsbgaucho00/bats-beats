// src/WarmupPlayer.jsx

import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from './supabaseClient'

let spotifyPlayer = null;
let device_id = null;

const initializePlayer = (accessToken) => {
  if (spotifyPlayer) {
    spotifyPlayer.disconnect();
  }
  if (window.Spotify && accessToken) {
    spotifyPlayer = new window.Spotify.Player({
      name: 'Bats & Beats Warmup Player',
      getOAuthToken: cb => { cb(accessToken); }
    });
    spotifyPlayer.addListener('ready', ({ device_id: ready_device_id }) => {
      console.log('Warmup Player Ready with Device ID', ready_device_id);
      device_id = ready_device_id;
    });
    spotifyPlayer.addListener('not_ready', () => { device_id = null; });
    spotifyPlayer.connect();
  }
};

export default function WarmupPlayer() {
  const { teamId } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [team, setTeam] = useState(null)
  const [playlistName, setPlaylistName] = useState('');
  const [accessToken, setAccessToken] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isShuffle, setIsShuffle] = useState(true)
  const fadeIntervalRef = useRef(null);

  useEffect(() => {
    const getTeamDataAndToken = async () => {
      try {
        const { data: teamData, error: teamError } = await supabase
          .from('teams')
          .select('team_name, warmup_playlist_id, user_id')
          .eq('id', teamId)
          .single()
        if (teamError) throw teamError
        if (!teamData.warmup_playlist_id) throw new Error("No warmup playlist selected for this team.")
        setTeam(teamData)

        const { data, error } = await supabase.functions.invoke('spotify-refresh', {
          body: { owner_user_id: teamData.user_id }
        })
        if (error) throw error
        const token = data.new_access_token;
        setAccessToken(token)
        initializePlayer(token)

        // Fetch playlist name from Spotify
        const playlistResponse = await fetch(`https://api.spotify.com/v1/playlists/${teamData.warmup_playlist_id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const playlistData = await playlistResponse.json();
        setPlaylistName(playlistData.name);

      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    getTeamDataAndToken()
  }, [teamId])

  useEffect(() => {
    return () => {
      if (isPlaying && spotifyPlayer) {
        startFadeOut();
      }
    };
  }, [isPlaying]);

  const startFadeOut = (andThen) => {
    clearInterval(fadeIntervalRef.current);
    let volume = 100;
    fadeIntervalRef.current = setInterval(() => {
      volume -= 5;
      if (volume >= 0 && spotifyPlayer) {
        spotifyPlayer.setVolume(volume / 100).catch(e => console.error(e));
      } else {
        clearInterval(fadeIntervalRef.current);
        if (spotifyPlayer) {
          spotifyPlayer.pause();
          spotifyPlayer.setVolume(1);
        }
        setIsPlaying(false);
        if (andThen) andThen();
      }
    }, 100);
  };

  const handlePlayPause = async () => {
    if (!spotifyPlayer || !device_id) {
      alert('Spotify player is not ready. Please make this your active device.');
      return;
    }
    if (isPlaying) {
      startFadeOut();
    } else {
      await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${device_id}`, {
        method: 'PUT',
        body: JSON.stringify({ context_uri: `spotify:playlist:${team.warmup_playlist_id}` }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
      });
      setTimeout(() => handleShuffle(isShuffle), 500);
      setIsPlaying(true);
    }
  };

  const handleShuffle = async (shuffleState) => {
    if (!accessToken) return;
    await fetch(`https://api.spotify.com/v1/me/player/shuffle?state=${shuffleState}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    setIsShuffle(shuffleState);
  };

  const handleSkip = async () => {
    if (!accessToken) return;
    await fetch(`https://api.spotify.com/v1/me/player/next`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    setIsPlaying(true);
  };

  if (loading) return <div className="page-content"><p>Loading Warmup Player...</p></div>
  if (error) return <div className="page-content"><p>Error: {error} <Link to="/dashboard">Go Back</Link></p></div>

  return (
    <div className="page-content">
      <div style={{marginBottom: '20px'}}>
        <Link to="/dashboard">
          <button className="btn-secondary" style={{width: 'auto'}}>{'<'} Back to Dashboard</button>
        </Link>
      </div>
      
      <div className="warmup-controls">
        <button onClick={() => handleShuffle(!isShuffle)} className={`skip-shuffle-btn ${isShuffle ? 'btn-primary' : 'btn-secondary'}`}>
          <i className="fa-solid fa-shuffle"></i>
        </button>
        <button onClick={handlePlayPause} className="play-pause-btn btn-primary">
          {isPlaying ? <i className="fa-solid fa-pause"></i> : <i className="fa-solid fa-play"></i>}
        </button>
        <button onClick={handleSkip} className="skip-shuffle-btn btn-secondary">
          <i className="fa-solid fa-forward-step"></i>
        </button>
      </div>
      {playlistName && <p className="playlist-name">{playlistName}</p>}
    </div>
  )
}```

### 2. Complete `PublicPlayer.jsx` Code

This version implements the "player playing" visual state and the updated button logic.

```javascript
// src/PublicPlayer.jsx

import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from './supabaseClient'
import PlayButton from './PlayButton'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'

const truncate = (text, length) => { /* ... (unchanged) ... */ };

export default function PublicPlayer() {
  const { shareId } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [teamData, setTeamData] = useState(null)
  const [freshToken, setFreshToken] = useState(null)
  const [isReordering, setIsReordering] = useState(false)
  const [activePlayers, setActivePlayers] = useState([])
  const [inactivePlayers, setInactivePlayers] = useState([])
  const [currentlyPlayingUri, setCurrentlyPlayingUri] = useState(null);

  useEffect(() => {
    const fetchAllData = async () => { /* ... (unchanged) ... */ };
    fetchAllData();
  }, [shareId]);

  const handleOnDragEnd = (result) => { /* ... (unchanged) ... */ }
  const handleSaveOrder = async () => { /* ... (unchanged) ... */ }

  if (loading) return <div className="page-content"><p>Loading player...</p></div>;
  if (error || !teamData) return <div className="page-content"><p>Error: {error || 'Could not load team data.'}</p></div>;

  const showInactiveSection = isReordering || inactivePlayers.length > 0;

  return (
    <div className="page-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{margin: 0}}>{teamData.teamName}</h1>
        <div>
          {teamData.showWarmupButton && (
            <Link to={`/public/${shareId}/warmup`} style={{marginRight: '10px'}}>
              <button className="btn-primary">▶ Play Warmup</button>
            </Link>
          )}
          <button onClick={() => setIsReordering(!isReordering)} className={isReordering ? 'btn-primary' : 'btn-secondary'}>
            {isReordering ? 'Save Lineup' : 'Edit Lineup'}
          </button>
          {isReordering && (
            <button onClick={() => { setIsReordering(false); /* Add logic to revert changes if needed */ }} className="btn-secondary" style={{marginLeft: '10px'}}>
              Cancel
            </button>
          )}
        </div>
      </div>

      <DragDropContext onDragEnd={handleOnDragEnd}>
        <Droppable droppableId="activePlayers">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef}>
              <h3>Active Roster</h3>
              <table className="public-player-table">
                <thead>
                  <tr>
                    {isReordering && <th style={{width: '40px'}}></th>}
                    <th className="col-number">#</th>
                    <th className="col-player">Player</th>
                    <th className="col-song">Song</th>
                    <th className="col-play">Play</th>
                  </tr>
                </thead>
                <tbody>
                  {activePlayers.map((player, index) => (
                    <Draggable key={player.id} draggableId={String(player.id)} index={index} isDragDisabled={!isReordering}>
                      {(provided) => (
                        <tr 
                          ref={provided.innerRef} 
                          {...provided.draggableProps} 
                          className={currentlyPlayingUri === player.song_uri ? 'player-row playing' : 'player-row'}
                        >
                          {isReordering && <td {...provided.dragHandleProps} className="draggable-handle">☰</td>}
                          <td>{player.player_number}</td>
                          <td>{`${player.first_name} ${player.last_name ? player.last_name.charAt(0) + '.' : ''}`}</td>
                          <td><strong>{truncate(player.song_title, 15)}</strong></td>
                          <td>
                            <PlayButton 
                              songUri={player.song_uri} 
                              startTimeMs={player.song_start_time}
                              accessTokenOverride={freshToken}
                              onPlayStateChange={(isPlaying) => setCurrentlyPlayingUri(isPlaying ? player.song_uri : null)}
                            />
                          </td>
                        </tr>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </tbody>
              </table>
            </div>
          )}
        </Droppable>
        {/* ... (Inactive players section is unchanged) ... */}
      </DragDropContext>
    </div>
  )
}