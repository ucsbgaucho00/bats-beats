// supabase/functions/get-playlists-with-refresh/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper function to perform the token refresh
async function refreshSpotifyToken(refreshToken, supabaseAdmin, userId) {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + btoa(`${Deno.env.get('SPOTIFY_CLIENT_ID')!}:${Deno.env.get('SPOTIFY_CLIENT_SECRET')!}`),
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }),
  })
  if (!response.ok) throw new Error('Failed to refresh Spotify token.')
  const newTokens = await response.json()
  await supabaseAdmin.from('profiles').update({ spotify_access_token: newTokens.access_token }).eq('id', userId)
  return newTokens.access_token
}

serve(async (req) => {
  if (req.method === 'OPTIONS') { return new Response('ok', { headers: corsHeaders }) }

  try {
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SB_SERVICE_ROLE_KEY')!, { db: { schema: 'public' } })
    const { data: { user } } = await supabaseAdmin.auth.getUser(req.headers.get('Authorization')!.replace('Bearer ', ''));
    if (!user) throw new Error('User not authenticated')

    let { data: profile } = await supabaseAdmin.from('profiles').select('spotify_access_token, spotify_refresh_token').eq('id', user.id).single()
    if (!profile?.spotify_access_token || !profile.spotify_refresh_token) {
      return new Response(JSON.stringify([]), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    let accessToken = profile.spotify_access_token;
    let spotifyResponse = await fetch('https://api.spotify.com/v1/me/playlists?limit=50', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    })

    if (spotifyResponse.status === 401) {
      accessToken = await refreshSpotifyToken(profile.spotify_refresh_token, supabaseAdmin, user.id);
      spotifyResponse = await fetch('https://api.spotify.com/v1/me/playlists?limit=50', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      })
    }

    if (!spotifyResponse.ok) throw new Error('Failed to fetch Spotify playlists after potential refresh.')
    
    const playlistData = await spotifyResponse.json()
    const playlists = playlistData.items.map((p: any) => ({ id: p.id, name: p.name, uri: p.uri }))
    return new Response(JSON.stringify(playlists), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})