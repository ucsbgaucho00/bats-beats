// supabase/functions/spotify-search/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// A helper function to refresh the Spotify token
async function refreshSpotifyToken(refreshToken, supabaseAdmin, userId) {
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
      refresh_token: refreshToken,
    }),
  })

  if (!response.ok) throw new Error('Failed to refresh Spotify token.')
  const newTokens = await response.json()

  // Save the new access token back to the database
  await supabaseAdmin
    .from('profiles')
    .update({ spotify_access_token: newTokens.access_token })
    .eq('id', userId)

  return newTokens.access_token
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

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SB_SERVICE_ROLE_KEY')!,
      { db: { schema: 'public' } }
    )

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Authorization header.');
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseAdmin.auth.getUser(jwt);
    if (!user) throw new Error('User not authenticated')

    let { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('spotify_access_token, spotify_refresh_token')
      .eq('id', user.id)
      .single()
    if (!profile) throw new Error('Profile not found.')

    let accessToken = profile.spotify_access_token;
    
    // Make the initial search request
    const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=5`
    let spotifyResponse = await fetch(searchUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    })

    // If the token is expired (401), refresh it and try again
    if (spotifyResponse.status === 401 && profile.spotify_refresh_token) {
      console.log('Access token expired, refreshing...');
      accessToken = await refreshSpotifyToken(profile.spotify_refresh_token, supabaseAdmin, user.id);
      // Retry the search with the new token
      spotifyResponse = await fetch(searchUrl, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      })
    }

    if (!spotifyResponse.ok) throw new Error('Spotify API request failed after potential refresh.')
    
    const searchData = await spotifyResponse.json()
    const results = searchData.tracks.items.map((track: any) => ({
      uri: track.uri,
      title: track.name,
      artist: track.artists.map((artist: any) => artist.name).join(', '),
      thumbnail: track.album.images[track.album.images.length - 1]?.url,
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