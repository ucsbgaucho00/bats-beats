// supabase/functions/create-stripe-coupon/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@11.1.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2022-11-15',
  httpClient: Stripe.createFetchHttpClient(),
})

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Check if the user is an admin
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SB_SERVICE_ROLE_KEY')!,
      { db: { schema: 'public' } }
    )
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Authorization header.');
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseAdmin.auth.getUser(jwt);
    if (!user) throw new Error('User not authenticated')
    
    const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') throw new Error('You must be an admin to perform this action.')

    // 2. Get the coupon data from the request body
    const { code, discount_type, discount_value } = await req.json()
    if (!code || !discount_type || !discount_value) throw new Error('Missing required coupon data.')

    // 3. Create the coupon in Stripe
    const stripeCouponParams: any = {
      name: code, // Use the code as the name for easy identification
      duration: 'once', // This coupon applies once
    };

    if (discount_type === 'percent') {
      stripeCouponParams.percent_off = discount_value;
    } else if (discount_type === 'fixed_amount') {
      // Stripe expects the amount in cents
      stripeCouponParams.amount_off = discount_value * 100;
      stripeCouponParams.currency = 'usd'; // Or your default currency
    }

    const stripeCoupon = await stripe.coupons.create(stripeCouponParams);

    // 4. Return the new Stripe Coupon ID to the front-end
    return new Response(JSON.stringify({ stripe_coupon_id: stripeCoupon.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})