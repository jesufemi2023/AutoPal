
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

  const url = new URL(req.url)
  let rawBody = "";
  
  try {
    const PAYSTACK_SECRET = Deno.env.get('PAYSTACK_SECRET_KEY')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!PAYSTACK_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Server configuration variables are missing.")
    }

    // Capture Body for inspection
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      rawBody = await req.text().catch(() => "");
    }

    // 2. LOG EVERYTHING (Exhaustive Debugging)
    console.log(`[DEBUG] ID: ${crypto.randomUUID()}`);
    console.log(`[DEBUG] Request: ${req.method} ${url.pathname}${url.search}`);
    console.log(`[DEBUG] Content-Type: ${req.headers.get('content-type')}`);
    console.log(`[DEBUG] Raw Body Content: ${rawBody || "[EMPTY]"}`);

    // 3. AGGRESSIVE REFERENCE EXTRACTION
    // Priority 1: URL Parameters
    let reference = url.searchParams.get('reference') || url.searchParams.get('trxref') || url.searchParams.get('ref');
    
    // Priority 2: Body Parsing
    if (!reference && rawBody) {
      try {
        const json = JSON.parse(rawBody);
        // Look for standard keys
        reference = json.reference || json.trxref || json.ref;
        
        // Deep search: If keys don't match, look for any value that looks like an AP reference
        if (!reference && typeof json === 'object') {
          const found = Object.values(json).find(v => typeof v === 'string' && v.startsWith('AP-'));
          if (found) reference = found as string;
        }
      } catch (e) {
        // Fallback: If not JSON, check if the raw body itself IS the reference
        if (rawBody.startsWith('AP-')) {
          reference = rawBody;
        }
      }
    }

    // Final scrub
    if (reference) reference = reference.trim();

    // Final Validation
    if (!reference || reference === 'undefined' || reference === 'null' || reference === '') {
      console.error("[SECURITY] Identification Failure: No transaction reference found in URL or Body.");
      return new Response(
        JSON.stringify({ 
          error: 'Transaction reference missing.',
          received_body: rawBody.substring(0, 100),
          method: req.method
        }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[SYNC] Commencing verification for: ${reference}`);

    // 4. Contact Paystack API
    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        'Content-Type': 'application/json',
      },
    })
    
    if (!verifyRes.ok) {
      const errTxt = await verifyRes.text();
      console.error(`[GATEWAY] Paystack API Error: ${verifyRes.status} - ${errTxt}`);
      return new Response(
        JSON.stringify({ error: 'Gateway verification failed.', details: errTxt }), 
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const paystackData = await verifyRes.json()
    const status = paystackData.data?.status || 'unknown'

    if (status !== 'success') {
      console.log(`[GATEWAY] Transaction marked as: ${status}`);
      return new Response(
        JSON.stringify({ status, reference }), 
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5. Database State Management
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    const { data: existing } = await supabase
      .from('payments')
      .select('status')
      .eq('reference', reference)
      .maybeSingle()

    if (existing?.status !== 'success') {
      console.log(`[DATABASE] Authorized: ${reference}. Updating User Tier...`);
      const { error: updateError } = await supabase
        .from('payments')
        .update({ status: 'success' })
        .eq('reference', reference)

      if (updateError) throw updateError
    } else {
      console.log(`[DATABASE] Reference ${reference} already processed.`);
    }

    return new Response(
      JSON.stringify({ status: 'success', reference }), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    console.error("[RUNTIME] Crash:", err.message);
    return new Response(
      JSON.stringify({ error: err.message || 'Server Fault' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
