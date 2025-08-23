// supabase/functions/update-player-order/index.ts

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
    // We expect an object with two arrays: activePlayers and inactivePlayers
    const { activePlayers, inactivePlayers } = await req.json()
    if (!activePlayers || !inactivePlayers) throw new Error('Invalid player data provided.')

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SB_SERVICE_ROLE_KEY')!,
      { db: { schema: 'public' } }
    )

    // Create an array of all the update promises
    const updatePromises = [];

    // Process active players
    activePlayers.forEach((player, index) => {
      const promise = supabaseAdmin
        .from('players')
        .update({ 
          batting_order: index, // The new order is its position in the array
          is_active: true 
        })
        .eq('id', player.id);
      updatePromises.push(promise);
    });

    // Process inactive players
    inactivePlayers.forEach((player, index) => {
      const promise = supabaseAdmin
        .from('players')
        .update({ 
          // We can give them a high batting order number or just null
          batting_order: 1000 + index, 
          is_active: false 
        })
        .eq('id', player.id);
      updatePromises.push(promise);
    });

    // Execute all the updates concurrently
    const results = await Promise.all(updatePromises);

    // Check for any errors during the updates
    const firstError = results.find(res => res.error);
    if (firstError) {
      throw new Error(firstError.error.message);
    }

    return new Response(JSON.stringify({ success: true, message: 'Lineup updated successfully.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})