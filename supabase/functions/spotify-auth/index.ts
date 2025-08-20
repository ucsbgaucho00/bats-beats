// supabase/functions/spotify-auth/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SCOPES = [
  'streaming', 'user-read-email', 'user-read-private',
  'playlist-read-private', 'playlist-read-collaborative',
].join(' ')

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // 1. Verify user is logged in
    const supabaseUserClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )
    const { data: { user } } = await supabaseUserClient.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // 2. Generate state
    const state = crypto.randomUUID()

    // 3. Use the ADMIN client to insert the state token
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SB_SERVICE_ROLE_KEY')!,
      { db: { schema: 'bats_and_beats' } }
    )
    const { error: insertError } = await supabaseAdmin
      .from('oauth_state_storage')
      .insert({ state_token: state, user_id: user.id })
    if (insertError) throw insertError

    // 4. Redirect to Spotify
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/spotify-callback`
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: Deno.env.get('SPOTIFY_CLIENT_ID')!,
      scope: SCOPES,
      redirect_uri: redirectUri,
      state: state,
    })
    
    // --- THIS IS THE CORRECTED LINE ---
    const spotifyAuthUrl = `https://accounts.spotify.com/authorize?${params.toString()}`

    return new Response(JSON.stringify({ url: spotifyAuthUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('CRASH in spotify-auth:', JSON.stringify(error, null, 2))
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})