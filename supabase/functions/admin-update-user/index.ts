// supabase/functions/admin-update-user/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = { /* ... */ }

serve(async (req) => {
  if (req.method === 'OPTIONS') { return new Response('ok', { headers: corsHeaders }) }

  try {
    const { userId, updates } = await req.json()
    if (!userId || !updates) throw new Error('User ID and updates are required.')

    const supabaseAdmin = createClient( /* ... admin client setup ... */ )
    // Verify the caller is an admin
    // ... (admin verification logic as in other functions) ...

    // Separate updates for different tables
    const profileUpdates = {
      first_name: updates.first_name,
      last_name: updates.last_name,
      license: updates.license,
      role: updates.role,
    }
    
    const authUpdates: any = {}
    if (updates.email) {
      authUpdates.email = updates.email
    }

    // Update the auth table (e.g., for email changes)
    if (Object.keys(authUpdates).length > 0) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, authUpdates)
      if (authError) throw authError
    }

    // Update the profiles table
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update(profileUpdates)
      .eq('id', userId)
    if (profileError) throw profileError

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})