// supabase/functions/update-batting-order/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // We expect an array of player IDs in the new order
    const { orderedPlayerIds } = await req.json()
    if (!orderedPlayerIds || !Array.isArray(orderedPlayerIds)) {
      throw new Error('Invalid player data provided.')
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SB_SERVICE_ROLE_KEY')!,
      { db: { schema: 'public' } }
    )

    // Create an array of all the update promises
    const updatePromises = orderedPlayerIds.map((playerId, index) => {
      return supabaseAdmin
        .from('players')
        .update({ batting_order: index }) // The new order is the array index
        .eq('id', playerId);
    });

    // Execute all updates
    const results = await Promise.all(updatePromises);
    const firstError = results.find(res => res.error);
    if (firstError) throw new Error(firstError.error.message);

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