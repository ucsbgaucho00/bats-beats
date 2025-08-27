// supabase/functions/invite-user/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// --- THIS IS THE CRITICAL FIX ---
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // --- THIS HANDLES THE PREFLIGHT REQUEST ---
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Inside serve(async (req) => { ... })

  try {
    const { email, firstName, lastName, license } = await req.json()
    if (!email || !firstName || !lastName || !license) {
      throw new Error('Missing required fields.')
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SB_SERVICE_ROLE_KEY')!,
      { db: { schema: 'public' } }
    )

    // Verify the caller is an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error("Missing auth header.")
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user: adminUser } } = await supabaseAdmin.auth.getUser(jwt);
    if (!adminUser) throw new Error("Could not verify admin user.")
    
    const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', adminUser.id).single()
    if (profile?.role !== 'admin') throw new Error('Permission denied. Must be an admin.')

    // --- THIS IS THE CORRECTED INVITE CALL ---
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email, 
      {
        data: { first_name: firstName, last_name: lastName },
        redirectTo: 'https://play.batsandbeats.com/set-password'
      }
    )
    if (inviteError) throw inviteError
    // --- END OF CORRECTION ---

    // The rest of the logic must remain
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ license: license })
      .eq('id', inviteData.user.id)
    if (updateError) throw updateError

    const { data: newUserProfile } = await supabaseAdmin.from('profiles').select('*').eq('id', inviteData.user.id).single()

    return new Response(JSON.stringify({ success: true, user: newUserProfile }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})