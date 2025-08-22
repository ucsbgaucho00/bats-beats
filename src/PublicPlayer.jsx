// src/PublicPlayer.jsx

import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from './supabaseClient'
import PlayButton from './PlayButton'
// --- NEW: Import the drag-and-drop components ---
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'

export default function PublicPlayer() {
  const { shareId } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [teamData, setTeamData] = useState(null)
  const [freshToken, setFreshToken] = useState(null)
  
  // --- NEW: State to manage reordering mode ---
  const [isReordering, setIsReordering] = useState(false)
  // --- NEW: State to hold the list of players that we can reorder ---
  const [players, setPlayers] = useState([])

  useEffect(() => {
    const fetchAndRefreshToken = async () => {
      if (!shareId) { /* ... */ return }
      try {
        setLoading(true)
        const { data: initialData, error: functionError } = await supabase.functions.invoke('get-public-team-data', { body: { shareId } })
        if (functionError) throw functionError
        
        const { data: tokenData, error: refreshError } = await supabase.functions.invoke('spotify-refresh', { body: { owner_user_id: initialData.ownerUserId } })
        if (refreshError) throw refreshError
        
        setTeamData(initialData)
        setPlayers(initialData.players) // Initialize our re-orderable player list
        setFreshToken(tokenData.new_access_token)
      } catch (err) {
        setError(err.message || 'Could not load team data.')
      } finally {
        setLoading(false)
      }
    }
    fetchAndRefreshToken()
  }, [shareId])

  // --- NEW: Function to handle the end of a drag operation ---
  const handleOnDragEnd = (result) => {
    if (!result.destination) return; // Dropped outside the list

    const items = Array.from(players);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setPlayers(items); // Update the local state with the new order
  }

  if (loading) return <div>Loading player...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <div>
      <h1>{teamData.teamName}</h1>
      <p>Walk-up songs</p>
      
      {/* --- NEW: Reorder and Save buttons --- */}
      <div style={{ marginBottom: '20px' }}>
        <button onClick={() => setIsReordering(!isReordering)}>
          {isReordering ? 'Cancel Reorder' : 'Reorder Lineup'}
        </button>
        {isReordering && (
          <button style={{ marginLeft: '10px', backgroundColor: 'lightgreen' }}>
            Save New Order
          </button>
        )}
      </div>

      {/* --- NEW: DragDropContext wraps the entire draggable area --- */}
      <DragDropContext onDragEnd={handleOnDragEnd}>
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
          {/* --- NEW: Droppable area for our players --- */}
          <Droppable droppableId="players">
            {(provided) => (
              <tbody {...provided.droppableProps} ref={provided.innerRef}>
                {players.map((player, index) => (
                  // --- NEW: Draggable item for each player ---
                  <Draggable key={player.id} draggableId={String(player.id)} index={index} isDragDisabled={!isReordering}>
                    {(provided) => (
                      <tr
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                      >
                        {isReordering && (
                          <td {...provided.dragHandleProps}>
                            {/* This is the drag handle */}
                            <span>☰</span>
                          </td>
                        )}
                        <td>{player.player_number}</td>
                        <td>{`${player.first_name} ${player.last_name ? player.last_name.charAt(0) + '.' : ''}`}</td>
                        <td>
                          {player.song_title ? (
                            <div><strong>{player.song_title}</strong><br /><span style={{fontSize: '0.9em', color: '#555'}}>{player.song_artist}</span></div>
                          ) : 'N/A'}
                        </td>
                        <td>
                          <PlayButton 
                            songUri={player.song_uri} 
                            startTimeMs={player.song_start_time}
                            accessTokenOverride={freshToken}
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
      </DragDropContext>
    </div>
  )
}