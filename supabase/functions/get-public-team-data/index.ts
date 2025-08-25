// supabase/functions/get-public-team-data/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'apikey, content-type, authorization, x-client-info',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { shareId } = await req.json()
    if (!shareId) throw new Error('Missing shareId')

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SB_SERVICE_ROLE_KEY')!,
      { db: { schema: 'public' } }
    )

    const { data: team, error: teamError } = await supabaseAdmin
      .from('teams')
      .select('id, team_name, user_id')
      .eq('public_share_id', shareId)
      .single()
    if (teamError) throw new Error('Team not found.')

    // --- THIS IS THE CORRECTED LOGIC ---
    // Fetch only the active players and all their details
    const { data: players, error: playersError } = await supabaseAdmin
  .from('players')
  .select('id, player_number, first_name, last_name, song_uri, song_start_time, song_title, song_artist, is_active, batting_order') // Also select is_active and batting_order
  .eq('team_id', team.id)
  // No is_active filter, get all players
  .order('batting_order')
    if (playersError) throw playersError

    const publicData = {
      teamName: team.team_name,
      players: players, // Send the list of active players
      ownerUserId: team.user_id,
    }

    return new Response(JSON.stringify(publicData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})