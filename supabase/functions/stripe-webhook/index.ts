// supabase/functions/stripe-webhook/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@11.1.0?target=deno'

const SINGLE_PRICE_ID = 'price_1RlcrbIjwUvbU06TzNxDJYkJ'
const HOME_RUN_PRICE_ID = 'price_1RlcroIjwUvbU06TJIpGIBlT'
const UPGRADE_PRICE_ID = 'price_1RlcrbIjwUvbU06TUPGRADEPRICEID'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2022-11-15', httpClient: Stripe.createFetchHttpClient() })
const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SB_SERVICE_ROLE_KEY')!)

serve(async (req) => {
  try {
    const signature = req.headers.get('Stripe-Signature')!
    const body = await req.text()
    const receivedEvent = await stripe.webhooks.constructEventAsync(body, signature, Deno.env.get('STRIPE_WEBHOOK_SECRET')!)
    if (receivedEvent.type === 'checkout.session.completed') {
      const session = receivedEvent.data.object
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id)
      const priceId = lineItems.data[0].price!.id
      const customer = await stripe.customers.retrieve(session.customer as string)
      const { supabase_user_id } = (customer as any).metadata
      if (!supabase_user_id) throw new Error("Missing supabase_user_id in customer metadata")
      let newLicenseType = ''
      if (priceId === SINGLE_PRICE_ID) newLicenseType = 'Single'
      else if (priceId === HOME_RUN_PRICE_ID || priceId === UPGRADE_PRICE_ID) newLicenseType = 'Home Run'
      if (newLicenseType) {
        const { error } = await supabaseAdmin.from('profiles').update({ license: newLicenseType }).eq('id', supabase_user_id)
        if (error) throw error
      }
    }
    return new Response(JSON.stringify({ received: true }), { status: 200 })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 })
  }
})