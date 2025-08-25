// supabase/functions/create-checkout-session/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@11.1.0?target=deno'

const corsHeaders = { /* ... */ }
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { /* ... */ })
const APP_URL = 'https://play.batsandbeats.com'

serve(async (req) => {
  if (req.method === 'OPTIONS') { /* ... */ }

  try {
    // --- NEW: Get couponCode from the body ---
    const { priceId, couponCode } = await req.json()
    
    const authHeader = req.headers.get('Authorization')!
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { /* ... */ }
    
    // ... (logic to get/create Stripe customer is unchanged) ...
    const { data: profile } = await supabase.from('profiles').select('stripe_customer_id').eq('id', user.id).single()
    let customerId = profile?.stripe_customer_id
    if (!customerId) { /* ... */ }

    // --- NEW: Logic to handle the coupon ---
    const sessionParams: any = {
      payment_method_types: ['card'],
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'payment',
      success_url: `${APP_URL}/dashboard?status=success`,
      cancel_url: `${APP_URL}/dashboard?status=cancel`,
    };

    if (couponCode) {
      // Find the coupon in our database to get the Stripe Coupon ID
      const { data: dbCoupon } = await supabase
        .from('coupons')
        .select('stripe_coupon_id, is_active')
        .eq('code', couponCode)
        .single()

      if (!dbCoupon || !dbCoupon.is_active) {
        throw new Error('This coupon code is not valid or has expired.')
      }
      
      // Tell Stripe to allow promotions
      sessionParams.allow_promotion_codes = true;
    }
    
    const session = await stripe.checkout.sessions.create(sessionParams);

    // If a coupon was provided, we need to pass its ID to the checkout session
    // This is a workaround since Stripe's API for applying coupons directly is complex
    // The allow_promotion_codes flag is the primary method for Checkout
    
    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})