// supabase/functions/get-spotify-playlists/index.ts

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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SB_SERVICE_ROLE_KEY')!,
      { db: { schema: 'public' } }
    )

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header.');
    }
    const jwt = authHeader.replace('Bearer ', '');

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(jwt);
    if (userError) throw userError
    if (!user) throw new Error('User not authenticated')

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('spotify_access_token')
      .eq('id', user.id)
      .single()
    if (profileError) throw profileError

    if (!profile?.spotify_access_token) {
      console.log(`User ${user.id} has not connected Spotify. Returning empty playlist.`);
      return new Response(JSON.stringify([]), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const spotifyResponse = await fetch('https://api.spotify.com/v1/me/playlists?limit=50', {
      headers: { 'Authorization': `Bearer ${profile.spotify_access_token}` }
    })
    if (!spotifyResponse.ok) {
      console.error("Spotify API Error:", await spotifyResponse.text());
      return new Response(JSON.stringify([]), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const playlistData = await spotifyResponse.json()
    const playlists = playlistData.items.map((p: any) => ({ id: p.id, name: p.name, uri: p.uri }))

    return new Response(JSON.stringify(playlists), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('CRASH in get-spotify-playlists:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})