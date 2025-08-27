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
    const { userId } = await req.json()
    if (!userId) throw new Error('User ID is required.')

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SB_SERVICE_ROLE_KEY')!,
      { db: { schema: 'public' } }
    )

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error("Missing auth header.")
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user: adminUser } } = await supabaseAdmin.auth.getUser(jwt);
    if (!adminUser) throw new Error("Could not verify admin user.")
    const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', adminUser.id).single()
    if (profile?.role !== 'admin') throw new Error('Permission denied.')

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (error) throw error

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})