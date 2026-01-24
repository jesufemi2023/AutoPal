
// Fix: Added Deno declaration to satisfy TypeScript linter in non-Deno environments
declare const Deno: any;

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PAYSTACK_SECRET = Deno.env.get('PAYSTACK_SECRET_KEY') || ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
}

Deno.serve(async (req) => {
  // 1. Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders })
  }

  try {
    let reference = '';

    // 2. Multimodal Extraction (Body or Query Params)
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        reference = body.reference;
      } catch (e) {
        // Fallback: If body parsing fails, check if the raw body is just the reference string
        const raw = await req.text();
        if (raw && raw.startsWith('AP-')) reference = raw;
      }
    }

    // Secondary fallback: Query Params
    if (!reference) {
      const url = new URL(req.url);
      reference = url.searchParams.get('reference') || '';
    }

    console.log(`Cloud Logic: Verifying Reference [${reference}]`);
    
    if (!reference || reference === 'undefined' || reference === 'null') {
      return new Response(JSON.stringify({ error: 'Missing or invalid reference identifier' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    if (!PAYSTACK_SECRET) {
      console.error("CRITICAL: PAYSTACK_SECRET_KEY missing.");
      return new Response(JSON.stringify({ error: 'Cloud Configuration Error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 3. Official Verification
    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        'Content-Type': 'application/json',
      },
    })
    
    const paystackData = await verifyRes.json()
    const status = paystackData.data?.status || 'unknown';
    console.log(`Paystack verification for [${reference}]: ${status}`);

    if (status !== 'success') {
      return new Response(JSON.stringify({ status: status }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // 4. Secure Escalation
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    const { data: existing } = await supabase
      .from('payments')
      .select('status')
      .eq('reference', reference)
      .maybeSingle()

    if (existing?.status !== 'success') {
      console.log(`Verified. Upgrading identity for [${reference}]...`);
      const { error: updateError } = await supabase
        .from('payments')
        .update({ status: 'success' })
        .eq('reference', reference)

      if (updateError) {
        console.error("DB Trigger Error:", updateError);
        throw updateError;
      }
    }

    return new Response(JSON.stringify({ status: 'success' }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })

  } catch (err) {
    console.error("System Fault:", err.message);
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }
})
