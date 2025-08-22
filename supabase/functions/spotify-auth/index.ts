// supabase/functions/spotify-auth/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SCOPES = 'streaming user-read-email user-read-private playlist-read-private playlist-read-collaborative'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Create a correctly configured admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SB_SERVICE_ROLE_KEY')!,
      { db: { schema: 'public' } }
    )

    // 2. Securely get the user from the auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Authorization header.');
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(jwt);
    if (userError) throw userError
    if (!user) throw new Error('User not authenticated')

    // 3. Generate and store the state token
    const state = crypto.randomUUID()
    const { error: insertError } = await supabaseAdmin
      .from('oauth_state_storage')
      .insert({ state_token: state, user_id: user.id })
    if (insertError) throw insertError

    // 4. Construct the Spotify URL
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/spotify-callback`
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: Deno.env.get('SPOTIFY_CLIENT_ID')!,
      scope: SCOPES,
      redirect_uri: redirectUri,
      state: state,
    })
    const spotifyAuthUrl = `https://accounts.spotify.com/authorize?${params.toString()}`

    return new Response(JSON.stringify({ url: spotifyAuthUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('CRASH in spotify-auth:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})