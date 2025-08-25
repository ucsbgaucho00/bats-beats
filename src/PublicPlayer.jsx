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

        // --- THIS IS THE CRITICAL FIX ---
        // Step 1: Directly query the 'teams' table using the public share ID
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
            showWarmupButton: team.profiles.license === 'Home Run' && !!team.warmup_playlist_id,
        }
        setTeamData(initialData);

        // Step 2: Use the teamId to fetch all players
        const { data: allPlayers, error: playersError } = await supabase
          .from('players')
          .select('*')
          .eq('team_id', initialData.teamId);
        if (playersError) throw playersError;
        
        setActivePlayers(allPlayers.filter(p => p.is_active).sort((a, b) => a.batting_order - b.batting_order));
        setInactivePlayers(allPlayers.filter(p => !p.is_active));

        // Step 3: Refresh the Spotify token
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

  // ... (The rest of the component's functions and JSX are unchanged)
}