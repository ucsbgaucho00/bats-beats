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
      console.log('--- Starting fetchAllData ---');
      if (!shareId) {
        console.error('No shareId found in URL.');
        setError('No share ID provided in the URL.');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        
        console.log(`Step 1: Calling get-public-team-data with shareId: ${shareId}`);
        const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-public-team-data?shareId=${shareId}`;
        const response = await fetch(functionUrl, {
          headers: { 'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY }
        });

        if (!response.ok) {
          const errorBody = await response.json();
          console.error('Error from get-public-team-data function:', errorBody);
          throw new Error(errorBody.error || 'Failed to fetch team data');
        }
        const initialData = await response.json();
        console.log('Step 1 SUCCESS. Received initialData:', initialData);
        setTeamData(initialData);

        console.log(`Step 2: Fetching players for teamId: ${initialData.teamId}`);
        const { data: allPlayers, error: playersError } = await supabase
          .from('players')
          .select('*')
          .eq('team_id', initialData.teamId);
        if (playersError) throw playersError;
        console.log('Step 2 SUCCESS. Received allPlayers:', allPlayers);
        
        setActivePlayers(allPlayers.filter(p => p.is_active).sort((a, b) => a.batting_order - b.batting_order));
        setInactivePlayers(allPlayers.filter(p => !p.is_active));
        console.log('Filtered active/inactive players.');

        console.log(`Step 3: Refreshing token for ownerUserId: ${initialData.ownerUserId}`);
        const { data: tokenData, error: refreshError } = await supabase.functions.invoke('spotify-refresh', { body: { owner_user_id: initialData.ownerUserId } });
        if (refreshError) throw refreshError;
        console.log('Step 3 SUCCESS. Received new token.');
        setFreshToken(tokenData.new_access_token);

      } catch (err) {
        console.error('!!! CATCH BLOCK ERROR !!!:', err.message);
        setError(err.message || 'Could not load team data.');
      } finally {
        console.log('--- Finished fetchAllData, setting loading to false ---');
        setLoading(false);
      }
    };
    fetchAllData();
  }, [shareId]);

  // ... (rest of the component is the same)
}