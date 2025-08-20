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

    // Use the ADMIN client to bypass RLS and find the team
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SB_SERVICE_ROLE_KEY')!,
      { db: { schema: 'bats_and_beats' } }
    )

    // 1. Find the team using the public share ID
    const { data: team, error: teamError } = await supabaseAdmin
      .from('teams')
      .select('id, team_name, user_id')
      .eq('public_share_id', shareId)
      .single()
    if (teamError) throw new Error('Team not found.')

    // 2. Get the players for that team
    const { data: players, error: playersError } = await supabaseAdmin
      .from('players')
      .select('id, player_number, first_name, last_name, song_uri, song_start_time')
      .eq('team_id', team.id)
      .eq('is_active', true) // Only fetch active players
      .order('batting_order')
    if (playersError) throw playersError

    // 3. IMPORTANT: Get the team owner's Spotify access token
    const { data: ownerProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('spotify_access_token')
      .eq('id', team.user_id)
      .single()
    if (profileError || !ownerProfile?.spotify_access_token) throw new Error('Team owner has not connected their Spotify account.')

    // 4. Return all the necessary public data in one payload
    const publicData = {
      teamName: team.team_name,
      players: players,
      ownerSpotifyToken: ownerProfile.spotify_access_token,
    }

    return new Response(JSON.stringify(publicData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 404, // Use 404 for not found errors
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})