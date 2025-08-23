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
    // ... (fetchAndRefreshToken is the same, but it now populates both lists)
    const fetchAndRefreshToken = async () => {
      try {
        setLoading(true)
        const { data: initialData } = await supabase.functions.invoke('get-public-team-data', { body: { shareId } })
        const { data: tokenData } = await supabase.functions.invoke('spotify-refresh', { body: { owner_user_id: initialData.ownerUserId } })
        
        setTeamData(initialData)
        // We need to fetch ALL players now, not just active ones
        const { data: allPlayers } = await supabase.from('players').select('*').eq('team_id', initialData.teamId) // Assuming teamId is returned
        setActivePlayers(allPlayers.filter(p => p.is_active).sort((a,b) => a.batting_order - b.batting_order))
        setInactivePlayers(allPlayers.filter(p => !p.is_active))
        
        setFreshToken(tokenData.new_access_token)
      } catch (err) { /* ... */ } finally { setLoading(false) }
    }
    // We need to update the get-public-team-data function to return teamId
    fetchAndRefreshToken()
  }, [shareId])

  // --- NEW: handleOnDragEnd now manages two lists ---
  const handleOnDragEnd = (result) => {
    const { source, destination } = result;
    if (!destination) return;

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

  // --- NEW: Function to save the new order ---
  const handleSaveOrder = async () => {
    try {
      const { error } = await supabase.functions.invoke('update-player-order', {
        body: { activePlayers, inactivePlayers }
      })
      if (error) throw error
      alert('Lineup saved successfully!')
      setIsReordering(false)
    } catch (error) {
      alert('Error saving lineup: ' + error.message)
    }
  }

  if (loading) return <div>Loading player...</div>
  if (error) return <div>Error: {error}</div>

  const droppableStyle = (isDraggingOver) => ({
    border: isDraggingOver ? '2px dashed lightblue' : '2px dashed #ccc',
    borderRadius: '5px',
    padding: '10px',
    margin: '20px 0',
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
            Save New Order
          </button>
        )}
      </div>

      <DragDropContext onDragEnd={handleOnDragEnd}>
        {/* --- ACTIVE PLAYERS AREA --- */}
        <Droppable droppableId="activePlayers">
          {(provided, snapshot) => (
            <div {...provided.droppableProps} ref={provided.innerRef} style={droppableStyle(snapshot.isDraggingOver)}>
              <h3>Active Roster</h3>
              <table>
                {/* ... (table header) ... */}
                <tbody>
                  {activePlayers.map((player, index) => (
                    <Draggable key={player.id} draggableId={String(player.id)} index={index} isDragDisabled={!isReordering}>
                      {(provided) => (
                        <tr ref={provided.innerRef} {...provided.draggableProps} style={{...provided.draggableProps.style, backgroundColor: 'white'}}>
                          {/* ... (player tds, with drag handle) ... */}
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
        {isReordering && (
          <Droppable droppableId="inactivePlayers">
            {(provided, snapshot) => (
              <div {...provided.droppableProps} ref={provided.innerRef} style={droppableStyle(snapshot.isDraggingOver)}>
                <h3>Inactive Players</h3>
                <div style={{ minHeight: '100px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {inactivePlayers.map((player, index) => (
                    <Draggable key={player.id} draggableId={String(player.id)} index={index}>
                      {(provided) => (
                        <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} style={{...provided.draggableProps.style, padding: '8px', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: 'lightgray'}}>
                          {player.first_name} {player.last_name}
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              </div>
            )}
          </Droppable>
        )}
      </DragDropContext>
    </div>
  )
}