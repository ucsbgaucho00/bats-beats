// src/PublicPlayer.jsx

import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from './supabaseClient'
import PlayButton from './PlayButton'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import AudioUnlocker from './AudioUnlocker'

const truncate = (text, length) => {
  if (!text) return '';
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
};

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
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);

  useEffect(() => {
    const fetchAllData = async () => {
      if (!isAudioUnlocked || !shareId) return;

      try {
        setLoading(true);
        const { data: team, error: teamError } = await supabase
          .rpc('get_public_team_details', { share_id_in: shareId })
          .single();
        if (teamError) throw teamError;
        
        const initialData = {
            teamName: team.team_name,
            teamId: team.team_id,
            ownerUserId: team.owner_user_id,
            showWarmupButton: team.owner_license === 'Home Run' && !!team.warmup_playlist_id,
        }
        setTeamData(initialData);

        const { data: allPlayers, error: playersError } = await supabase
          .from('players')
          .select('*')
          .eq('team_id', initialData.teamId);
        if (playersError) throw playersError;
        
        setActivePlayers(allPlayers.filter(p => p.is_active).sort((a, b) => a.batting_order - b.batting_order));
        setInactivePlayers(allPlayers.filter(p => !p.is_active));

        const { data: tokenData, error: refreshError } = await supabase.functions.invoke('spotify-refresh', { body: { owner_user_id: initialData.ownerUserId } });
        if (refreshError) throw refreshError;
        setFreshToken(tokenData.new_access_token);

      } catch (err) {
        setError(err.message || 'Could not load team data.');
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, [shareId, isAudioUnlocked]);

  const handleOnDragEnd = (result) => {
    const { source, destination } = result;
    if (!destination) return;
    const sourceList = source.droppableId === 'activePlayers' ? activePlayers : inactivePlayers;
    const destList = destination.droppableId === 'activePlayers' ? activePlayers : inactivePlayers;
    const sourceSetter = source.droppableId === 'activePlayers' ? setActivePlayers : setInactivePlayers;
    const destSetter = destination.droppableId === 'activePlayers' ? setActivePlayers : setInactivePlayers;
    if (source.droppableId === destination.droppableId) {
      const items = Array.from(sourceList);
      const [reorderedItem] = items.splice(source.index, 1);
      items.splice(destination.index, 0, reorderedItem);
      sourceSetter(items);
    } else {
      const sourceItems = Array.from(sourceList);
      const destItems = Array.from(destList);
      const [movedItem] = sourceItems.splice(source.index, 1);
      destItems.splice(destination.index, 0, movedItem);
      sourceSetter(sourceItems);
      destSetter(destItems);
    }
  }

  const handleSaveOrder = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.functions.invoke('update-batting-order', {
        body: { activePlayers, inactivePlayers }
      })
      if (error) throw error
      alert('Lineup saved successfully!')
      setIsReordering(false)
    } catch (error) {
      alert('Error saving lineup: ' + error.message)
    } finally {
      setLoading(false);
    }
  }

  if (!isAudioUnlocked) {
    return <AudioUnlocker onUnlock={() => setIsAudioUnlocked(true)} />;
  }
  if (loading) return <div className="page-content"><p>Loading player...</p></div>;
  if (error || !teamData) return <div className="page-content"><p>Error: {error || 'Could not load team data.'}</p></div>;

  const droppableStyle = (isDraggingOver) => ({
    border: isReordering ? (isDraggingOver ? '2px dashed lightblue' : '2px dashed #ccc') : 'none',
    borderRadius: '8px',
    padding: isReordering ? '10px' : '0',
    margin: '20px 0',
    transition: 'all 0.2s ease-in-out',
  });

  const showInactiveSection = isReordering || inactivePlayers.length > 0;

  return (
    <div className="page-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <h1 style={{margin: 0}}>{teamData.teamName}</h1>
        <div style={{display: 'flex', gap: '10px'}}>
          {teamData.showWarmupButton && (
            <Link to={`/public/${shareId}/warmup`}>
              <button className="btn-primary">▶ Play Warmup</button>
            </Link>
          )}
          <button onClick={() => {
            if (isReordering) {
              handleSaveOrder();
            } else {
              setIsReordering(true);
            }
          }} className={isReordering ? 'btn-primary' : 'btn-secondary'} style={isReordering ? {backgroundColor: 'var(--mlb-red)', borderColor: 'var(--mlb-red)'} : {}}>
            {isReordering ? 'Save Changes' : 'Edit Lineup'}
          </button>
          {isReordering && (
            <button onClick={() => setIsReordering(false)} className="btn-secondary">
              Cancel
            </button>
          )}
        </div>
      </div>

      <DragDropContext onDragEnd={handleOnDragEnd}>
        <div className="card" style={{marginTop: '20px'}}>
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
            <Droppable droppableId="activePlayers">
              {(provided) => (
                <tbody {...provided.droppableProps} ref={provided.innerRef}>
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
              )}
            </Droppable>
          </table>
        </div>

        {showInactiveSection && (
          <div className="card">
            <h3>Inactive Players</h3>
            <Droppable droppableId="inactivePlayers">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} style={{minHeight: '100px', padding: '10px'}}>
                  {inactivePlayers.map((player, index) => (
                    <Draggable key={player.id} draggableId={String(player.id)} index={index} isDragDisabled={!isReordering}>
                      {(provided) => (
                        <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} style={{padding: '8px', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: '#f0f0f0', marginBottom: '8px'}}>
                          {player.first_name} {player.last_name}
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        )}
      </DragDropContext>
    </div>
  )
}