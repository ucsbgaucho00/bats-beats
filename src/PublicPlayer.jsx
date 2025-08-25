// src/PublicPlayer.jsx

import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from './supabaseClient'
import PlayButton from './PlayButton'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'

// --- NEW: Helper function to truncate text ---
const truncate = (text, length) => {
  if (!text) return '';
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
};

export default function PublicPlayer() {
  // ... (all state and handler functions are the same)

  if (loading) return <div>Loading player...</div>
  if (error) return <div>Error: {error}</div>

  const showInactiveSection = isReordering || inactivePlayers.length > 0;

  return (
    <div>
      <h1>{teamData?.teamName}</h1>
      <p>Walk-up songs</p>
      
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
              {/* --- NEW: Added CSS class to the table --- */}
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
                            {/* --- NEW: Truncate the song title --- */}
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
            {/* ... (inactive players section is the same) ... */}
          </Droppable>
        )}
      </DragDropContext>
    </div>
  )
}