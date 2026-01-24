
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
  // 1. CRITICAL: Handle Preflight IMMEDIATELY
  // This must be the very first thing the function does.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      status: 200, 
      headers: corsHeaders 
    })
  }

  try {
    // 2. Extract Configuration
    const PAYSTACK_SECRET = Deno.env.get('PAYSTACK_SECRET_KEY')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!PAYSTACK_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Server configuration variables are missing.")
    }

    // 3. Extract Reference (Query string or Body)
    const url = new URL(req.url)
    let reference = url.searchParams.get('reference')

    if (!reference && req.method === 'POST') {
      try {
        const body = await req.json()
        reference = body.reference
      } catch (e) {
        // Fallback for non-JSON or empty bodies
      }
    }

    if (!reference || reference === 'undefined' || reference === 'null') {
      console.error("Verification Request Fault: No reference found.");
      return new Response(
        JSON.stringify({ error: 'Transaction reference is required.' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Syncing: Verifying Paystack transaction [${reference}]...`);

    // 4. Contact Paystack API
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
      console.log(`Paystack reported status: ${status}`);
      return new Response(
        JSON.stringify({ status }), 
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5. Securely Update Database (Service Role bypasses RLS)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    // Check current status to avoid redundant triggers
    const { data: existing } = await supabase
      .from('payments')
      .select('status')
      .eq('reference', reference)
      .maybeSingle()

    if (existing?.status !== 'success') {
      console.log(`Finalizing: Transaction ${reference} authorized. Updating records...`);
      const { error: updateError } = await supabase
        .from('payments')
        .update({ status: 'success' })
        .eq('reference', reference)

      if (updateError) throw updateError
    }

    return new Response(
      JSON.stringify({ status: 'success' }), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    console.error("Runtime Exception:", err.message);
    return new Response(
      JSON.stringify({ error: err.message || 'Internal Server Error' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
