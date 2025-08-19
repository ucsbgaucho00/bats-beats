// supabase/functions/create-checkout-session/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@11.1.0?target=deno'

// Get the Stripe secret key from the environment variables
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2022-11-15',
  httpClient: Stripe.createFetchHttpClient(),
})

// This is the URL of your deployed web app.
// For development, we can set a variable, but for production,
// you'll want to set this in your deployment environment.
const APP_URL = Deno.env.get('APP_URL') || 'http://localhost:5173'

serve(async (req) => {
  // 1. Get data from the request and validate the user
  const { priceId } = await req.json()
  const authHeader = req.headers.get('Authorization')!
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  )
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
  }

  // 2. Get the user's Stripe Customer ID from their profile, or create one
  const { data: profile } = await supabase
    .from('bats_and_beats.profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single()
  
  let customerId = profile?.stripe_customer_id

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { supabase_user_id: user.id },
    })
    await supabase
      .from('bats_and_beats.profiles')
      .update({ stripe_customer_id: customer.id })
      .eq('id', user.id)
    customerId = customer.id
  }

  // 3. Create a Stripe Checkout Session
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'payment',
      success_url: `${APP_URL}/dashboard?status=success`, // Redirect here on success
      cancel_url: `${APP_URL}/dashboard?status=cancel`,   // Redirect here on cancellation
    })

    return new Response(JSON.stringify({ sessionId: session.id, url: session.url }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Stripe Error:', error.message)
    return new Response(JSON.stringify({ error: 'Failed to create checkout session.' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})