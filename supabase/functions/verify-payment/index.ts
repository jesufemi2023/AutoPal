
// Fix: Added Deno declaration to satisfy TypeScript linter
declare const Deno: any;

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

// Standard CORS headers for Supabase Edge Functions
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

Deno.serve(async (req: Request) => {
  // 1. Handle Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders })
  }

  try {
    const PAYSTACK_SECRET = Deno.env.get('PAYSTACK_SECRET_KEY')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!PAYSTACK_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Server configuration variables are missing.")
    }

    // 2. Extract Reference with Fallbacks
    const url = new URL(req.url)
    let reference = url.searchParams.get('reference')
    
    console.log(`Processing: ${req.method} request to ${url.pathname}`);

    if (!reference && (req.method === 'POST' || req.method === 'PUT')) {
      try {
        const clonedReq = req.clone(); // Clone to prevent stream locking
        const body = await clonedReq.json();
        reference = body.reference || body.trxref;
        console.log(`Found reference in body: ${reference}`);
      } catch (e) {
        console.warn("Could not parse JSON body, proceeding with query search.");
      }
    }

    // Final validation of reference
    if (!reference || reference === 'undefined' || reference === 'null' || reference === '') {
      console.error("Security Fault: No valid transaction reference detected in Request.");
      return new Response(
        JSON.stringify({ error: 'Transaction reference is missing from the payload.' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Syncing: Verifying Paystack transaction [${reference}]...`);

    // 3. Contact Paystack API
    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        'Content-Type': 'application/json',
      },
    })
    
    if (!verifyRes.ok) {
      console.error(`Paystack API unreachable: Status ${verifyRes.status}`);
      return new Response(
        JSON.stringify({ error: 'Payment gateway connection failed.' }), 
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const paystackData = await verifyRes.json()
    const status = paystackData.data?.status || 'unknown'

    if (status !== 'success') {
      console.log(`Paystack reported non-success status: ${status}`);
      return new Response(
        JSON.stringify({ status, reference }), 
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Securely Update Database (Service Role bypasses RLS)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    const { data: existing } = await supabase
      .from('payments')
      .select('status')
      .eq('reference', reference)
      .maybeSingle()

    if (existing?.status !== 'success') {
      console.log(`Finalizing: Transaction ${reference} authorized. Syncing identity records...`);
      const { error: updateError } = await supabase
        .from('payments')
        .update({ status: 'success' })
        .eq('reference', reference)

      if (updateError) throw updateError
    }

    return new Response(
      JSON.stringify({ status: 'success', reference }), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    console.error("Edge Runtime Crash:", err.message);
    return new Response(
      JSON.stringify({ error: err.message || 'Internal Server Error' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
