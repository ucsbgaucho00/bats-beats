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
      { db: { schema: 'bats_and_beats' } }
    )

    const { data: team, error: teamError } = await supabaseAdmin
      .from('teams')
      .select('id, team_name, user_id')
      .eq('public_share_id', shareId)
      .single()
    if (teamError) throw new Error('Team not found.')

    const { data: players, error: playersError } = await supabaseAdmin
      .from('players')
      .select('id, player_number, first_name, last_name, song_uri, song_start_time')
      .eq('team_id', team.id)
      .eq('is_active', true)
      .order('batting_order')
    if (playersError) throw playersError

    // NOTE: We no longer need to fetch the token here, the refresh function handles it.
    
    // --- THIS IS THE CORRECTED DATA PAYLOAD ---
    const publicData = {
      teamName: team.team_name,
      players: players,
      ownerUserId: team.user_id, // This was the missing piece
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