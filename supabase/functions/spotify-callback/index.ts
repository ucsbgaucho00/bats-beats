// supabase/functions/spotify-callback/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')

  const appUrl = Deno.env.get('APP_URL')!
  if (!code || !state) {
    return Response.redirect(`${appUrl}/dashboard?error=Code or state missing`, 302)
  }

  // --- THIS IS THE CRITICAL FIX ---
  // Create a correctly configured ADMIN client that knows which schema to use
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SB_SERVICE_ROLE_KEY')!,
    {
      db: { schema: 'bats_and_beats' },
    }
  )

  try {
    // 1. Look up the state token to find the user ID
    const { data: stateData, error: stateError } = await supabaseAdmin
      .from('oauth_state_storage') // Now it can find this table
      .select('user_id')
      .eq('state_token', state)
      .single()
    if (stateError) throw new Error('Invalid or expired state token.')
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
    if (!response.ok) throw new Error(await response.text())
    const tokens = await response.json()

    // 4. Save tokens to the correct user's profile
    const { error: updateError } = await supabaseAdmin
      .from('profiles') // Now it can find this table
      .update({
        spotify_access_token: tokens.access_token,
        spotify_refresh_token: tokens.refresh_token,
      })
      .eq('id', userId)
    if (updateError) throw updateError

    // 5. Redirect to the dashboard on success
    return Response.redirect(`${appUrl}/dashboard?success=true`, 302)
  } catch (error) {
    console.error('Callback Error:', error.message)
    return Response.redirect(`${appUrl}/dashboard?error=${encodeURIComponent(error.message)}`, 302)
  }
})