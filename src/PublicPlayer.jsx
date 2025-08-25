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
        
        // Step 1: Call our database function
        const { data: team, error: teamError } = await supabase
          .rpc('get_public_team_details', { share_id_in: shareId })
          .single();
        if (teamError) throw teamError;

        // --- THIS IS THE CRITICAL DEBUGGING STEP ---
        console.log('--- Data received from RPC function ---', team);
        // -----------------------------------------
        
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
  }, [shareId]);

  const handleOnDragEnd = (result) => { /* ... */ }
  const handleSaveOrder = async () => { /* ... */ }

  if (loading) return <div>Loading player...</div>;
  if (error || !teamData) return <div>Error: {error || 'Could not load team data.'}</div>;

  const droppableStyle = (isDraggingOver) => ({ /* ... */ });
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
        {/* ... (Rest of the JSX is unchanged) ... */}
      </DragDropContext>
    </div>
  )
}