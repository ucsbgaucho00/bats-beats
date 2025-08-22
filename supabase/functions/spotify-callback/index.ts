// supabase/functions/spotify-callback/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const appUrl = 'https://play.batsandbeats.com'

  if (!code || !state) return Response.redirect(`${appUrl}/dashboard?error=Code or state missing`, 302)

  const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SB_SERVICE_ROLE_KEY')!)
  const { data: stateData, error: stateError } = await supabaseAdmin.from('oauth_state_storage').select('user_id').eq('state_token', state).single()
  if (stateError) return Response.redirect(`${appUrl}/dashboard?error=Invalid state token`, 302)

  await supabaseAdmin.from('oauth_state_storage').delete().eq('state_token', state)

  const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/spotify-callback`
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': 'Basic ' + btoa(`${Deno.env.get('SPOTIFY_CLIENT_ID')!}:${Deno.env.get('SPOTIFY_CLIENT_SECRET')!}`) },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri }),
  })
  if (!response.ok) return Response.redirect(`${appUrl}/dashboard?error=Spotify token exchange failed`, 302)

  const tokens = await response.json()
  await supabaseAdmin.from('profiles').update({ spotify_access_token: tokens.access_token, spotify_refresh_token: tokens.refresh_token }).eq('id', stateData.user_id)
  
  return Response.redirect(`${appUrl}/dashboard?success=true`, 302)
})