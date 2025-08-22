// supabase/functions/spotify-callback/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const appUrl = 'https://play.batsandbeats.com'

  // Immediately handle missing parameters
  if (!code || !state) {
    return Response.redirect(`${appUrl}/dashboard?error=Authorization code or state was missing.`, 302)
  }

  try {
    // --- THIS IS THE CRITICAL FIX ---
    // Create a correctly configured admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SB_SERVICE_ROLE_KEY')!,
      { db: { schema: 'public' } }
    )

    // 1. Look up the state token to find the user ID
    const { data: stateData, error: stateError } = await supabaseAdmin
      .from('oauth_state_storage')
      .select('user_id')
      .eq('state_token', state)
      .single()
    if (stateError) {
      console.error('State token lookup failed:', stateError)
      throw new Error('Invalid or expired state token. Please try connecting again.')
    }
    const userId = stateData.user_id

    // 2. Clean up the used state token
    await supabaseAdmin.from('oauth_state_storage').delete().eq('state_token', state)

    // 3. Exchange the code for Spotify tokens
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/spotify-callback`
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(`${Deno.env.get('SPOTIFY_CLIENT_ID')!}:${Deno.env.get('SPOTIFY_CLIENT_SECRET')!}`),
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
      }),
    })
    if (!response.ok) {
      const errorBody = await response.text()
      console.error('Spotify token exchange failed:', errorBody)
      throw new Error('Could not get tokens from Spotify.')
    }
    const tokens = await response.json()

    // 4. Save tokens to the correct user's profile
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        spotify_access_token: tokens.access_token,
        spotify_refresh_token: tokens.refresh_token,
      })
      .eq('id', userId)
    if (updateError) {
      console.error('Failed to save tokens to profile:', updateError)
      throw new Error('Could not save Spotify tokens to your profile.')
    }

    // 5. Redirect to the dashboard on success
    return Response.redirect(`${appUrl}/dashboard?success=spotify_connected`, 302)
  } catch (error) {
    console.error('CRASH in spotify-callback:', error.message)
    // Redirect back to the app with a generic error
    return Response.redirect(`${appUrl}/dashboard?error=${encodeURIComponent(error.message)}`, 302)
  }
})