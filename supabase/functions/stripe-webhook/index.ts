// supabase/functions/stripe-webhook/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@11.1.0?target=deno'

// These are the Price IDs from your Stripe dashboard.
// IMPORTANT: Replace these with your actual LIVE Price IDs.
const SINGLE_LICENSE_PRICE_ID = 'price_1RlcrbIjwUvbU06TzNxDJYkJ'
const HOME_RUN_LICENSE_PRICE_ID = 'price_1RlcroIjwUvbU06TJIpGIBlT'
const UPGRADE_LICENSE_PRICE_ID = 'price_1Rlcs1IjwUvbU06TYbI5rmp8'

// Initialize Stripe
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2022-11-15',
  httpClient: Stripe.createFetchHttpClient(),
})

// Initialize the Supabase client with the SERVICE_ROLE_KEY
// This allows us to bypass RLS to update user profiles.
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SB_SERVICE_ROLE_KEY') ?? ''
)

serve(async (req) => {
  const signature = req.headers.get('Stripe-Signature')
  const body = await req.text()

  let receivedEvent
  try {
    receivedEvent = await stripe.webhooks.constructEventAsync(
      body,
      signature!,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!
    )
  } catch (err) {
    console.error('Webhook signature verification failed.', err.message)
    return new Response(err.message, { status: 400 })
  }

  // Handle the checkout.session.completed event
  if (receivedEvent.type === 'checkout.session.completed') {
    const session = receivedEvent.data.object
    const customerId = session.customer
    
    // Retrieve the full line items to get the price ID
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
    const priceId = lineItems.data[0].price.id;

    // Get the user's Supabase ID from the customer metadata
    const customer = await stripe.customers.retrieve(customerId as string)
    const { supabase_user_id } = (customer as any).metadata

    if (!supabase_user_id) {
      console.error('No supabase_user_id found in customer metadata.')
      return new Response('Internal Server Error', { status: 500 })
    }

    let newLicenseType = ''
    if (priceId === SINGLE_LICENSE_PRICE_ID) {
      newLicenseType = 'Single'
    } else if (priceId === HOME_RUN_LICENSE_PRICE_ID || priceId === UPGRADE_LICENSE_PRICE_ID) {
      newLicenseType = 'Home Run'
    }

    if (newLicenseType) {
      const { error } = await supabaseAdmin
        .from('bats_and_beats.profiles')
        .update({ license: newLicenseType })
        .eq('id', supabase_user_id)

      if (error) {
        console.error('Failed to update user profile:', error.message)
        return new Response('Internal Server Error', { status: 500 })
      }
    }
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 })
})