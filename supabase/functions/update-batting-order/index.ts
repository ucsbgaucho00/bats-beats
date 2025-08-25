// supabase/functions/update-batting-order/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'apikey, content-type, authorization, x-client-info',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // --- UPDATED: Expect two arrays now ---
    const { activePlayers, inactivePlayers } = await req.json()
    if (!activePlayers || !inactivePlayers) {
      throw new Error('Invalid player data provided. Both active and inactive lists are required.')
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SB_SERVICE_ROLE_KEY')!,
      { db: { schema: 'public' } }
    )

    // Create a single array to hold all database update promises
    const updatePromises = [];

    // Process active players
    activePlayers.forEach((player, index) => {
      const promise = supabaseAdmin
        .from('players')
        .update({ 
          batting_order: index, // The new order is its position in the array
          is_active: true       // Mark as active
        })
        .eq('id', player.id);
      updatePromises.push(promise);
    });

    // Process inactive players
    inactivePlayers.forEach((player, index) => {
      const promise = supabaseAdmin
        .from('players')
        .update({ 
          batting_order: 1000 + index, // Give a high batting order to keep them separate
          is_active: false            // Mark as inactive
        })
        .eq('id', player.id);
      updatePromises.push(promise);
    });

    // Execute all updates concurrently for efficiency
    const results = await Promise.all(updatePromises);

    // Check if any of the updates failed
    const firstError = results.find(res => res.error);
    if (firstError) {
      // If an error occurred, throw it to be caught by the catch block
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