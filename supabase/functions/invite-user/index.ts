// supabase/functions/invite-user/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = { /* ... */ }

serve(async (req) => {
  if (req.method === 'OPTIONS') { return new Response('ok', { headers: corsHeaders }) }

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
    const authHeader = req.headers.get('Authorization')!;
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user: adminUser } } = await supabaseAdmin.auth.getUser(jwt);
    const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', adminUser!.id).single()
    if (profile?.role !== 'admin') throw new Error('Permission denied.')

    // Invite the new user. This creates an auth entry and sends the "Set Password" email.
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { first_name: firstName, last_name: lastName }
    })
    if (inviteError) throw inviteError

    // The trigger will create their profile. Now, update the new profile with the selected license.
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ license: license })
      .eq('id', inviteData.user.id)
    if (updateError) throw updateError

    return new Response(JSON.stringify({ success: true, user: inviteData.user }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})