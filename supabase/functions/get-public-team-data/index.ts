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
      .select('id, team_name, user_id, warmup_playlist_id')
      .eq('public_share_id', shareId)
      .single()
    if (teamError) throw new Error('Team not found.')

    const { data: ownerProfile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('license')
        .eq('id', team.user_id)
        .single()
    if (profileError) throw new Error('Could not find team owner profile.')

    // --- THIS IS THE CORRECTED DATA PAYLOAD ---
    // It no longer includes the 'players' array.
    const publicData = {
      teamName: team.team_name,
      teamId: team.id,
      ownerUserId: team.user_id,
      showWarmupButton: ownerProfile.license === 'Home Run' && !!team.warmup_playlist_id,
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