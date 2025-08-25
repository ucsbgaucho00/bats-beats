// src/PublicPlayer.jsx

  // ... (all the state and useEffect logic is the same and is working correctly)

  if (loading) return <div>Loading player...</div>
  
  // --- THIS IS THE CRITICAL FIX ---
  // If there's an error OR if teamData hasn't been set yet after loading, show the error.
  // This prevents the rest of the component from trying to render with null data.
  if (error || !teamData) return <div>Error: {error || 'Could not load team data.'}</div>

  const droppableStyle = (isDraggingOver) => ({ /* ... */ });
  const showInactiveSection = isReordering || inactivePlayers.length > 0;

  return (
    <div>
      {/* Use optional chaining (?.) to safely access properties */}
      <h1>{teamData?.teamName}</h1>
      <p>Walk-up songs</p>
      
      {teamData?.showWarmupButton && (
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

      {/* ... (The rest of the DragDropContext and table JSX is the same) ... */}
    </div>
  )
}