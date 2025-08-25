// src/PublicPlayer.jsx

import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from './supabaseClient'
import PlayButton from './PlayButton'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'

const truncate = (text, length) => { /* ... */ };

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
      if (!shareId) return
      try {
        setLoading(true);

        // --- THIS IS THE CRITICAL FIX ---
        // We use a direct fetch call to make a GET request to our function
        const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-public-team-data?shareId=${shareId}`;
        const response = await fetch(functionUrl, {
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          }
        });
        if (!response.ok) {
          const errorBody = await response.json();
          throw new Error(errorBody.error || 'Failed to fetch team data');
        }
        const initialData = await response.json();
        setTeamData(initialData);
        // --- END OF CRITICAL FIX ---

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

  // ... (rest of the component is the same)
}