// supabase/functions/get-spotify-playlists/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const supabaseUserClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization')! } } })
  const { data: { user } } = await supabaseUserClient.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data: profile } = await createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SB_SERVICE_ROLE_KEY')!).from('profiles').select('spotify_access_token').eq('id', user.id).single()
  if (!profile?.spotify_access_token) throw new Error('Spotify token not found.')

  const spotifyResponse = await fetch('https://api.spotify.com/v1/me/playlists?limit=50', { headers: { 'Authorization': `Bearer ${profile.spotify_access_token}` } })
  if (!spotifyResponse.ok) throw new Error('Failed to fetch Spotify playlists.')

  const playlistData = await spotifyResponse.json()
  const playlists = playlistData.items.map((p: any) => ({ id: p.id, name: p.name, uri: p.uri }))

  return new Response(JSON.stringify(playlists), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})