// supabase/functions/create-checkout-session/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@11.1.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2022-11-15', httpClient: Stripe.createFetchHttpClient() })
const APP_URL = 'https://play.batsandbeats.com'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { priceId, couponCode } = await req.json()
    const authHeader = req.headers.get('Authorization')!
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data: profile } = await supabase.from('profiles').select('stripe_customer_id').eq('id', user.id).single()
    let customerId = profile?.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email, metadata: { supabase_user_id: user.id } })
      await supabase.from('profiles').update({ stripe_customer_id: customer.id }).eq('id', user.id)
      customerId = customer.id
    }

    const sessionParams: any = {
      payment_method_types: ['card'],
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'payment',
      success_url: `${APP_URL}/dashboard?status=success`,
      cancel_url: APP_URL, // Go back to the landing page on cancel
    };

    // --- NEW: Validate coupon and apply it ---
    if (couponCode) {
      const { data: dbCoupon } = await supabase
        .from('coupons')
        .select('stripe_coupon_id, is_active')
        .eq('code', couponCode)
        .single()

      if (!dbCoupon || !dbCoupon.is_active) {
        throw new Error('This coupon code is not valid or has expired.')
      }
      
      sessionParams.discounts = [{ coupon: dbCoupon.stripe_coupon_id }];
    }
    
    const session = await stripe.checkout.sessions.create(sessionParams);
    
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