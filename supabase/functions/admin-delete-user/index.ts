// supabase/functions/admin-delete-user/index.ts

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
    // 1. Get the User ID to delete from the request body
    const { userId } = await req.json()
    if (!userId) {
      throw new Error('User ID is required for deletion.')
    }

    // 2. Create an admin client to perform privileged operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SB_SERVICE_ROLE_KEY')!,
      { db: { schema: 'public' } }
    )

    // 3. Verify that the person making the request is an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error("Missing auth header.")
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user: adminUser } } = await supabaseAdmin.auth.getUser(jwt);
    if (!adminUser) throw new Error("Could not verify admin user.")
    
    const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', adminUser.id).single()
    if (profile?.role !== 'admin') {
      throw new Error('Permission denied. Must be an admin to delete users.')
    }

    // 4. Perform the secure, compliant deletion
    // This function removes the user from `auth.users`, and our `ON DELETE CASCADE`
    // setting in the `profiles` table will automatically delete their profile.
    // The cascade will continue to `teams` and `players`.
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (error) {
      throw error
    }

    return new Response(JSON.stringify({ success: true, message: `User ${userId} deleted successfully.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})