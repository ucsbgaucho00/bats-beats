// supabase/functions/get-public-team-data/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'apikey, content-type, authorization, x-client-info' }

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const { shareId } = await req.json()
  if (!shareId) throw new Error('Missing shareId')

  const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SB_SERVICE_ROLE_KEY')!)
  const { data: team } = await supabaseAdmin.from('teams').select('id, team_name, user_id').eq('public_share_id', shareId).single()
  if (!team) throw new Error('Team not found.')

  const { data: players } = await supabaseAdmin.from('players').select('id, player_number, first_name, last_name, song_uri, song_start_time').eq('team_id', team.id).eq('is_active', true).order('batting_order')
  
  const publicData = { teamName: team.team_name, players, ownerUserId: team.user_id }
  
  return new Response(JSON.stringify(publicData), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})