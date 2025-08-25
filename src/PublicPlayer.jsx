// src/PublicPlayer.jsx

import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from './supabaseClient'
import PlayButton from './PlayButton'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'

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

  useEffect(() => {
    const fetchAllData = async () => {
      if (!shareId) return;
      try {
        setLoading(true);
        const { data: team, error: teamError } = await supabase
          .from('teams')
          .select('id, team_name, user_id, warmup_playlist_id, profiles(license)')
          .eq('public_share_id', shareId)
          .single();
        if (teamError) throw teamError;
        
        const initialData = {
            teamName: team.team_name,
            teamId: team.id,
            ownerUserId: team.user_id,
            showWarmupButton: team.profiles?.license === 'Home Run' && !!team.warmup_playlist_id,
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
  }, [shareId]);

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
      const { error } = await supabase.functions.invoke('update-batting-order', {
        body: { activePlayers, inactivePlayers }
      })
      if (error) throw error
      alert('Lineup saved successfully!')
      setIsReordering(false)
    } catch (error) {
      alert('Error saving lineup: ' + error.message)
    }
  }

  if (loading) return <div>Loading player...</div>;
  if (error || !teamData) return <div>Error: {error || 'Could not load team data.'}</div>;

  const droppableStyle = (isDraggingOver) => ({
    border: isReordering ? (isDraggingOver ? '2px dashed lightblue' : '2px dashed #ccc') : 'none',
    borderRadius: '5px',
    padding: isReordering ? '10px' : '0',
    margin: '20px 0',
    transition: 'border 0.2s ease-in-out, padding 0.2s ease-in-out',
  });

  const showInactiveSection = isReordering || inactivePlayers.length > 0;

  return (
    <div>
      <h1>{teamData.teamName}</h1>
      <p>Walk-up songs</p>
      
      {teamData.showWarmupButton && (
        <div style={{ margin: '20px 0' }}>
          <Link to={`/public/${shareId}/warmup`}>
            <button style={{fontSize: '1.1em', padding: '10px'}}>▶ Play Warmup Mix</button>
          </Link>
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <button onClick={() => setIsReordering(!isReordering)}>{isReordering ? 'Cancel Editing' : 'Edit Lineup'}</button>
        {isReordering && (
          <button onClick={handleSaveOrder} style={{ marginLeft: '10px', backgroundColor: 'lightgreen' }}>Save Changes</button>
        )}
      </div>

      <DragDropContext onDragEnd={handleOnDragEnd}>
        <Droppable droppableId="activePlayers">
          {(provided, snapshot) => (
            <div {...provided.droppableProps} ref={provided.innerRef} style={droppableStyle(snapshot.isDraggingOver)}>
              <h3>Active Roster</h3>
              <table className="public-player-table">
                <thead>
                  <tr>
                    {isReordering && <th style={{width: '20px'}}></th>}
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
                        <tr ref={provided.innerRef} {...provided.draggableProps} style={provided.draggableProps.style}>
                          {isReordering && <td {...provided.dragHandleProps}><span>☰</span></td>}
                          <td className="col-number">{player.player_number}</td>
                          <td className="col-player">{`${player.first_name} ${player.last_name ? player.last_name.charAt(0) + '.' : ''}`}</td>
                          <td className="col-song">
                            <strong>{truncate(player.song_title, 15)}</strong>
                          </td>
                          <td className="col-play">
                            <PlayButton songUri={player.song_uri} startTimeMs={player.song_start_time} accessTokenOverride={freshToken} />
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

        {showInactiveSection && (
          <Droppable droppableId="inactivePlayers">
            {(provided, snapshot) => (
              <div {...provided.droppableProps} ref={provided.innerRef} style={droppableStyle(snapshot.isDraggingOver)}>
                <h3>Inactive Players</h3>
                {isReordering ? (
                  <div style={{ minHeight: '100px', display: 'flex', flexWrap: 'wrap', gap: '10px', padding: '10px' }}>
                    {inactivePlayers.map((player, index) => (
                      <Draggable key={player.id} draggableId={String(player.id)} index={index}>
                        {(provided) => (
                          <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} style={{...provided.draggableProps.style, padding: '8px', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: '#e0e0e0'}}>
                            {player.first_name} {player.last_name}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                ) : (
                  <table className="public-player-table">
                    <tbody>
                      {inactivePlayers.map(player => (
                        <tr key={player.id} style={{ opacity: 0.5 }}>
                          <td className="col-number">{player.player_number}</td>
                          <td className="col-player">{`${player.first_name} ${player.last_name ? player.last_name.charAt(0) + '.' : ''}`}</td>
                          <td className="col-song"><strong>{truncate(player.song_title, 15)}</strong></td>
                          <td className="col-play"><button className="play-pause-btn" disabled>▶</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </Droppable>
        )}
      </DragDropContext>
    </div>
  )
}