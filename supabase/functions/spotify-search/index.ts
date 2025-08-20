// supabase/functions/spotify-search/index.ts

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
    const { query } = await req.json()
    if (!query) {
      return new Response(JSON.stringify([]), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 1. Get the user's access token from the database
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SB_SERVICE_ROLE_KEY')!,
      { db: { schema: 'bats_and_beats' } }
    )
    const authHeader = req.headers.get('Authorization')!
    const { data: { user } } = await createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } }).auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('spotify_access_token')
      .eq('id', user.id)
      .single()
    if (profileError || !profile?.spotify_access_token) throw new Error('Spotify token not found for user.')

    // 2. Call the Spotify Search API
    const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=5`
    const spotifyResponse = await fetch(searchUrl, {
      headers: {
        'Authorization': `Bearer ${profile.spotify_access_token}`
      }
    })

    if (!spotifyResponse.ok) {
      // If token is expired, this will fail. We'll handle refreshing it later.
      throw new Error('Spotify API request failed.')
    }

    const searchData = await spotifyResponse.json()
    
    // 3. Format the results into a clean array
    const results = searchData.tracks.items.map((track: any) => ({
      uri: track.uri,
      title: track.name,
      artist: track.artists.map((artist: any) => artist.name).join(', '),
      thumbnail: track.album.images[track.album.images.length - 1]?.url, // Get the smallest thumbnail
    }))

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})