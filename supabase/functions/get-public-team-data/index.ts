// supabase/functions/get-public-team-data/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

// --- THIS IS THE CRITICAL FIX ---
// We must allow the 'apikey' header that the Supabase client sends automatically.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const shareId = url.searchParams.get('shareId')
    if (!shareId) throw new Error('Missing shareId query parameter')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SB_SERVICE_ROLE_KEY')!
    
    const response = await fetch(`${supabaseUrl}/rest/v1/teams?select=id,team_name,user_id,warmup_playlist_id,profiles(license)&public_share_id=eq.${shareId}`, {
      headers: {
        'apikey': Deno.env.get('SUPABASE_ANON_KEY')!,
        'Authorization': `Bearer ${serviceKey}`
      }
    })
    
    if (!response.ok) throw new Error(await response.text())
    const teams = await response.json()
    if (teams.length === 0) throw new Error('Team not found.')
    const team = teams[0]

    const publicData = {
      teamName: team.team_name,
      teamId: team.id,
      ownerUserId: team.user_id,
      showWarmupButton: team.profiles.license === 'Home Run' && !!team.warmup_playlist_id,
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