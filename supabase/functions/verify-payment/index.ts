
// Fix: Added Deno declaration to satisfy TypeScript linter
declare const Deno: any;

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PAYSTACK_SECRET = Deno.env.get('PAYSTACK_SECRET_KEY') || ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { reference } = await req.json()
    console.log(`Neural Input: Verifying reference [${reference}]`);
    
    if (!reference) {
      return new Response(JSON.stringify({ error: 'Missing reference' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (!PAYSTACK_SECRET) {
      console.error("CRITICAL: PAYSTACK_SECRET_KEY is not set in Supabase Secrets.");
      return new Response(JSON.stringify({ error: 'Cloud Configuration Error: Missing Secret Key' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 1. Verify with Paystack
    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        'Content-Type': 'application/json',
      },
    })
    
    const paystackData = await verifyRes.json()
    console.log(`Paystack Response for [${reference}]:`, paystackData.data?.status || 'No status');

    const status = paystackData.data?.status || 'unknown';

    if (status !== 'success') {
      return new Response(JSON.stringify({ status: status }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 2. Update Database via Service Role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    // Check if already processed
    const { data: existing } = await supabase
      .from('payments')
      .select('status')
      .eq('reference', reference)
      .maybeSingle()

    if (existing?.status !== 'success') {
      console.log(`Success confirmed. Provisioning tier for ref [${reference}]...`);
      const { error: updateError } = await supabase
        .from('payments')
        .update({ status: 'success' })
        .eq('reference', reference)

      if (updateError) {
        console.error("Database provisioning error:", updateError);
        throw updateError;
      }
    }

    return new Response(JSON.stringify({ status: 'success' }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })

  } catch (err) {
    console.error("Verification Engine Fault:", err.message);
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }
})
