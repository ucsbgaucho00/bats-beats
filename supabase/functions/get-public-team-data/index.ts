// supabase/functions/get-public-team-data/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ... (corsHeaders are the same)

serve(async (req) => {
  // ... (OPTIONS check is the same)
  try {
    const { shareId } = await req.json()
    // ... (supabaseAdmin creation is the same)

    const { data: team, error: teamError } = await supabaseAdmin
      .from('teams')
      .select('id, team_name, user_id, warmup_playlist_id') // <-- Fetch warmup_playlist_id
      .eq('public_share_id', shareId)
      .single()
    if (teamError) throw new Error('Team not found.')

    const { data: ownerProfile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('license') // <-- Fetch the owner's license type
        .eq('id', team.user_id)
        .single()
    if (profileError) throw new Error('Could not find team owner profile.')

    // ... (player fetch is the same)

    const publicData = {
      teamName: team.team_name,
      teamId: team.id,
      players: players,
      ownerUserId: team.user_id,
      // --- NEW: Send playlist info to the front-end ---
      showWarmupButton: ownerProfile.license === 'Home Run' && !!team.warmup_playlist_id,
    }

    return new Response(JSON.stringify(publicData), { /* ... */ })
  } catch (error) { /* ... */ }
})