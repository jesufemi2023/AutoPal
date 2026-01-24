
// Fix: Added Deno declaration to satisfy TypeScript linter in non-Deno environments
declare const Deno: any;

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PAYSTACK_SECRET = Deno.env.get('PAYSTACK_SECRET_KEY') || ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  // 1. Bulletproof Preflight Handler
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      status: 200,
      headers: corsHeaders 
    })
  }

  try {
    // 2. Body Parsing with validation
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const { reference } = body;
    console.log(`Neural Input: Verifying reference [${reference}]`);
    
    if (!reference) {
      return new Response(JSON.stringify({ error: 'Missing reference' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    if (!PAYSTACK_SECRET) {
      console.error("CRITICAL: PAYSTACK_SECRET_KEY missing from environment.");
      return new Response(JSON.stringify({ error: 'Cloud Config Error: Missing Secret Key' }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // 3. Verify with Paystack Private API
    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        'Content-Type': 'application/json',
      },
    })
    
    const paystackData = await verifyRes.json()
    console.log(`Paystack status for [${reference}]:`, paystackData.data?.status || 'No data');

    const status = paystackData.data?.status || 'unknown';

    if (status !== 'success') {
      return new Response(JSON.stringify({ status: status }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // 4. Secure Database Escalation
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    const { data: existing } = await supabase
      .from('payments')
      .select('status')
      .eq('reference', reference)
      .maybeSingle()

    if (existing?.status !== 'success') {
      console.log(`Settlement Confirmed. Upgrading protocol for ref [${reference}]...`);
      const { error: updateError } = await supabase
        .from('payments')
        .update({ status: 'success' })
        .eq('reference', reference)

      if (updateError) {
        console.error("Database provisioning failure:", updateError);
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
