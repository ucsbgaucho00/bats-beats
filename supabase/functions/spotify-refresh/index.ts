// supabase/functions/spotify-refresh/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { owner_user_id } = await req.json()
    if (!owner_user_id) throw new Error('Missing owner_user_id')

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SB_SERVICE_ROLE_KEY')!,
      { db: { schema: 'bats_and_beats' } }
    )

    // 1. Get the owner's refresh token
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('spotify_refresh_token')
      .eq('id', owner_user_id)
      .single()
    if (profileError || !profile?.spotify_refresh_token) throw new Error('Refresh token not found.')

    // 2. Exchange it for a new access token
    const clientId = Deno.env.get('SPOTIFY_CLIENT_ID')!
    const clientSecret = Deno.env.get('SPOTIFY_CLIENT_SECRET')!

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(`${clientId}:${clientSecret}`),
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: profile.spotify_refresh_token,
      }),
    })

    if (!response.ok) throw new Error('Failed to refresh Spotify token.')
    const newTokens = await response.json()

    // 3. Save the new access token to the database
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ spotify_access_token: newTokens.access_token })
      .eq('id', owner_user_id)
    if (updateError) throw updateError

    // 4. Return the new access token to the front-end
    return new Response(JSON.stringify({ new_access_token: newTokens.access_token }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})