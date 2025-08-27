// supabase/functions/admin-send-password-reset/index.ts

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
    const { email } = await req.json()
    if (!email) throw new Error('Email is required.')

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SB_SERVICE_ROLE_KEY')!,
      { db: { schema: 'public' } }
    )

    // ... (Admin verification logic is the same)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error("Missing auth header.")
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user: adminUser } } = await supabaseAdmin.auth.getUser(jwt);
    if (!adminUser) throw new Error("Could not verify admin user.")
    const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', adminUser.id).single()
    if (profile?.role !== 'admin') throw new Error('Permission denied.')
    
    // --- THIS IS THE CRITICAL FIX ---
    // Use `resetPasswordForEmail` which automatically sends the email
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://play.batsandbeats.com/set-password' // Or a dedicated password reset page
    })
    if (error) throw error
    // --- END OF FIX ---

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