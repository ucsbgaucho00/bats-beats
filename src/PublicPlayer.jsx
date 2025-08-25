// src/PublicPlayer.jsx

import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from './supabaseClient'
import PlayButton from './PlayButton'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'

export default function PublicPlayer() {
  const { shareId } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [teamData, setTeamData] = useState(null)
  const [freshToken, setFreshToken] = useState(null)
  const [isReordering, setIsReordering] = useState(false)
  
  // --- NEW: Separate state for active and inactive players ---
  const [activePlayers, setActivePlayers] = useState([])
  const [inactivePlayers, setInactivePlayers] = useState([])

  useEffect(() => {
    const fetchAndRefreshToken = async () => {
      if (!shareId) return
      try {
        setLoading(true)
        const { data: initialData } = await supabase.functions.invoke('get-public-team-data', { body: { shareId } })
        const { data: tokenData } = await supabase.functions.invoke('spotify-refresh', { body: { owner_user_id: initialData.ownerUserId } })
        
        setTeamData(initialData)
        
        // --- NEW: Filter the full player list into two separate states ---
        const allPlayers = initialData.players || [];
        setActivePlayers(allPlayers.filter(p => p.is_active).sort((a, b) => a.batting_order - b.batting_order))
        setInactivePlayers(allPlayers.filter(p => !p.is_active))
        
        setFreshToken(tokenData.new_access_token)
      } catch (err) {
        setError(err.message || 'Could not load team data.')
      } finally {
        setLoading(false)
      }
    }
    fetchAndRefreshToken()
  }, [shareId])

  // --- NEW: handleOnDragEnd now manages two lists ---
  const handleOnDragEnd = (result) => {
    const { source, destination } = result;
    if (!destination) return; // Dropped outside of any droppable area

    // Determine the source and destination lists and state setters
    const sourceList = source.droppableId === 'activePlayers' ? activePlayers : inactivePlayers;
    const destList = destination.droppableId === 'activePlayers' ? activePlayers : inactivePlayers;
    const sourceSetter = source.droppableId === 'activePlayers' ? setActivePlayers : setInactivePlayers;
    const destSetter = destination.droppableId === 'activePlayers' ? setActivePlayers : setInactivePlayers;

    if (source.droppableId === destination.droppableId) {
      // Reordering within the same list
      const items = Array.from(sourceList);
      const [reorderedItem] = items.splice(source.index, 1);
      items.splice(destination.index, 0, reorderedItem);
      sourceSetter(items);
    } else {
      // Moving from one list to another
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
      // Call the function with both the active and inactive player lists
      const { error } = await supabase.functions.invoke('update-batting-order', {
        body: { activePlayers, inactivePlayers }
      })
      if (error) throw error
      
      alert('Lineup saved successfully!')
      setIsReordering(false) // Exit reorder mode on success
    } catch (error) {
      alert('Error saving lineup: ' + error.message)
    }
  }

  if (loading) return <div>Loading player...</div>
  if (error) return <div>Error: {error}</div>

  // --- NEW: Style for the droppable areas ---
  const droppableStyle = (isDraggingOver) => ({
    border: isReordering ? (isDraggingOver ? '2px dashed lightblue' : '2px dashed #ccc') : 'none',
    borderRadius: '5px',
    padding: isReordering ? '10px' : '0',
    margin: '20px 0',
    transition: 'border 0.2s ease-in-out, padding 0.2s ease-in-out',
  });

  return (
    <div>
      <h1>{teamData?.teamName}</h1>
      <p>Walk-up songs</p>
      
      <div style={{ marginBottom: '20px' }}>
        <button onClick={() => setIsReordering(!isReordering)}>
          {isReordering ? 'Cancel Reorder' : 'Reorder Lineup'}
        </button>
        {isReordering && (
          <button onClick={handleSaveOrder} style={{ marginLeft: '10px', backgroundColor: 'lightgreen' }}>
            Save Changes
          </button>
        )}
      </div>
hands
      <DragDropContext onDragEnd={handleOnDragEnd}>
        {/* --- ACTIVE PLAYERS AREA --- */}
        <Droppable droppableId="activePlayers">
          {(provided, snapshot) => (
            <div {...provided.droppableProps} ref={provided.innerRef} style={droppableStyle(snapshot.isDraggingOver)}>
              <h3>Active Roster</h3>
              <table>
                <thead>
                  <tr>
                    {isReordering && <th style={{width: '20px'}}></th>}
                    <th>#</th>
                    <th>Player</th>
                    <th>Song</th>
                    <th>Play</th>
                  </tr>
                </thead>
                <tbody>
                  {activePlayers.map((player, index) => (
                    <Draggable key={player.id} draggableId={String(player.id)} index={index} isDragDisabled={!isReordering}>
                      {(provided) => (
                        <tr ref={provided.innerRef} {...provided.draggableProps} style={provided.draggableProps.style}>
                          {isReordering && <td {...provided.dragHandleProps}><span>☰</span></td>}
                          <td>{player.player_number}</td>
                          <td>{`${player.first_name} ${player.last_name ? player.last_name.charAt(0) + '.' : ''}`}</td>
                          <td>
                            {player.song_title ? (<div><strong>{player.song_title}</strong><br /><span>{player.song_artist}</span></div>) : 'N/A'}
                          </td>
                          <td><PlayButton songUri={player.song_uri} startTimeMs={player.song_start_time} accessTokenOverride={freshToken} /></td>
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

        {/* --- INACTIVE PLAYERS AREA --- */}
        <Droppable droppableId="inactivePlayers">
          {(provided, snapshot) => (
            <div {...provided.droppableProps} ref={provided.innerRef} style={droppableStyle(snapshot.isDraggingOver)}>
              <h3>Inactive Players</h3>
              {isReordering ? (
                <div style={{ minHeight: '100px', display: 'flex', flexWrap: 'wrap', gap: '10px', padding: '10px' }}>
                  {inactivePlayers.map((player, index) => (
                    <Draggable key={player.id} draggableId={String(player.id)} index={index}>
                      {(provided) => (
                        <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} style={{...provided.draggableProps.style, padding: '8px', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: '#f0f0f0'}}>
                          {player.first_name} {player.last_name}
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              ) : (
                <p>Click "Reorder Lineup" to manage inactive players.</p>
              )}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  )
}